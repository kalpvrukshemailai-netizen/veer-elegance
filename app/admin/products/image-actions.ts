"use server";

/**
 * VEER ELEGANCE — Product Image Server Actions
 *
 * Upload, set-primary, and delete product images.
 * requireAdmin() re-verified on every action.
 */

import { revalidatePath }    from "next/cache";
import { requireAdmin }      from "@/lib/admin";
import {
  uploadProductImage,
  setPrimaryImage,
  deleteProductImage,
} from "@/lib/product-images";

// ─────────────────────────────────────────────────────────────────────────────

export type ImageActionState = {
  error?:   string;
  success?: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadImageAction(
  productId: string,
  _prev:     ImageActionState,
  formData:  FormData,
): Promise<ImageActionState> {
  await requireAdmin("/admin/products");

  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) {
    return { error: "No file selected." };
  }

  const result = await uploadProductImage(productId, file);

  if (!result.success) return { error: result.error };

  revalidatePath(`/admin/products`);
  revalidatePath(`/admin/products/${productId}/edit`);
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// SET PRIMARY
// ─────────────────────────────────────────────────────────────────────────────

export async function setPrimaryImageAction(
  productId: string,
  imageId:   string,
): Promise<ImageActionState> {
  await requireAdmin("/admin/products");

  const result = await setPrimaryImage(productId, imageId);

  if (!result.success) return { error: result.error };

  revalidatePath(`/admin/products`);
  revalidatePath(`/admin/products/${productId}/edit`);
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteImageAction(
  productId: string,
  imageId:   string,
): Promise<ImageActionState> {
  await requireAdmin("/admin/products");

  const result = await deleteProductImage(productId, imageId);

  if (!result.success) return { error: result.error };

  revalidatePath(`/admin/products`);
  revalidatePath(`/admin/products/${productId}/edit`);
  return { success: true };
}
