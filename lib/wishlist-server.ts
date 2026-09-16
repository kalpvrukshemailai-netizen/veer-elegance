/**
 * VEER ELEGANCE — Customer Wishlist Server Module
 *
 * Server-only database operations for managing customer wishlist in Supabase.
 * Uses @/lib/supabase/server (cookies).
 */

import { createClient } from "@/lib/supabase/server";

/**
 * Fetches the list of product slugs in the authenticated user's wishlist.
 */
export async function getUserWishlistSlugs(
  userId: string,
  client?: any,
): Promise<string[]> {
  const supabase = client ?? (await createClient());

  const { data, error } = await supabase
    .from("wishlists")
    .select("products!inner(slug)")
    .eq("user_id", userId);

  if (error) {
    console.error("[getUserWishlistSlugs] Error querying wishlist:", error.message);
    return [];
  }

  type WishlistQueryResult = { products: { slug: string } | null };
  const slugs = (data as unknown as WishlistQueryResult[] ?? [])
    .map(row => row.products?.slug)
    .filter((slug): slug is string => Boolean(slug));

  return Array.from(new Set(slugs));
}

/**
 * Adds a product by slug to the authenticated user's wishlist in Supabase.
 */
export async function addToUserWishlist(
  userId: string,
  productSlug: string,
  client?: any,
): Promise<boolean> {
  const cleanSlug = productSlug.trim();
  if (!cleanSlug) return false;

  const supabase = client ?? (await createClient());

  // Resolve product UUID by slug
  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("id")
    .eq("slug", cleanSlug)
    .single();

  if (pErr || !product) {
    console.error("[addToUserWishlist] Product not found:", cleanSlug);
    return false;
  }

  const { error: insertErr } = await supabase
    .from("wishlists")
    .upsert(
      { user_id: userId, product_id: product.id },
      { onConflict: "user_id,product_id", ignoreDuplicates: true }
    );

  if (insertErr) {
    console.error("[addToUserWishlist] Error inserting wishlist record:", insertErr.message);
    return false;
  }

  return true;
}

/**
 * Removes a product by slug from the authenticated user's wishlist in Supabase.
 */
export async function removeFromUserWishlist(
  userId: string,
  productSlug: string,
  client?: any,
): Promise<boolean> {
  const cleanSlug = productSlug.trim();
  if (!cleanSlug) return false;

  const supabase = client ?? (await createClient());

  // Resolve product UUID by slug
  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("id")
    .eq("slug", cleanSlug)
    .single();

  if (pErr || !product) {
    return true; // Already not present
  }

  const { error: deleteErr } = await supabase
    .from("wishlists")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", product.id);

  if (deleteErr) {
    console.error("[removeFromUserWishlist] Error deleting wishlist record:", deleteErr.message);
    return false;
  }

  return true;
}
