"use server";

/**
 * VEER ELEGANCE — Product Server Actions
 *
 * All mutations (create, update, archive, toggle) run through
 * Next.js Server Actions. Every action re-verifies admin role
 * server-side before executing — never trusts client data.
 *
 * FIX (2026-08-23):
 * createProductAction and updateProductAction no longer call redirect()
 * from inside a useActionState-dispatched server action.
 * redirect() inside useActionState throws NEXT_REDIRECT which React's
 * action machinery cannot intercept — it silently resets state and
 * drops the user at the top of the page with no error shown.
 *
 * Instead, actions return { success: true, id } and the client component
 * handles navigation via useRouter.
 */

import { revalidatePath } from "next/cache";
import { requireAdmin }  from "@/lib/admin";
import {
  createProduct,
  updateProduct,
  archiveProduct,
  setProductPublished,
  setProductCategories,
  type ProductInput,
  type ProductCategory,
} from "@/lib/products-db";
import { isValidCategoryId } from "@/data/categories";

// ─────────────────────────────────────────────────────────────────────────────
// STATE TYPE
// ─────────────────────────────────────────────────────────────────────────────

export type ActionState = {
  error?:       string;
  fieldErrors?: Record<string, string>;
  success?:    boolean;
  id?:         string;   // product UUID on successful create/update — used by client for redirect
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function parseFormData(fd: FormData): {
  productInput:    ProductInput;
  categories:      string[];
  primaryCategory: ProductCategory;
} {
  const raw = (key: string) => (fd.get(key) as string | null) ?? "";

  const priceStr = raw("price").trim();
  const price    = priceStr !== "" && !isNaN(parseFloat(priceStr))
    ? parseFloat(priceStr)
    : null;

  const mrpStr   = raw("mrp").trim();
  const mrp      = mrpStr !== "" && !isNaN(parseFloat(mrpStr))
    ? parseFloat(mrpStr)
    : null;

  const displayOrderStr = raw("display_order").trim();
  const displayOrder = displayOrderStr !== "" && !isNaN(parseInt(displayOrderStr, 10))
    ? parseInt(displayOrderStr, 10)
    : 999;

  // Extract selected categories (from checkboxes)
  const submittedCategories = fd.getAll("categories")
    .map(c => String(c).trim())
    .filter(isValidCategoryId);

  const primaryCategoryRaw = raw("primary_category").trim() || raw("category").trim();
  const primaryCategory = (isValidCategoryId(primaryCategoryRaw)
    ? primaryCategoryRaw
    : submittedCategories[0] || "") as ProductCategory;

  return {
    categories: submittedCategories,
    primaryCategory,
    productInput: {
      slug:              raw("slug").trim().toLowerCase().replace(/\s+/g, "-"),
      name:              raw("name").trim(),
      category:          primaryCategory,
      price,
      mrp,
      currency:          raw("currency").trim() || "INR",
      short_description: raw("short_description").trim() || null,
      description:       raw("description").trim() || null,
      material:               raw("material").trim() || null,
      show_care_instructions: fd.getAll("show_care_instructions").includes("true"),
      anti_tarnish:           fd.getAll("anti_tarnish").includes("true"),
      featured:               fd.getAll("featured").includes("true"),
      published:              fd.getAll("published").includes("true"),
      image_url:              null,
      display_order:          displayOrder,
    },
  };
}

/**
 * Validates input and returns per-field errors + a summary, or null.
 */
function validateInput(
  input: ProductInput,
  categories: string[],
  primaryCategory: string,
): ActionState | null {
  const fieldErrors: Record<string, string> = {};

  if (!input.name.trim())
    fieldErrors.name = "Product name is required.";

  if (!input.slug.trim()) {
    fieldErrors.slug = "Slug is required.";
  } else if (!/^[a-z0-9-]+$/.test(input.slug)) {
    fieldErrors.slug = "Slug must be lowercase letters, numbers, and hyphens only.";
  }

  if (categories.length === 0) {
    fieldErrors.categories = "At least one category is required.";
  }

  if (!primaryCategory || !categories.includes(primaryCategory)) {
    fieldErrors.primary_category = "Primary category must be one of the selected categories.";
  }

  // Selling Price validations
  if (input.price !== null) {
    if (isNaN(input.price) || input.price < 0) {
      fieldErrors.price = "Selling price cannot be negative.";
    }
  }

  if (input.published) {
    if (input.price === null || input.price <= 0) {
      fieldErrors.price = "Selling price must be greater than ₹0 when publishing.";
    }
  }

  // MRP validations
  if (input.mrp !== null) {
    if (isNaN(input.mrp) || input.mrp <= 0) {
      fieldErrors.mrp = "MRP must be greater than ₹0.";
    }
  }

  // MRP vs Selling Price validation
  if (input.mrp !== null && input.price !== null && !isNaN(input.mrp) && !isNaN(input.price)) {
    if (input.mrp < input.price) {
      fieldErrors.mrp = "MRP must be greater than or equal to selling price.";
    }
  }

  if (Object.keys(fieldErrors).length === 0) return null;

  return {
    error:       "Please fix the highlighted fields before saving.",
    fieldErrors,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE PRODUCT
// ─────────────────────────────────────────────────────────────────────────────

export async function createProductAction(
  _prev:    ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin("/admin/products/new");

  const { productInput, categories, primaryCategory } = parseFormData(formData);

  const validationState = validateInput(productInput, categories, primaryCategory);
  if (validationState) return validationState;

  let result;
  try {
    result = await createProduct(productInput);
  } catch (err) {
    console.error("[createProductAction] unexpected error:", err);
    return { error: "An unexpected error occurred. Please try again." };
  }

  if (!result.success) {
    console.error("[createProductAction] Supabase error:", result.error);
    if (result.error.includes("already exists") || result.error.includes("23505")) {
      return {
        error: "A product with that slug already exists. Choose a different slug.",
        fieldErrors: { slug: "This slug is already taken." },
      };
    }
    return { error: result.error };
  }

  // Sync multi-category assignments
  try {
    await setProductCategories(result.id, categories);
  } catch (err) {
    console.error("[createProductAction:setProductCategories] error:", err);
  }

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/collections");
  for (const cat of categories) {
    revalidatePath(`/shop/${cat}`);
  }

  return { success: true, id: result.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PRODUCT
// ─────────────────────────────────────────────────────────────────────────────

export async function updateProductAction(
  id:       string,
  _prev:    ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin(`/admin/products/${id}/edit`);

  const { productInput, categories, primaryCategory } = parseFormData(formData);

  const validationState = validateInput(productInput, categories, primaryCategory);
  if (validationState) return validationState;

  // Exclude image_url — managed exclusively by the upload system
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { image_url: _imageUrl, ...updatePayload } = productInput;

  let result;
  try {
    result = await updateProduct(id, updatePayload);
  } catch (err) {
    console.error("[updateProductAction] unexpected error:", err);
    return { error: "An unexpected error occurred. Please try again." };
  }

  if (!result.success) {
    console.error("[updateProductAction] Supabase error:", result.error);
    if (result.error.includes("already exists") || result.error.includes("23505")) {
      return {
        error: "A product with that slug already exists. Choose a different slug.",
        fieldErrors: { slug: "This slug is already taken." },
      };
    }
    return { error: result.error };
  }

  // Sync multi-category assignments
  try {
    await setProductCategories(id, categories);
  } catch (err) {
    console.error("[updateProductAction:setProductCategories] error:", err);
  }

  revalidatePath("/admin/products");
  revalidatePath(`/product/${productInput.slug}`);
  revalidatePath("/shop");
  revalidatePath("/collections");
  for (const cat of categories) {
    revalidatePath(`/shop/${cat}`);
  }

  // Return id so client can show a success state (edit page stays open).
  return { success: true, id };
}

// ─────────────────────────────────────────────────────────────────────────────
// ARCHIVE PRODUCT
// ─────────────────────────────────────────────────────────────────────────────

export async function archiveProductAction(
  id: string,
): Promise<ActionState> {
  await requireAdmin("/admin/products");

  const result = await archiveProduct(id);
  if (!result.success) return { error: result.error };

  revalidatePath("/admin/products");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// TOGGLE PUBLISHED
// ─────────────────────────────────────────────────────────────────────────────

export async function togglePublishedAction(
  id:        string,
  published: boolean,
): Promise<ActionState> {
  await requireAdmin("/admin/products");

  const result = await setProductPublished(id, published);
  if (!result.success) return { error: result.error };

  revalidatePath("/admin/products");
  return { success: true };
}
