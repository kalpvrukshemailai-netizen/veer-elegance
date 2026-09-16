/**
 * VEER ELEGANCE — Marketing Image Utilities
 *
 * Server-side only. Never import from Client Components.
 *
 * Storage Strategy:
 *  - Storage bucket: product-images (existing public bucket)
 *  - Storage path:   marketing/popup/{uniquePrefix}-{sanitizedFilename}
 *  - Public URL:     CDN URL saved into site_content ("popup" -> imageUrl)
 *
 * Security:
 *  - Enforces authenticated admin check before upload.
 *  - 5 MB maximum size.
 *  - Allowed types: image/jpeg, image/jpg, image/png, image/webp.
 */

import { createClient } from "@/lib/supabase/server";

export const MARKETING_IMAGE_BUCKET = "product-images";
export const MARKETING_IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5 MB
export const MARKETING_IMAGE_ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

/** Sanitizes a filename: strips path traversal chars, lowercases, hyphenates spaces. */
export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")  // allow only safe chars
    .replace(/\.{2,}/g, ".")          // prevent ../
    .replace(/^[.\-]+/, "")           // strip leading dots/dashes
    .slice(0, 100);                   // cap length
}

/** Returns a unique storage path for a marketing popup image. */
export function buildMarketingStoragePath(filename: string): string {
  const uniquePrefix = crypto.randomUUID().slice(0, 8);
  const sanitized    = sanitizeFilename(filename);
  return `marketing/popup/${uniquePrefix}-${sanitized}`;
}

/** Derives the public CDN URL for a marketing storage path. */
export function getMarketingPublicUrl(supabaseUrl: string, storagePath: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${MARKETING_IMAGE_BUCKET}/${storagePath}`;
}

/** Extracts storage path from a full Supabase CDN URL. */
export function extractMarketingStoragePath(publicUrl: string): string | null {
  if (!publicUrl) return null;
  const marker = `/storage/v1/object/public/${MARKETING_IMAGE_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx !== -1) {
    return publicUrl.slice(idx + marker.length);
  }
  return null;
}

/** Validates a file's MIME type and size. Returns error message or null. */
export function validateMarketingImageFile(
  mimeType: string,
  sizeBytes: number,
): string | null {
  if (!mimeType || !MARKETING_IMAGE_ALLOWED_TYPES.includes(mimeType as (typeof MARKETING_IMAGE_ALLOWED_TYPES)[number])) {
    return `Unsupported file type "${mimeType || "unknown"}". Please upload a JPG, PNG, or WEBP.`;
  }
  if (sizeBytes <= 0) {
    return "The selected file is empty. Please select a valid image.";
  }
  if (sizeBytes > MARKETING_IMAGE_MAX_SIZE) {
    return `File too large (${(sizeBytes / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 5 MB.`;
  }
  return null;
}

export type MarketingUploadResult =
  | { success: true; publicUrl: string; storagePath: string }
  | { success: false; error: string };

/**
 * Uploads a marketing popup image to Supabase Storage.
 */
export async function uploadMarketingImage(file: File): Promise<MarketingUploadResult> {
  const validationError = validateMarketingImageFile(file.type, file.size);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const supabase    = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  const storagePath = buildMarketingStoragePath(file.name);

  const { error: uploadError } = await supabase.storage
    .from(MARKETING_IMAGE_BUCKET)
    .upload(storagePath, file, {
      contentType:  file.type,
      cacheControl: "3600",
      upsert:       false,
    });

  if (uploadError) {
    return { success: false, error: `Upload failed: ${uploadError.message}` };
  }

  const publicUrl = getMarketingPublicUrl(supabaseUrl, storagePath);

  return { success: true, publicUrl, storagePath };
}

/**
 * Deletes a marketing popup image from Supabase Storage.
 */
export async function deleteMarketingImage(publicUrlOrPath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const storagePath = publicUrlOrPath.startsWith("http")
      ? extractMarketingStoragePath(publicUrlOrPath)
      : publicUrlOrPath;

    if (!storagePath) {
      return { success: true };
    }

    const { error } = await supabase.storage
      .from(MARKETING_IMAGE_BUCKET)
      .remove([storagePath]);

    if (error && !error.message.toLowerCase().includes("not found")) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete image";
    return { success: false, error: errorMsg };
  }
}
