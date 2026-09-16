/**
 * VEER ELEGANCE — Product Image Utilities
 *
 * Server-side only. Never import from Client Components.
 *
 * Strategy:
 *  - Storage bucket: product-images (PUBLIC)
 *  - Path:           products/{productId}/{sanitizedFilename}
 *  - Primary image:  sort_order = 0 (lowest sort_order in product_images)
 *  - products.image_url is kept in sync with the primary image public URL
 *    so all existing ProductCard / product-detail components keep working.
 *
 * Duplicate prevention: filenames are UUID-prefixed so re-uploads never collide.
 */

import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductImage {
  id:           string;
  product_id:   string;
  storage_path: string;
  public_url:   string | null;
  sort_order:   number;
  created_at:   string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const BUCKET         = "product-images";
const MAX_FILE_SIZE  = 5 * 1024 * 1024;   // 5 MB
const ALLOWED_TYPES  = ["image/jpeg", "image/jpg", "image/png", "image/webp"] as const;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Sanitizes a filename: strips path traversal chars, lowercases, hyphenates spaces. */
export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")  // allow only safe chars
    .replace(/\.{2,}/g, ".")          // prevent ../
    .replace(/^[.\-]+/, "")           // strip leading dots/dashes
    .slice(0, 120);                   // cap length
}

/** Returns a unique storage path for a product image. */
export function buildStoragePath(productId: string, filename: string): string {
  const uniquePrefix = crypto.randomUUID().slice(0, 8);
  const sanitized    = sanitizeFilename(filename);
  return `products/${productId}/${uniquePrefix}-${sanitized}`;
}

/** Derives the public CDN URL for a storage path. */
export function getPublicUrl(supabaseUrl: string, storagePath: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

/** Validates a file's MIME type and size. Returns error message or null. */
export function validateImageFile(
  mimeType: string,
  sizeBytes: number,
): string | null {
  if (!ALLOWED_TYPES.includes(mimeType as (typeof ALLOWED_TYPES)[number])) {
    return `Unsupported file type "${mimeType}". Please upload a JPG, PNG, or WEBP.`;
  }
  if (sizeBytes > MAX_FILE_SIZE) {
    return `File too large (${(sizeBytes / 1024 / 1024).toFixed(1)} MB). Maximum is 5 MB.`;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────────────────

/** Returns all images for a product, ordered by sort_order ascending. */
export async function getProductImages(productId: string): Promise<ProductImage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) { console.error("[getProductImages]", error.message); return []; }
  return (data ?? []) as ProductImage[];
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD
// ─────────────────────────────────────────────────────────────────────────────

export type UploadResult =
  | { success: true;  image: ProductImage }
  | { success: false; error: string };

/**
 * Uploads a file to Supabase Storage and records it in product_images.
 * If this is the first image for the product, it becomes primary (sort_order = 0).
 * Syncs products.image_url to primary image URL.
 */
export async function uploadProductImage(
  productId: string,
  file:       File,
): Promise<UploadResult> {
  // ── Validate ──────────────────────────────────────────────────────────────
  const validationError = validateImageFile(file.type, file.size);
  if (validationError) return { success: false, error: validationError };

  const supabase     = await createClient();
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  // ── Determine sort_order ──────────────────────────────────────────────────
  const existing = await getProductImages(productId);
  const maxOrder = existing.length > 0
    ? Math.max(...existing.map(i => i.sort_order))
    : -1;
  const sortOrder = existing.length === 0 ? 0 : maxOrder + 1;

  // ── Build storage path ────────────────────────────────────────────────────
  const storagePath = buildStoragePath(productId, file.name);

  // ── Upload to Supabase Storage ────────────────────────────────────────────
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType:  file.type,
      cacheControl: "3600",
      upsert:       false,
    });

  if (uploadError) {
    return { success: false, error: `Upload failed: ${uploadError.message}` };
  }

  // ── Derive public URL ─────────────────────────────────────────────────────
  const publicUrl = getPublicUrl(supabaseUrl, storagePath);

  // ── Insert product_images row ─────────────────────────────────────────────
  const { data: imgRow, error: dbError } = await supabase
    .from("product_images")
    .insert({
      product_id:   productId,
      storage_path: storagePath,
      public_url:   publicUrl,
      sort_order:   sortOrder,
    })
    .select("*")
    .single();

  if (dbError) {
    // Attempt to clean up the orphaned storage object
    await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => {});
    return { success: false, error: `Database error: ${dbError.message}` };
  }

  // ── If primary, sync products.image_url ───────────────────────────────────
  if (sortOrder === 0) {
    await supabase
      .from("products")
      .update({ image_url: publicUrl })
      .eq("id", productId);
  }

  return { success: true, image: imgRow as ProductImage };
}

// ─────────────────────────────────────────────────────────────────────────────
// SET PRIMARY
// ─────────────────────────────────────────────────────────────────────────────

export type SetPrimaryResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Promotes an image to primary (sort_order = 0).
 * The old primary gets sort_order = 1.
 * All other images get sort_order = their position + 1.
 * Syncs products.image_url.
 */
export async function setPrimaryImage(
  productId: string,
  imageId:   string,
): Promise<SetPrimaryResult> {
  const supabase = await createClient();
  const images   = await getProductImages(productId);

  if (!images.find(i => i.id === imageId)) {
    return { success: false, error: "Image not found for this product." };
  }

  // Reorder: target gets 0, all others get sequential positions
  const reordered = [
    images.find(i => i.id === imageId)!,
    ...images.filter(i => i.id !== imageId),
  ];

  for (let idx = 0; idx < reordered.length; idx++) {
    const { error } = await supabase
      .from("product_images")
      .update({ sort_order: idx })
      .eq("id", reordered[idx].id);
    if (error) return { success: false, error: error.message };
  }

  // Sync products.image_url to the new primary
  const newPrimary = reordered[0];
  await supabase
    .from("products")
    .update({ image_url: newPrimary.public_url })
    .eq("id", productId);

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────

export type DeleteResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Deletes an image from Storage and product_images.
 * If the deleted image was primary, promotes the next image.
 * If no images remain, clears products.image_url.
 */
export async function deleteProductImage(
  productId: string,
  imageId:   string,
): Promise<DeleteResult> {
  const supabase = await createClient();
  const images   = await getProductImages(productId);

  const target = images.find(i => i.id === imageId);
  if (!target) return { success: false, error: "Image not found." };

  const wasPrimary = target.sort_order === 0;

  // ── Delete from Storage ───────────────────────────────────────────────────
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([target.storage_path]);

  if (storageError) {
    // If storage object not found, continue to DB cleanup anyway
    if (!storageError.message.toLowerCase().includes("not found")) {
      return { success: false, error: `Storage delete failed: ${storageError.message}` };
    }
  }

  // ── Delete DB row ─────────────────────────────────────────────────────────
  const { error: dbError } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId);

  if (dbError) return { success: false, error: dbError.message };

  // ── If primary was deleted, promote next image ─────────────────────────────
  const remaining = images.filter(i => i.id !== imageId);

  if (remaining.length === 0) {
    // No images left — clear products.image_url
    await supabase
      .from("products")
      .update({ image_url: null })
      .eq("id", productId);
  } else if (wasPrimary) {
    // Promote the first remaining image by re-ordering
    const newPrimary = remaining[0];
    for (let idx = 0; idx < remaining.length; idx++) {
      await supabase
        .from("product_images")
        .update({ sort_order: idx })
        .eq("id", remaining[idx].id);
    }
    await supabase
      .from("products")
      .update({ image_url: newPrimary.public_url })
      .eq("id", productId);
  }

  return { success: true };
}
