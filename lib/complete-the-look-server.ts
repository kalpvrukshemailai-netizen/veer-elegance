/**
 * VEER ELEGANCE — Complete the Look Server Operations
 *
 * Database access helpers for managing Complete-the-Look configurations.
 * Enforces server-side validation:
 *   - Total 2–4 products (1 base product + 1–3 matching products)
 *   - No duplicate products inside the look
 *   - Base product cannot be added as a matching product
 *   - Fixed bundle price > 0
 *   - Coupon allowed setting
 */

import { createClient } from "@/lib/supabase/server";
import {
  CompleteTheLookDetail,
  CompleteTheLookProduct,
  UpsertCompleteTheLookInput,
  CartLookRecommendation,
  getCartLookRecommendationMessaging,
  calculateLookPricing,
} from "@/lib/complete-the-look";

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET COMPLETE THE LOOK FOR ADMIN
// ─────────────────────────────────────────────────────────────────────────────

export async function getAdminCompleteTheLook(
  baseProductId: string,
  client?: any
): Promise<CompleteTheLookDetail | null> {
  if (!baseProductId) return null;
  const supabase = client ?? (await createClient());

  // 1. Fetch look set for base product
  const { data: setRow, error: setErr } = await supabase
    .from("complete_the_look_sets")
    .select("id, base_product_id, bundle_price, enabled, coupon_allowed, created_at, updated_at")
    .eq("base_product_id", baseProductId)
    .maybeSingle();

  if (setErr || !setRow) {
    return null;
  }

  // 2. Fetch base product info
  const { data: baseProd, error: baseErr } = await supabase
    .from("products")
    .select("id, slug, name, price, image_url, category, published, archived")
    .eq("id", baseProductId)
    .single();

  if (baseErr || !baseProd) {
    return null;
  }

  // 3. Fetch matching items in set
  const { data: itemRows, error: itemsErr } = await supabase
    .from("complete_the_look_items")
    .select("id, set_id, product_id, display_order, created_at")
    .eq("set_id", setRow.id)
    .order("display_order", { ascending: true });

  if (itemsErr || !itemRows) {
    return null;
  }

  const itemProductIds = itemRows.map((i: any) => i.product_id);
  const matchingProductsMap = new Map<string, any>();

  if (itemProductIds.length > 0) {
    const { data: prods } = await supabase
      .from("products")
      .select("id, slug, name, price, image_url, category, published, archived")
      .in("id", itemProductIds);

    prods?.forEach((p: any) => matchingProductsMap.set(p.id, p));
  }

  // 4. Fetch stock availability for all products in look
  const allIds = [baseProductId, ...itemProductIds];
  const stockMap = new Map<string, boolean>();

  if (allIds.length > 0) {
    const { data: invRows } = await supabase
      .from("inventory")
      .select("product_id, stock_quantity")
      .in("product_id", allIds);

    invRows?.forEach((inv: any) => {
      stockMap.set(inv.product_id, (inv.stock_quantity ?? 0) > 0);
    });
  }

  const baseProduct: CompleteTheLookProduct = {
    id:        baseProd.id,
    slug:      baseProd.slug,
    name:      baseProd.name,
    price:     Number(baseProd.price) || 0,
    imageUrl:  baseProd.image_url,
    category:  baseProd.category,
    published: baseProd.published,
    archived:  baseProd.archived,
    inStock:   stockMap.get(baseProd.id) ?? true,
  };

  const matchingProducts: (CompleteTheLookProduct & { displayOrder: number })[] = [];

  for (const item of itemRows) {
    const p = matchingProductsMap.get(item.product_id);
    if (p) {
      matchingProducts.push({
        id:           p.id,
        slug:         p.slug,
        name:         p.name,
        price:        Number(p.price) || 0,
        imageUrl:     p.image_url,
        category:     p.category,
        published:    p.published,
        archived:     p.archived,
        inStock:      stockMap.get(p.id) ?? true,
        displayOrder: item.display_order,
      });
    } else {
      // Product may have been deleted or missing
      matchingProducts.push({
        id:           item.product_id,
        slug:         "",
        name:         "Unavailable Product",
        price:        0,
        imageUrl:     null,
        category:     "",
        published:    false,
        archived:     true,
        inStock:      false,
        displayOrder: item.display_order,
      });
    }
  }

  const matchingPrices = matchingProducts.map(p => p.price);
  const bundlePrice = Number(setRow.bundle_price);
  const pricing = calculateLookPricing(baseProduct.price, matchingPrices, bundlePrice);

  return {
    id:               setRow.id,
    baseProductId:    setRow.base_product_id,
    enabled:          Boolean(setRow.enabled),
    couponAllowed:    setRow.coupon_allowed !== false,
    createdAt:        setRow.created_at,
    updatedAt:        setRow.updated_at,
    baseProduct,
    matchingProducts,
    allProducts:      [baseProduct, ...matchingProducts],
    ...pricing,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET COMPLETE THE LOOK FOR STOREFRONT (Enabled only)
// ─────────────────────────────────────────────────────────────────────────────

export async function getCompleteTheLookForProduct(
  baseProductId: string,
  client?: any
): Promise<CompleteTheLookDetail | null> {
  const detail = await getAdminCompleteTheLook(baseProductId, client);
  if (!detail || !detail.enabled) return null;
  return detail;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. UPSERT COMPLETE THE LOOK CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export interface UpsertLookResult {
  success: boolean;
  error?:  string;
  set?:    CompleteTheLookDetail;
}

export async function upsertCompleteTheLook(
  input: UpsertCompleteTheLookInput,
  client?: any
): Promise<UpsertLookResult> {
  const {
    baseProductId,
    bundlePrice,
    enabled = false,
    couponAllowed = true,
    itemProductIds = [],
  } = input;

  // 1. Validate baseProductId
  if (!baseProductId || !baseProductId.trim()) {
    return { success: false, error: "Base product ID is required." };
  }

  // 2. Validate matching items count (1 to 3 items, making total 2 to 4 products)
  const totalProducts = 1 + itemProductIds.length;
  if (totalProducts < 2) {
    return { success: false, error: "A Complete the Look set must contain at least 2 products (1 base product + 1 matching item)." };
  }
  if (totalProducts > 4) {
    return { success: false, error: "A Complete the Look set cannot contain more than 4 products (1 base product + up to 3 matching items)." };
  }

  // 3. Check for duplicates in matching items
  const uniqueItemIds = Array.from(new Set(itemProductIds));
  if (uniqueItemIds.length !== itemProductIds.length) {
    return { success: false, error: "Duplicate products are not allowed in the same look." };
  }

  // 4. Ensure base product is not in matching items
  if (uniqueItemIds.includes(baseProductId)) {
    return { success: false, error: "The base product is already included and cannot be added as an additional matching product." };
  }

  // 5. Validate bundlePrice
  const numericBundlePrice = Number(bundlePrice);
  if (isNaN(numericBundlePrice) || numericBundlePrice <= 0) {
    return { success: false, error: "Bundle price must be a positive number." };
  }

  const supabase = client ?? (await createClient());

  // 6. Verify that all product IDs exist
  const allIds = [baseProductId, ...uniqueItemIds];
  const { data: existingProds, error: pErr } = await supabase
    .from("products")
    .select("id, name")
    .in("id", allIds);

  if (pErr || !existingProds || existingProds.length !== allIds.length) {
    return { success: false, error: "One or more selected products do not exist in the database." };
  }

  // 7. Upsert complete_the_look_sets
  const { data: setRecord, error: upsertErr } = await supabase
    .from("complete_the_look_sets")
    .upsert(
      {
        base_product_id: baseProductId,
        bundle_price:    numericBundlePrice,
        enabled:         Boolean(enabled),
        coupon_allowed:  Boolean(couponAllowed),
        updated_at:      new Date().toISOString(),
      },
      { onConflict: "base_product_id" }
    )
    .select("id")
    .single();

  if (upsertErr || !setRecord) {
    console.error("[upsertCompleteTheLook:set]", upsertErr?.message);
    return { success: false, error: "Failed to save Complete the Look set." };
  }

  const setId = setRecord.id;

  // 8. Replace complete_the_look_items
  const { error: delErr } = await supabase
    .from("complete_the_look_items")
    .delete()
    .eq("set_id", setId);

  if (delErr) {
    console.error("[upsertCompleteTheLook:delItems]", delErr.message);
  }

  const itemsToInsert = uniqueItemIds.map((pid, idx) => ({
    set_id:        setId,
    product_id:    pid,
    display_order: idx,
  }));

  const { error: insertErr } = await supabase
    .from("complete_the_look_items")
    .insert(itemsToInsert);

  if (insertErr) {
    console.error("[upsertCompleteTheLook:insertItems]", insertErr.message);
    return { success: false, error: "Failed to save Complete the Look matching items." };
  }

  // 9. Fetch fresh detail to return
  const freshDetail = await getAdminCompleteTheLook(baseProductId, supabase);
  return {
    success: true,
    set: freshDetail || undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET ALL COMPLETE THE LOOKS FOR ADMIN (BATCHED, NO N+1)
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllAdminCompleteTheLooks(
  client?: any
): Promise<CompleteTheLookDetail[]> {
  const supabase = client ?? (await createClient());

  // 1. Fetch all complete_the_look_sets ordered by created_at DESC
  const { data: setRows, error: setsErr } = await supabase
    .from("complete_the_look_sets")
    .select("id, base_product_id, bundle_price, enabled, coupon_allowed, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (setsErr || !setRows || setRows.length === 0) {
    return [];
  }

  const setIds = setRows.map((s: any) => s.id);

  // 2. Fetch all matching items for all these sets in one batch query
  const { data: itemRows, error: itemsErr } = await supabase
    .from("complete_the_look_items")
    .select("id, set_id, product_id, display_order, created_at")
    .in("set_id", setIds)
    .order("display_order", { ascending: true });

  if (itemsErr) {
    console.error("[getAllAdminCompleteTheLooks:items]", itemsErr.message);
    return [];
  }

  // 3. Collect all distinct product IDs (base products + matching products)
  const allProductIdsSet = new Set<string>();
  setRows.forEach((s: any) => {
    if (s.base_product_id) allProductIdsSet.add(s.base_product_id);
  });
  itemRows?.forEach((i: any) => {
    if (i.product_id) allProductIdsSet.add(i.product_id);
  });
  const allProductIds = Array.from(allProductIdsSet);

  if (allProductIds.length === 0) {
    return [];
  }

  // 4. Batch-fetch product details
  const { data: prods, error: prodsErr } = await supabase
    .from("products")
    .select("id, slug, name, price, image_url, category, published, archived")
    .in("id", allProductIds);

  if (prodsErr) {
    console.error("[getAllAdminCompleteTheLooks:products]", prodsErr.message);
    return [];
  }

  const productMap = new Map<string, any>();
  prods?.forEach((p: any) => productMap.set(p.id, p));

  // 5. Batch-fetch inventory for all products
  const stockMap = new Map<string, boolean>();
  const { data: invRows } = await supabase
    .from("inventory")
    .select("product_id, stock_quantity")
    .in("product_id", allProductIds);

  invRows?.forEach((inv: any) => {
    stockMap.set(inv.product_id, (inv.stock_quantity ?? 0) > 0);
  });

  // Group items by set_id
  const itemsBySetId = new Map<string, any[]>();
  itemRows?.forEach((i: any) => {
    const list = itemsBySetId.get(i.set_id) || [];
    list.push(i);
    itemsBySetId.set(i.set_id, list);
  });

  // Assemble CompleteTheLookDetail for each set
  const details: CompleteTheLookDetail[] = [];

  for (const setRow of setRows) {
    const rawBaseProd = productMap.get(setRow.base_product_id);
    if (!rawBaseProd) {
      continue;
    }

    const baseProduct: CompleteTheLookProduct = {
      id:        rawBaseProd.id,
      slug:      rawBaseProd.slug,
      name:      rawBaseProd.name,
      price:     Number(rawBaseProd.price) || 0,
      imageUrl:  rawBaseProd.image_url,
      category:  rawBaseProd.category,
      published: rawBaseProd.published,
      archived:  rawBaseProd.archived,
      inStock:   stockMap.get(rawBaseProd.id) ?? true,
    };

    const setItemRows = itemsBySetId.get(setRow.id) || [];
    const matchingProducts: (CompleteTheLookProduct & { displayOrder: number })[] = [];

    for (const i of setItemRows) {
      const rawItemProd = productMap.get(i.product_id);
      if (rawItemProd) {
        matchingProducts.push({
          id:           rawItemProd.id,
          slug:         rawItemProd.slug,
          name:         rawItemProd.name,
          price:        Number(rawItemProd.price) || 0,
          imageUrl:     rawItemProd.image_url,
          category:     rawItemProd.category,
          published:    rawItemProd.published,
          archived:     rawItemProd.archived,
          inStock:      stockMap.get(rawItemProd.id) ?? true,
          displayOrder: i.display_order,
        });
      }
    }

    const allProducts = [baseProduct, ...matchingProducts];
    const pricing = calculateLookPricing(
      baseProduct.price,
      matchingProducts.map((p) => p.price),
      Number(setRow.bundle_price) || 0
    );

    details.push({
      id:            setRow.id,
      baseProductId: setRow.base_product_id,
      enabled:       Boolean(setRow.enabled),
      couponAllowed: setRow.coupon_allowed !== false,
      createdAt:     setRow.created_at,
      updatedAt:     setRow.updated_at,
      ...pricing,
      baseProduct,
      matchingProducts,
      allProducts,
    });
  }

  return details;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. TOGGLE COMPLETE THE LOOK STATUS (ACTIVE / DISABLED)
// ─────────────────────────────────────────────────────────────────────────────

export async function toggleCompleteTheLookStatus(
  idOrBaseProductId: string,
  enabled: boolean,
  client?: any
): Promise<{ success: boolean; error?: string; set?: CompleteTheLookDetail | null }> {
  if (!idOrBaseProductId) return { success: false, error: "Look identifier is required." };
  const supabase = client ?? (await createClient());

  // Check whether target is set id or base_product_id
  let targetBaseProductId: string | null = null;
  let targetSetId: string | null = null;

  const { data: setById } = await supabase
    .from("complete_the_look_sets")
    .select("id, base_product_id")
    .eq("id", idOrBaseProductId)
    .maybeSingle();

  if (setById) {
    targetSetId = setById.id;
    targetBaseProductId = setById.base_product_id;
  } else {
    const { data: setByBase } = await supabase
      .from("complete_the_look_sets")
      .select("id, base_product_id")
      .eq("base_product_id", idOrBaseProductId)
      .maybeSingle();
    if (setByBase) {
      targetSetId = setByBase.id;
      targetBaseProductId = setByBase.base_product_id;
    }
  }

  if (!targetSetId) {
    return { success: false, error: "Complete the Look set not found." };
  }

  const { error: updateErr } = await supabase
    .from("complete_the_look_sets")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("id", targetSetId);

  if (updateErr) {
    console.error("[toggleCompleteTheLookStatus]", updateErr.message);
    return { success: false, error: "Failed to update Complete the Look status." };
  }

  const updatedSet = targetBaseProductId ? await getAdminCompleteTheLook(targetBaseProductId, supabase) : null;
  return { success: true, set: updatedSet };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. DELETE COMPLETE THE LOOK CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteCompleteTheLook(
  idOrBaseProductId: string,
  client?: any
): Promise<{ success: boolean; error?: string }> {
  if (!idOrBaseProductId) return { success: false, error: "Product ID or Set ID is required." };
  const supabase = client ?? (await createClient());

  // Check if it matches id or base_product_id
  const { data: setById } = await supabase
    .from("complete_the_look_sets")
    .select("id, base_product_id")
    .eq("id", idOrBaseProductId)
    .maybeSingle();

  let deleteCol = "base_product_id";
  let deleteVal = idOrBaseProductId;

  if (setById) {
    deleteCol = "id";
    deleteVal = setById.id;
  }

  const { error } = await supabase
    .from("complete_the_look_sets")
    .delete()
    .eq(deleteCol, deleteVal);

  if (error) {
    console.error("[deleteCompleteTheLook]", error.message);
    return { success: false, error: "Failed to remove Complete the Look set." };
  }

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. SEARCH CANDIDATE PRODUCTS FOR COMPLETE THE LOOK
// ─────────────────────────────────────────────────────────────────────────────

export async function searchCandidateProducts(
  baseProductId?: string,
  options: { query?: string; excludeIds?: string[]; limit?: number } = {},
  client?: any
): Promise<CompleteTheLookProduct[]> {
  const supabase = client ?? (await createClient());
  const { query = "", excludeIds = [], limit = 25 } = options;

  let dbQuery = supabase
    .from("products")
    .select("id, slug, name, price, image_url, category, published, archived")
    .eq("archived", false);

  if (baseProductId) {
    dbQuery = dbQuery.neq("id", baseProductId);
  }

  if (query && query.trim()) {
    const q = query.trim();
    dbQuery = dbQuery.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
  }

  dbQuery = dbQuery.order("name", { ascending: true }).limit(limit);

  const { data, error } = await dbQuery;

  if (error || !data) {
    console.error("[searchCandidateProducts]", error?.message);
    return [];
  }

  const excludeSet = new Set(baseProductId ? [baseProductId, ...excludeIds] : excludeIds);
  const filtered = (data as any[]).filter(p => !excludeSet.has(p.id));

  // Fetch stock quantities for returned candidates
  const candidateIds = filtered.map(p => p.id);
  const stockMap = new Map<string, boolean>();

  if (candidateIds.length > 0) {
    const { data: invRows } = await supabase
      .from("inventory")
      .select("product_id, stock_quantity")
      .in("product_id", candidateIds);

    invRows?.forEach((inv: any) => {
      stockMap.set(inv.product_id, (inv.stock_quantity ?? 0) > 0);
    });
  }

  return filtered.map(p => ({
    id:        p.id,
    slug:      p.slug,
    name:      p.name,
    price:     Number(p.price) || 0,
    imageUrl:  p.image_url,
    category:  p.category,
    published: p.published,
    archived:  p.archived,
    inStock:   stockMap.get(p.id) ?? true,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. SERVER-SIDE BUNDLE VALIDATION (STEP 4)
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidateBundleInput {
  baseProductId?: string; // UUID or slug
  setId?:         string; // Set UUID
  productIds:     string[]; // UUIDs or slugs
}

export interface ValidatedBundleProduct {
  id:          string;
  slug:        string;
  name:        string;
  price:       number;
  imageUrl:    string | null;
  antiTarnish: boolean;
  category:    string;
}

export interface ValidatedBundleResult {
  isValid: boolean;
  error?:  string;
  bundle?: {
    bundleId:        string;
    setId:           string;
    baseProductId:   string;
    baseProductSlug: string;
    bundlePrice:     number;
    individualTotal: number;
    savings:         number;
    savingsPercent:  number;
    couponAllowed:   boolean;
    productIds:      string[];
    productSlugs:    string[];
    products:        ValidatedBundleProduct[];
  };
}

/**
 * Server-side bundle validator.
 * Independently verifies that the candidate bundle exists, is enabled,
 * contains all required products, and that all products are currently in stock.
 * Calculates authoritative individual total and bundle price from the catalog.
 */
export async function validateCompleteTheLookBundle(
  input: ValidateBundleInput,
  client?: any
): Promise<ValidatedBundleResult> {
  const supabase = client ?? (await createClient());

  const { baseProductId, setId, productIds: inputIds } = input;

  if (!baseProductId && !setId) {
    return { isValid: false, error: "Missing base product or set identifier." };
  }

  if (!Array.isArray(inputIds) || inputIds.length < 2) {
    return { isValid: false, error: "Complete the Look requires at least 2 products." };
  }

  // 1. Resolve the set row
  let setRow: any = null;

  if (setId) {
    const { data, error } = await supabase
      .from("complete_the_look_sets")
      .select("*")
      .eq("id", setId)
      .maybeSingle();

    if (error || !data) {
      return { isValid: false, error: "Complete the Look offer not found." };
    }
    setRow = data;
  } else if (baseProductId) {
    // baseProductId might be an ID or a slug
    let baseUuid = baseProductId;

    const { data: prodById } = await supabase
      .from("products")
      .select("id")
      .eq("id", baseProductId)
      .maybeSingle();

    if (prodById?.id) {
      baseUuid = prodById.id;
    } else {
      const { data: prodBySlug } = await supabase
        .from("products")
        .select("id")
        .eq("slug", baseProductId)
        .maybeSingle();

      if (prodBySlug?.id) {
        baseUuid = prodBySlug.id;
      } else {
        return { isValid: false, error: "Base product not found." };
      }
    }

    const { data, error } = await supabase
      .from("complete_the_look_sets")
      .select("*")
      .eq("base_product_id", baseUuid)
      .maybeSingle();

    if (error || !data) {
      return { isValid: false, error: "Complete the Look offer not found for this product." };
    }
    setRow = data;
  }

  if (!setRow || !setRow.enabled) {
    return { isValid: false, error: "This Complete the Look offer is currently unavailable." };
  }

  // 2. Fetch matching items
  const { data: itemRows, error: itemError } = await supabase
    .from("complete_the_look_items")
    .select("product_id, display_order")
    .eq("set_id", setRow.id)
    .order("display_order", { ascending: true });

  if (itemError || !itemRows || itemRows.length === 0) {
    return { isValid: false, error: "Complete the Look configuration has no matching items." };
  }

  const requiredProductIds: string[] = [setRow.base_product_id, ...itemRows.map((i: any) => i.product_id)];

  // 3. Fetch all required products from public.products
  const { data: dbProducts, error: prodError } = await supabase
    .from("products")
    .select("id, slug, name, price, image_url, anti_tarnish, category, published, archived")
    .in("id", requiredProductIds);

  if (prodError || !dbProducts || dbProducts.length !== requiredProductIds.length) {
    return { isValid: false, error: "One or more products in this look are no longer available in the catalog." };
  }

  // Verify published + not archived
  for (const p of dbProducts) {
    if (!p.published || p.archived) {
      return { isValid: false, error: `"${p.name}" is no longer available.` };
    }
  }

  // 4. Verify inventory stock
  const { data: invRows } = await supabase
    .from("inventory")
    .select("product_id, stock_quantity")
    .in("product_id", requiredProductIds);

  const stockMap = new Map<string, number>(
    (invRows ?? []).map((r: any) => [r.product_id, Number(r.stock_quantity) || 0])
  );

  for (const p of dbProducts) {
    const stock = stockMap.get(p.id) ?? 0;
    if (stock < 1) {
      return { isValid: false, error: `"${p.name}" in this Complete the Look set is currently out of stock.` };
    }
  }

  // 5. Match input product IDs against required products
  // Map both UUIDs and Slugs to products
  const productByUuid = new Map<string, any>(dbProducts.map((p: any) => [p.id, p]));
  const productBySlug = new Map<string, any>(dbProducts.map((p: any) => [p.slug, p]));

  const resolvedInputUuids = new Set<string>();
  for (const rawId of inputIds) {
    const p = productByUuid.get(rawId) || productBySlug.get(rawId);
    if (!p) {
      return { isValid: false, error: `Unexpected product "${rawId}" does not belong to this Complete the Look set.` };
    }
    if (resolvedInputUuids.has(p.id)) {
      return { isValid: false, error: "Duplicate products found in Complete the Look selection." };
    }
    resolvedInputUuids.add(p.id);
  }

  if (resolvedInputUuids.size !== requiredProductIds.length) {
    return { isValid: false, error: "All products in the Complete the Look set must be selected to receive the bundle offer." };
  }

  for (const reqId of requiredProductIds) {
    if (!resolvedInputUuids.has(reqId)) {
      return { isValid: false, error: "All products in the Complete the Look set must be selected to receive the bundle offer." };
    }
  }

  // 6. Calculate authoritative pricing
  const baseProduct = productByUuid.get(setRow.base_product_id)!;
  const matchingProducts = itemRows.map((item: any) => productByUuid.get(item.product_id)!);
  const allOrderedProducts = [baseProduct, ...matchingProducts];

  const individualTotal = Number(
    allOrderedProducts.reduce((sum, p) => sum + (Number(p.price) || 0), 0).toFixed(2)
  );
  const bundlePrice = Number(setRow.bundle_price);
  const savings = Number(Math.max(0, individualTotal - bundlePrice).toFixed(2));
  const savingsPercent = individualTotal > 0 ? Math.round((savings / individualTotal) * 100) : 0;
  const couponAllowed = setRow.coupon_allowed !== false;

  const bundleId = `ctl_${setRow.id.slice(0, 8)}_${Date.now()}`;

  const validatedProducts: ValidatedBundleProduct[] = allOrderedProducts.map(p => ({
    id:          p.id,
    slug:        p.slug,
    name:        p.name ?? "Jewellery",
    price:       Number(p.price) || 0,
    imageUrl:    p.image_url ?? null,
    antiTarnish: Boolean(p.anti_tarnish),
    category:    p.category ?? "jewellery",
  }));

  return {
    isValid: true,
    bundle: {
      bundleId,
      setId:           setRow.id,
      baseProductId:   setRow.base_product_id,
      baseProductSlug: baseProduct.slug,
      bundlePrice,
      individualTotal,
      savings,
      savingsPercent,
      couponAllowed,
      productIds:      allOrderedProducts.map(p => p.id),
      productSlugs:    allOrderedProducts.map(p => p.slug),
      products:        validatedProducts,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. CART COMPLETE THE LOOK RECOMMENDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Given the list of product IDs or slugs currently in the customer's cart,
 * discovers any enabled Complete the Look sets matching at least one product.
 * Returns the best candidate look recommendation with remaining items & dynamic messaging,
 * or null if no matching set exists.
 */
export async function getCartCompleteTheLookRecommendation(
  cartProductKeys: string[],
  client?: any
): Promise<CartLookRecommendation | null> {
  if (!cartProductKeys || !Array.isArray(cartProductKeys) || cartProductKeys.length === 0) {
    return null;
  }

  const cleanKeys = Array.from(
    new Set(cartProductKeys.map((k) => (typeof k === "string" ? k.trim() : "")).filter(Boolean))
  );

  if (cleanKeys.length === 0) {
    return null;
  }

  const supabase = client ?? (await createClient());

  // 1. Resolve cart product keys (either IDs or slugs) to product records
  const [{ data: prodsById }, { data: prodsBySlug }] = await Promise.all([
    supabase
      .from("products")
      .select("id, slug, name, price, image_url, category, published, archived")
      .in("id", cleanKeys),
    supabase
      .from("products")
      .select("id, slug, name, price, image_url, category, published, archived")
      .in("slug", cleanKeys),
  ]);

  const cartProductsMap = new Map<string, any>();
  for (const p of prodsById ?? []) cartProductsMap.set(p.id, p);
  for (const p of prodsBySlug ?? []) cartProductsMap.set(p.id, p);
  const cartProducts = Array.from(cartProductsMap.values());

  if (cartProducts.length === 0) {
    return null;
  }

  const cartProductUuids = cartProducts.map((p) => p.id);

  // 2. Discover enabled sets where any cart product is either base_product or matching item
  // a) Sets where base_product_id is in cart
  const { data: setsByBase } = await supabase
    .from("complete_the_look_sets")
    .select("id, base_product_id, bundle_price, enabled, coupon_allowed")
    .eq("enabled", true)
    .in("base_product_id", cartProductUuids);

  // b) Matching items where product_id is in cart
  const { data: itemsByMatching } = await supabase
    .from("complete_the_look_items")
    .select("set_id, product_id")
    .in("product_id", cartProductUuids);

  const matchingSetIds = Array.from(
    new Set((itemsByMatching ?? []).map((i: any) => i.set_id))
  );

  const { data: setsByMatching } =
    matchingSetIds.length > 0
      ? await supabase
          .from("complete_the_look_sets")
          .select("id, base_product_id, bundle_price, enabled, coupon_allowed")
          .eq("enabled", true)
          .in("id", matchingSetIds)
      : { data: [] };

  const candidateSetsMap = new Map<string, any>();
  for (const s of setsByBase ?? []) {
    candidateSetsMap.set(s.id, s);
  }
  for (const s of setsByMatching ?? []) {
    candidateSetsMap.set(s.id, s);
  }

  if (candidateSetsMap.size === 0) {
    return null;
  }

  const candidateSetIds = Array.from(candidateSetsMap.keys());

  // 3. Batch fetch all items for all candidate sets
  const { data: allSetItems } = await supabase
    .from("complete_the_look_items")
    .select("id, set_id, product_id, display_order")
    .in("set_id", candidateSetIds)
    .order("display_order", { ascending: true });

  const itemsBySetId = new Map<string, any[]>();
  for (const item of allSetItems ?? []) {
    const list = itemsBySetId.get(item.set_id) ?? [];
    list.push(item);
    itemsBySetId.set(item.set_id, list);
  }

  // 4. Batch fetch all product details and inventory for all products in all candidate sets
  const allNeededProductIds = new Set<string>();
  for (const s of candidateSetsMap.values()) {
    allNeededProductIds.add(s.base_product_id);
    const items = itemsBySetId.get(s.id) ?? [];
    for (const it of items) {
      allNeededProductIds.add(it.product_id);
    }
  }

  const neededIdsArr = Array.from(allNeededProductIds);
  const [{ data: allLookProducts }, { data: invRows }] = await Promise.all([
    supabase
      .from("products")
      .select("id, slug, name, price, image_url, category, published, archived")
      .in("id", neededIdsArr),
    supabase
      .from("inventory")
      .select("product_id, stock_quantity")
      .in("product_id", neededIdsArr),
  ]);

  const stockMap = new Map<string, number>(
    (invRows ?? []).map((r: any) => [r.product_id, Number(r.stock_quantity) || 0])
  );

  const productMap = new Map<string, CompleteTheLookProduct>();
  for (const p of allLookProducts ?? []) {
    productMap.set(p.id, {
      id:        p.id,
      slug:      p.slug,
      name:      p.name ?? "Jewellery",
      price:     Number(p.price) || 0,
      imageUrl:  p.image_url ?? null,
      category:  p.category ?? "jewellery",
      published: Boolean(p.published),
      archived:  Boolean(p.archived),
      inStock:   (stockMap.get(p.id) ?? 0) > 0,
    });
  }

  // 5. Score and filter candidates
  interface EvaluatedSet {
    setRow: any;
    allProducts: CompleteTheLookProduct[];
    inCartCount: number;
    remainingCount: number;
    canBeCompleted: boolean;
    savings: number;
    score: number;
  }

  const evaluatedSets: EvaluatedSet[] = [];
  const cartUuidSet = new Set(cartProductUuids);

  for (const [setId, setRow] of candidateSetsMap.entries()) {
    const baseProd = productMap.get(setRow.base_product_id);
    if (!baseProd || !baseProd.published || baseProd.archived) continue;

    const items = itemsBySetId.get(setId) ?? [];
    if (items.length < 1) continue; // Minimum 1 matching item (total 2 products)

    const matchingProds: CompleteTheLookProduct[] = [];
    let itemsValid = true;
    for (const it of items) {
      const prod = productMap.get(it.product_id);
      if (!prod || !prod.published || prod.archived) {
        itemsValid = false;
        break;
      }
      matchingProds.push(prod);
    }
    if (!itemsValid) continue;

    const allOrderedProducts = [baseProd, ...matchingProds];
    if (allOrderedProducts.length < 2 || allOrderedProducts.length > 4) continue;

    let inCartCount = 0;
    let remainingCount = 0;
    let canBeCompleted = true;
    let totalIndiv = 0;

    for (const prod of allOrderedProducts) {
      totalIndiv += prod.price;
      if (cartUuidSet.has(prod.id)) {
        inCartCount++;
      } else {
        remainingCount++;
        if (prod.inStock === false) {
          canBeCompleted = false;
        }
      }
    }

    if (inCartCount === 0) continue; // None of this look's products are in cart

    const bundlePrice = Number(setRow.bundle_price) || 0;
    const savings = Math.max(0, totalIndiv - bundlePrice);

    // Scoring heuristic:
    // 1. Partial bundles (remaining > 0) heavily favored over already completed (1000 pts)
    // 2. More items already in cart favored (+100 pts per item)
    // 3. In-stock remaining items favored (+50 pts)
    // 4. Base product in cart (+30 pts)
    // 5. Higher savings favored (+savings / 100)
    let score = 0;
    if (remainingCount > 0) score += 1000;
    score += inCartCount * 100;
    if (canBeCompleted) score += 50;
    if (cartUuidSet.has(baseProd.id)) score += 30;
    score += Math.min(20, savings / 100);

    evaluatedSets.push({
      setRow,
      allProducts: allOrderedProducts,
      inCartCount,
      remainingCount,
      canBeCompleted,
      savings,
      score,
    });
  }

  if (evaluatedSets.length === 0) {
    return null;
  }

  // Sort descending by score
  evaluatedSets.sort((a, b) => b.score - a.score);
  const best = evaluatedSets[0];

  return getCartLookRecommendationMessaging({
    allProducts:       best.allProducts,
    inCartProductKeys: cleanKeys,
    bundlePrice:       Number(best.setRow.bundle_price) || 0,
    setId:             best.setRow.id,
    baseProductId:     best.setRow.base_product_id,
    couponAllowed:     best.setRow.coupon_allowed !== false,
  });
}

