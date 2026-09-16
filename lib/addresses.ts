/**
 * VEER ELEGANCE — Address Server Utilities
 *
 * Server-side only — never import from Client Components.
 * All operations scope to the authenticated user's own addresses.
 * user_id is ALWAYS derived from the server session — never from the client.
 */

import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface AddressRow {
  id:          string;
  user_id:     string;
  label:       string | null;
  first_name:  string;
  last_name:   string;
  phone:       string;
  address:     string;
  apartment:   string | null;
  city:        string;
  state:       string;
  postal_code: string;
  country:     string;
  is_default:  boolean;
  created_at:  string;
  updated_at:  string;
}

export interface AddressInput {
  label?:       string;
  first_name:   string;
  last_name:    string;
  phone:        string;
  address:      string;
  apartment?:   string;
  city:         string;
  state:        string;
  postal_code:  string;
  country:      string;
  is_default?:  boolean;
}

export interface AddressResult {
  success: true;
  address: AddressRow;
}

export interface AddressError {
  success: false;
  error:   string;
}

// ─────────────────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────────────────

/** Returns all addresses for the authenticated user (default first). */
export async function getUserAddresses(): Promise<AddressRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at",  { ascending: false });

  if (error) {
    console.error("[getUserAddresses]", error.message);
    return [];
  }
  return (data ?? []) as AddressRow[];
}

/** Returns a single address — null if not found or not owned by the user. */
export async function getUserAddressById(id: string): Promise<AddressRow | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return null;
  return data as AddressRow;
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────

export async function createAddress(
  input: AddressInput,
): Promise<AddressResult | AddressError> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const { data, error } = await supabase
    .from("addresses")
    .insert({
      user_id:     user.id,
      label:       input.label?.trim()      || null,
      first_name:  input.first_name.trim(),
      last_name:   input.last_name.trim(),
      phone:       input.phone.trim(),
      address:     input.address.trim(),
      apartment:   input.apartment?.trim()  || null,
      city:        input.city.trim(),
      state:       input.state.trim(),
      postal_code: input.postal_code.trim(),
      country:     input.country.trim()     || "India",
      is_default:  input.is_default ?? false,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[createAddress]", {
      message: error.message,
      code:    (error as { code?: string }).code,
    });
    return { success: false, error: "Unable to save address. Please try again." };
  }
  return { success: true, address: data as AddressRow };
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────

export async function updateAddress(
  id:    string,
  input: Partial<AddressInput>,
): Promise<AddressResult | AddressError> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const payload: Record<string, unknown> = {};
  if (input.label       !== undefined) payload.label       = input.label?.trim()      || null;
  if (input.first_name  !== undefined) payload.first_name  = input.first_name.trim();
  if (input.last_name   !== undefined) payload.last_name   = input.last_name.trim();
  if (input.phone       !== undefined) payload.phone       = input.phone.trim();
  if (input.address     !== undefined) payload.address     = input.address.trim();
  if (input.apartment   !== undefined) payload.apartment   = input.apartment?.trim() || null;
  if (input.city        !== undefined) payload.city        = input.city.trim();
  if (input.state       !== undefined) payload.state       = input.state.trim();
  if (input.postal_code !== undefined) payload.postal_code = input.postal_code.trim();
  if (input.country     !== undefined) payload.country     = input.country.trim()     || "India";
  if (input.is_default  !== undefined) payload.is_default  = input.is_default;

  const { data, error } = await supabase
    .from("addresses")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    console.error("[updateAddress]", error.message);
    return { success: false, error: "Unable to update address. Please try again." };
  }
  return { success: true, address: data as AddressRow };
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteAddress(
  id: string,
): Promise<{ success: true } | AddressError> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const { error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[deleteAddress]", error.message);
    return { success: false, error: "Unable to delete address." };
  }
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// SET DEFAULT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Marks an address as the user's default.
 * The DB trigger enforce_single_default_address automatically clears
 * is_default on all other addresses for the same user.
 */
export async function setDefaultAddress(
  id: string,
): Promise<{ success: true } | AddressError> {
  const result = await updateAddress(id, { is_default: true });
  if (!result.success) return result;
  return { success: true };
}
