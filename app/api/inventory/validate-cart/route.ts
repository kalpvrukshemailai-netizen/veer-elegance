/**
 * VEER ELEGANCE — POST /api/inventory/validate-cart
 *
 * Server-side cart stock validation. Called by CartDrawer before checkout.
 *
 * Request:  { items: { productId: string; quantity: number }[] }
 * Response: { isValid: boolean; items: CartValidationResult[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@/lib/supabase/server";

interface CartValidationItem  { productId: string; quantity: number; }
interface ValidationRequest   { items: CartValidationItem[]; }

function isValidRequest(body: unknown): body is ValidationRequest {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.items)) return false;
  return b.items.every(
    (i: unknown) => i && typeof i === "object" &&
      typeof (i as Record<string, unknown>).productId === "string" &&
      typeof (i as Record<string, unknown>).quantity  === "number",
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json() as unknown; } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!isValidRequest(body)) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const { items } = body;
  if (items.length === 0) return NextResponse.json({ isValid: true, items: [] });

  const supabase = await createClient();

  // Fetch products by slug
  const slugs = items.map(i => i.productId);
  const { data: products } = await supabase
    .from("products")
    .select("id, slug, name, published, archived")
    .in("slug", slugs)
    .eq("published", true)
    .eq("archived", false);

  type DbProd = { id: string; slug: string; name: string | null; };
  const productMap = new Map<string, DbProd>(
    (products ?? []).map(p => [(p as DbProd).slug, p as DbProd])
  );

  // Batch-fetch inventory for those product UUIDs
  const productIds = [...productMap.values()].map(p => p.id);
  const { data: invRows } = productIds.length > 0
    ? await supabase
        .from("inventory")
        .select("product_id, stock_quantity")
        .in("product_id", productIds)
    : { data: [] as { product_id: string; stock_quantity: number }[] };

  type InvRow = { product_id: string; stock_quantity: number };
  const invMap = new Map<string, number>(
    (invRows ?? []).map(r => [(r as InvRow).product_id, (r as InvRow).stock_quantity])
  );

  // Evaluate
  const results = items.map(item => {
    const product      = productMap.get(item.productId);
    if (!product) {
      return { productId: item.productId, available: false, stockQuantity: 0,
               requestedQty: item.quantity, quantityOk: false, productName: null,
               error: "Product is no longer available." };
    }
    const stockQuantity = invMap.get(product.id) ?? 0;
    const available     = stockQuantity > 0;
    const quantityOk    = item.quantity <= stockQuantity;
    const error = !available
      ? `${product.name ?? item.productId} is currently out of stock.`
      : !quantityOk
        ? `Only ${stockQuantity} of "${product.name ?? item.productId}" available.`
        : undefined;
    return { productId: item.productId, available, stockQuantity,
             requestedQty: item.quantity, quantityOk, productName: product.name, error };
  });

  return NextResponse.json({ isValid: results.every(r => r.available && r.quantityOk), items: results });
}
