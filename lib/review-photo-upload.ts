/**
 * VEER ELEGANCE — Review Photo Upload Utilities
 *
 * Server-side helper to safely validate and upload customer review photos
 * to Supabase Storage ('review-photos' bucket).
 */

import { createClient } from "@/lib/supabase/server";

export const REVIEW_PHOTO_BUCKET = "review-photos";
export const REVIEW_PHOTO_MAX_SIZE = 5 * 1024 * 1024; // 5 MB
export const REVIEW_PHOTO_ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/^[.\-]+/, "")
    .slice(0, 100);
}

export function buildReviewPhotoStoragePath(productId: string, filename: string): string {
  const uniqueId = crypto.randomUUID().slice(0, 10);
  const sanitized = sanitizeFilename(filename);
  return `reviews/${productId}/${uniqueId}-${sanitized}`;
}

export async function uploadCustomerReviewPhoto(
  file: File,
  productId: string,
  userId: string,
  client?: any
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  // 1. File size check
  if (file.size > REVIEW_PHOTO_MAX_SIZE) {
    return { success: false, error: "Image size must be 5MB or less." };
  }

  // 2. MIME type check
  if (!REVIEW_PHOTO_ALLOWED_TYPES.includes(file.type as any)) {
    return { success: false, error: "Only JPG, PNG, and WebP images are allowed." };
  }

  const supabase = client ?? (await createClient());
  const storagePath = buildReviewPhotoStoragePath(productId, file.name);

  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(REVIEW_PHOTO_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[uploadCustomerReviewPhoto] Error:", uploadError.message);
    return { success: false, error: "Failed to upload image. Please try again." };
  }

  const { data: { publicUrl } } = supabase.storage
    .from(REVIEW_PHOTO_BUCKET)
    .getPublicUrl(storagePath);

  return { success: true, publicUrl };
}

export async function deleteCustomerReviewPhoto(
  imageUrl: string,
  client?: any
): Promise<boolean> {
  if (!imageUrl) return true;
  try {
    const supabase = client ?? (await createClient());
    const marker = `/storage/v1/object/public/${REVIEW_PHOTO_BUCKET}/`;
    const idx = imageUrl.indexOf(marker);
    if (idx === -1) return true;
    const path = imageUrl.slice(idx + marker.length);
    if (!path) return true;

    await supabase.storage.from(REVIEW_PHOTO_BUCKET).remove([path]);
    return true;
  } catch (err) {
    console.error("[deleteCustomerReviewPhoto] Error:", err);
    return false;
  }
}
