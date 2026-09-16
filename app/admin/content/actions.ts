"use server";

/**
 * VEER ELEGANCE — Admin Content Management Server Actions
 *
 * Saves and resets editorial content sections in public.site_content.
 * Enforces requireAdmin() on every operation.
 */

import { revalidatePath } from "next/cache";
import { requireAdmin }   from "@/lib/admin";
import {
  updateSiteSectionContent,
  resetSiteSectionContent,
  type SiteContentBundle,
} from "@/lib/site-content";
import { uploadFounderImage } from "@/lib/founder-image";
import { uploadMarketingImage, deleteMarketingImage } from "@/lib/marketing-image";

export type ContentActionState = {
  error?:   string;
  success?: boolean;
  message?: string;
};

export type UploadFounderImageState = {
  error?:     string;
  success?:   boolean;
  publicUrl?: string;
  message?:   string;
};

export type UploadMarketingImageState = {
  error?:     string;
  success?:   boolean;
  publicUrl?: string;
  message?:   string;
};

function isValidUrl(val: string): boolean {
  if (!val) return true;
  try {
    const url = new URL(val);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidEmail(val: string): boolean {
  if (!val) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}

function isValidHexColor(val: string): boolean {
  if (!val) return true;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(val.trim());
}

function isValidRedirectUrl(val: string): boolean {
  if (!val) return true;
  const trimmed = val.trim();
  // Safe internal path
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("/\\") &&
    !trimmed.includes("://") &&
    !trimmed.toLowerCase().startsWith("javascript:") &&
    !trimmed.toLowerCase().startsWith("data:")
  ) {
    return true;
  }
  // Safe external URL
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export async function saveContentSectionAction(
  sectionKey: keyof SiteContentBundle,
  payload: Record<string, any>,
): Promise<ContentActionState> {
  const adminId = await requireAdmin("/admin/content");

  // Basic field validation
  if (payload.storeEmail && !isValidEmail(payload.storeEmail)) {
    return { error: "Please enter a valid store email address." };
  }
  if (payload.contactEmail && !isValidEmail(payload.contactEmail)) {
    return { error: "Please enter a valid contact email address." };
  }
  if (payload.storeGoogleMapsUrl && !isValidUrl(payload.storeGoogleMapsUrl)) {
    return { error: "Google Maps URL must begin with http:// or https://" };
  }
  if (payload.instagramUrl && !isValidUrl(payload.instagramUrl)) {
    return { error: "Instagram URL must begin with http:// or https://" };
  }
  if (payload.facebookUrl && !isValidUrl(payload.facebookUrl)) {
    return { error: "Facebook URL must begin with http:// or https://" };
  }
  if (payload.youtubeUrl && !isValidUrl(payload.youtubeUrl)) {
    return { error: "YouTube URL must begin with http:// or https://" };
  }
  if (payload.linkedinUrl && !isValidUrl(payload.linkedinUrl)) {
    return { error: "LinkedIn URL must begin with http:// or https://" };
  }

  if (sectionKey === "announcement") {
    if (payload.backgroundColor && !isValidHexColor(payload.backgroundColor)) {
      return { error: "Background color must be a valid hex color (e.g. #2C1810)." };
    }
    if (payload.textColor && !isValidHexColor(payload.textColor)) {
      return { error: "Text color must be a valid hex color (e.g. #FAF8F5)." };
    }
    if (payload.accentColor && !isValidHexColor(payload.accentColor)) {
      return { error: "Accent color must be a valid hex color (e.g. #B89A68)." };
    }

    // Sanitize display targets
    let targets: string[] = Array.isArray(payload.displayTargets) ? payload.displayTargets : ["all"];
    if (targets.includes("all")) {
      targets = ["all"];
    }
    payload.displayTargets = targets;

    // Sanitize custom URLs
    if (Array.isArray(payload.customUrls)) {
      const sanitizedUrls: string[] = [];
      for (const rawUrl of payload.customUrls) {
        if (typeof rawUrl === "string" && rawUrl.trim()) {
          const trimmed = rawUrl.trim();
          // Check validity
          if (
            !trimmed.startsWith("/") ||
            trimmed.startsWith("//") ||
            trimmed.startsWith("/\\") ||
            trimmed.includes("://") ||
            trimmed.includes("*") ||
            trimmed.toLowerCase().startsWith("javascript:") ||
            trimmed.toLowerCase().startsWith("data:")
          ) {
            return { error: `Invalid custom URL "${trimmed}". Custom URLs must be exact internal paths starting with / (e.g. /sale, /collections/festive). Wildcards and external URLs are not permitted.` };
          }
          let normalized = trimmed.replace(/\/+$/, "");
          if (!normalized) normalized = "/";
          if (!sanitizedUrls.includes(normalized)) {
            sanitizedUrls.push(normalized);
          }
        }
      }
      payload.customUrls = sanitizedUrls;
    } else {
      payload.customUrls = [];
    }
  }

  if (sectionKey === "popup") {
    if (payload.redirectUrl && !isValidRedirectUrl(payload.redirectUrl)) {
      return { error: "Redirect URL must be a valid internal path (e.g. /shop) or HTTPS URL." };
    }
  }

  if (sectionKey === "shipping") {
    const rate = Number(payload.shippingRate);
    const threshold = Number(payload.freeShippingThreshold);
    if (isNaN(rate) || rate < 0) {
      return { error: "Shipping rate must be a valid non-negative number (₹0 or greater)." };
    }
    if (isNaN(threshold) || threshold < 0) {
      return { error: "Free shipping threshold must be a valid non-negative number (₹0 or greater)." };
    }
    payload.shippingRate = rate;
    payload.freeShippingThreshold = threshold;
  }

  const result = await updateSiteSectionContent(sectionKey, payload as any, adminId);

  if (!result.success) {
    return { error: result.error || "Failed to save content section." };
  }

  revalidatePath("/admin/content");
  revalidatePath("/checkout");
  revalidatePath("/about");
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/collections");
  revalidatePath("/search");

  return { success: true, message: "Changes saved successfully." };
}

export async function resetContentSectionAction(
  sectionKey: keyof SiteContentBundle,
): Promise<ContentActionState> {
  const adminId = await requireAdmin("/admin/content");

  const result = await resetSiteSectionContent(sectionKey, adminId);

  if (!result.success) {
    return { error: result.error || "Failed to reset content section." };
  }

  revalidatePath("/admin/content");
  revalidatePath("/checkout");
  revalidatePath("/about");
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/collections");
  revalidatePath("/search");

  return { success: true, message: "Section reset to default content." };
}

export async function uploadFounderImageAction(
  _prev: UploadFounderImageState,
  formData: FormData,
): Promise<UploadFounderImageState> {
  await requireAdmin("/admin/content");

  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) {
    return { error: "No file selected. Please choose an image to upload." };
  }

  const result = await uploadFounderImage(file);

  if (!result.success) {
    return { error: result.error };
  }

  return {
    success:   true,
    publicUrl: result.publicUrl,
    message:   "Founder portrait uploaded successfully.",
  };
}

export async function uploadPopupImageAction(
  _prev: UploadMarketingImageState,
  formData: FormData,
): Promise<UploadMarketingImageState> {
  await requireAdmin("/admin/content");

  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) {
    return { error: "No file selected. Please choose an image to upload." };
  }

  const result = await uploadMarketingImage(file);

  if (!result.success) {
    return { error: result.error };
  }

  return {
    success:   true,
    publicUrl: result.publicUrl,
    message:   "Popup advertisement image uploaded successfully.",
  };
}

export async function deletePopupImageAction(
  imageUrl: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin("/admin/content");

  if (!imageUrl) return { success: true };

  return deleteMarketingImage(imageUrl);
}
