/**
 * VEER ELEGANCE — POST /api/wishlist/products
 *
 * Resolves full storefront Product objects with live inventory and pricing
 * for an array of wishlist slugs.
 */

import { NextRequest, NextResponse } from "next/server";
import { getStorefrontProductsBySlugs } from "@/lib/storefront";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, products: [] }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, products: [] }, { status: 400 });
  }

  const { slugs } = body as { slugs?: unknown };
  if (!Array.isArray(slugs)) {
    return NextResponse.json({ success: false, products: [] }, { status: 400 });
  }

  const validSlugs = slugs.filter((s): s is string => typeof s === "string" && s.trim() !== "");
  const products = await getStorefrontProductsBySlugs(validSlugs);

  return NextResponse.json({ success: true, products });
}
