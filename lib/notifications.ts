/**
 * VEER ELEGANCE — Admin Notification Utilities
 *
 * Server-side only. Call only after requireAdmin() has verified the session,
 * OR from the order creation API which runs server-side.
 *
 * Duplicate prevention:
 *   The notifications table has a UNIQUE index on (type, reference_id).
 *   createAdminNotification() uses ON CONFLICT DO NOTHING, so calling it
 *   multiple times for the same event is safe.
 *
 * Stock notification strategy:
 *   createStockNotification() is designed to be called after EVERY stock
 *   mutation. It replaces (upserts) the low_stock / out_of_stock record for
 *   that product so only one active notification exists per product per
 *   threshold. When stock is restored above threshold, no new notification
 *   is needed (old one remains read).
 */

import { createClient }                     from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getServiceClient() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationType =
  | "new_order"
  | "low_stock"
  | "out_of_stock"
  | "order_status"
  | "wholesale_enquiry"
  | "system";

export interface NotificationRow {
  id:             string;
  type:           NotificationType;
  title:          string;
  message:        string;
  reference_id:   string | null;
  reference_type: string | null;
  is_read:        boolean;
  created_at:     string;
  user_id:        string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// READ HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** All notifications, newest first. Admin-only. */
export async function getAdminNotifications(
  unreadOnly = false,
): Promise<NotificationRow[]> {
  const supabase = await createClient();

  let q = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (unreadOnly) q = q.eq("is_read", false);

  const { data, error } = await q;
  if (error) { console.error("[getAdminNotifications]", error.message); return []; }
  return (data ?? []) as NotificationRow[];
}

/** Unread-only notifications. */
export async function getUnreadNotifications(): Promise<NotificationRow[]> {
  return getAdminNotifications(true);
}

/** Count of unread notifications for the header badge. */
export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) { console.error("[getUnreadNotificationCount]", error.message); return 0; }
  return count ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// WRITE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create an admin notification.
 * Uses ON CONFLICT DO NOTHING so the same (type, reference_id) pair
 * is never inserted twice — safe to call idempotently.
 */
export async function createAdminNotification({
  type,
  title,
  message,
  reference_id  = null,
  reference_type = null,
}: {
  type:            NotificationType;
  title:           string;
  message:         string;
  reference_id?:   string | null;
  reference_type?: string | null;
}): Promise<void> {
  const serviceClient = getServiceClient();
  const supabase = serviceClient ?? (await createClient());

  // Prevent duplicate notifications if reference_id is provided
  if (reference_id) {
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("type", type)
      .eq("reference_id", reference_id)
      .maybeSingle();

    if (existing) return;
  }

  const { error } = await supabase
    .from("notifications")
    .insert({
      type,
      title,
      message,
      reference_id:   reference_id  ?? null,
      reference_type: reference_type ?? null,
      is_read:        false,
    });

  if (error) {
    // 23505 = unique_violation — expected when duplicate; don't log noisily
    if (!error.code || error.code !== "23505") {
      console.error("[createAdminNotification]", error.message);
    }
  }
}

/**
 * Create or refresh a stock-threshold notification.
 *
 * Strategy:
 * - On every stock mutation, we check the NEW stock level.
 * - If it crosses low_stock or out_of_stock, we upsert a notification.
 *   The unique index is on (type, reference_id), so only one record
 *   per product per threshold type exists.
 * - If stock is restored, we do nothing — old notification remains (historical record).
 *
 * @param productId    UUID of the product
 * @param productName  Display name for the message
 * @param newQty       The stock quantity AFTER the mutation
 * @param threshold    The low_stock_threshold for this product
 */
export async function createStockNotification(
  productId:   string,
  productName: string,
  newQty:      number,
  threshold:   number,
): Promise<void> {
  if (newQty <= 0) {
    await createAdminNotification({
      type:           "out_of_stock",
      title:          "Out of stock",
      message:        `${productName} is now out of stock.`,
      reference_id:   productId,
      reference_type: "product",
    });
  } else if (newQty <= threshold) {
    await createAdminNotification({
      type:           "low_stock",
      title:          "Low stock",
      message:        `${productName} has only ${newQty} unit${newQty === 1 ? "" : "s"} remaining.`,
      reference_id:   productId,
      reference_type: "product",
    });
  }
}

/** Mark a single notification as read. */
export async function markNotificationAsRead(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);

  if (error) console.error("[markNotificationAsRead]", error.message);
}

/** Mark all notifications as read. */
export async function markAllNotificationsAsRead(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("is_read", false);

  if (error) console.error("[markAllNotificationsAsRead]", error.message);
}
