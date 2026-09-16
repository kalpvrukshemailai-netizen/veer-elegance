/**
 * VEER ELEGANCE — Founder Portrait Image Utilities
 *
 * Server-side only. Never import from Client Components.
 *
 * Storage Strategy:
 *  - Storage bucket: product-images (existing public bucket)
 *  - Storage path:   brand/founder/{uniquePrefix}-{sanitizedFilename}
 *  - Public URL:     CDN URL saved into site_content ("founder" -> founderImageUrl)
 *
 * Security:
 *  - Enforces authenticated admin check before upload.
 *  - 5 MB maximum size.
 *  - Allowed types: image/jpeg, image/jpg, image/png, image/webp.
 */

import { createClient } from "@/lib/supabase/server";

export const FOUNDER_IMAGE_BUCKET = "product-images";
export const FOUNDER_IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5 MB
export const FOUNDER_IMAGE_ALLOWED_TYPES = [
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

/** Returns a unique storage path for a founder portrait image. */
export function buildFounderStoragePath(filename: string): string {
  const uniquePrefix = crypto.randomUUID().slice(0, 8);
  const sanitized    = sanitizeFilename(filename);
  return `brand/founder/${uniquePrefix}-${sanitized}`;
}

/** Derives the public CDN URL for a storage path. */
export function getFounderPublicUrl(supabaseUrl: string, storagePath: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${FOUNDER_IMAGE_BUCKET}/${storagePath}`;
}

/** Validates a file's MIME type and size. Returns error message or null. */
export function validateFounderImageFile(
  mimeType: string,
  sizeBytes: number,
): string | null {
  if (!mimeType || !FOUNDER_IMAGE_ALLOWED_TYPES.includes(mimeType as (typeof FOUNDER_IMAGE_ALLOWED_TYPES)[number])) {
    return `Unsupported file type "${mimeType || "unknown"}". Please upload a JPG, PNG, or WEBP.`;
  }
  if (sizeBytes <= 0) {
    return "The selected file is empty. Please select a valid image.";
  }
  if (sizeBytes > FOUNDER_IMAGE_MAX_SIZE) {
    return `File too large (${(sizeBytes / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 5 MB.`;
  }
  return null;
}

export type FounderUploadResult =
  | { success: true; publicUrl: string; storagePath: string }
  | { success: false; error: string };

/**
 * Uploads a founder portrait image to Supabase Storage.
 */
export async function uploadFounderImage(file: File): Promise<FounderUploadResult> {
  const validationError = validateFounderImageFile(file.type, file.size);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const supabase    = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  const storagePath = buildFounderStoragePath(file.name);

  const { error: uploadError } = await supabase.storage
    .from(FOUNDER_IMAGE_BUCKET)
    .upload(storagePath, file, {
      contentType:  file.type,
      cacheControl: "3600",
      upsert:       false,
    });

  if (uploadError) {
    return { success: false, error: `Upload failed: ${uploadError.message}` };
  }

  const publicUrl = getFounderPublicUrl(supabaseUrl, storagePath);

  return { success: true, publicUrl, storagePath };
}
