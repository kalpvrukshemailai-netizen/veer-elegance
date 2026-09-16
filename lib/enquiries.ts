/**
 * VEER ELEGANCE — Enquiries Server Utilities
 *
 * Server-side functions for managing B2B, wholesale, and bulk enquiries.
 * Public users create enquiries via POST /api/enquiries.
 * Admin functions query and update status, guarded by requireAdmin().
 *
 * Never import this file directly into Client Components.
 */

import { createClient }            from "@/lib/supabase/server";
import { createAdminNotification } from "@/lib/notifications";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type EnquiryType =
  | "Wholesale"
  | "Bulk Purchase"
  | "Retailer"
  | "Reseller"
  | "Other";

export type EnquiryStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "closed";

export interface EnquiryRow {
  id:                string;
  full_name:         string;
  business_name:     string | null;
  email:             string;
  phone:             string;
  city:              string | null;
  country:           string | null;
  enquiry_type:      string;
  expected_quantity: number | null;
  message:           string;
  status:            EnquiryStatus;
  created_at:        string;
  updated_at:        string;
}

export interface CreateEnquiryInput {
  fullName:          string;
  businessName?:     string | null;
  email:             string;
  phone:             string;
  city?:             string | null;
  country?:          string | null;
  enquiryType:       EnquiryType | string;
  expectedQuantity?: number | null;
  message:           string;
}

export interface CreateEnquiryResult {
  success:   boolean;
  enquiryId?: string;
  error?:    string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC SUBMISSION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an enquiry record in Supabase and triggers an admin notification.
 * Works for both guest visitors and authenticated customers.
 */
export async function createEnquiry(
  input: CreateEnquiryInput,
): Promise<CreateEnquiryResult> {
  const supabase = await createClient();

  const fullName    = input.fullName?.trim() || "";
  const email       = input.email?.trim() || "";
  const phone       = input.phone?.trim() || "";
  const enquiryType = input.enquiryType?.trim() || "Wholesale";
  const message     = input.message?.trim() || "";

  if (!fullName || !email || !phone || !message) {
    return { success: false, error: "Please fill in all required fields." };
  }

  const enquiryId = crypto.randomUUID();

  const { error } = await supabase
    .from("enquiries")
    .insert({
      id:                enquiryId,
      full_name:         fullName,
      business_name:     input.businessName?.trim() || null,
      email:             email.toLowerCase(),
      phone:             phone,
      city:              input.city?.trim() || null,
      country:           input.country?.trim() || null,
      enquiry_type:      enquiryType,
      expected_quantity: input.expectedQuantity ? Number(input.expectedQuantity) : null,
      message:           message,
      status:            "new",
    });

  if (error) {
    console.error("[createEnquiry] Insert failed:", error.message);
    return { success: false, error: "Unable to submit enquiry. Please try again." };
  }

  // ── Admin Notification (Idempotent via unique constraint) ──────────────────
  try {
    await createAdminNotification({
      type:           "wholesale_enquiry",
      title:          "New enquiry received",
      message:        `${fullName} submitted a ${enquiryType} enquiry.`,
      reference_id:   enquiryId,
      reference_type: "enquiry",
    });
  } catch (err) {
    console.error("[createEnquiry] Notification failed:", err);
  }

  return { success: true, enquiryId };
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN READS
// Call only after requireAdmin() has verified the session.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all enquiries for the admin list, newest first.
 * Optionally filtered by status.
 */
export async function getAllEnquiries(
  statusFilter?: EnquiryStatus,
): Promise<EnquiryRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("enquiries")
    .select("*")
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getAllEnquiries]", error.message);
    return [];
  }

  return (data ?? []) as EnquiryRow[];
}

/**
 * Returns a single enquiry by UUID.
 * Admin-only.
 */
export async function getEnquiryById(id: string): Promise<EnquiryRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("enquiries")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("[getEnquiryById]", error?.message);
    return null;
  }

  return data as EnquiryRow;
}

/**
 * Updates status of an enquiry.
 * Admin-only.
 */
export async function updateEnquiryStatus(
  id: string,
  status: EnquiryStatus,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("enquiries")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[updateEnquiryStatus]", error.message);
    return { success: false, error: "Unable to update enquiry status." };
  }

  return { success: true };
}
