/**
 * VEER ELEGANCE — Admin Server Utilities
 *
 * All functions run on the server only (Server Components / Route Handlers).
 * Role is read from public.profiles — never from client-supplied data.
 * Do not import this in Client Components.
 */

import { redirect }     from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = "customer" | "admin";

export interface AdminOverview {
  totalOrders:   number;
  pendingOrders: number;
  totalRevenue:  number;          // sum of total_amount on all confirmed/non-cancelled orders
  totalCustomers:number;
  currency:      string;
}

export interface RecentOrderRow {
  id:             string;
  customer_email: string | null;
  created_at:     string;
  status:         string;
  total_amount:   number;
  currency:       string;
  item_count:     number;         // resolved from order_items aggregate
}

// ─────────────────────────────────────────────────────────────────────────────
// ROLE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the role of the currently authenticated user, or null if not
 * authenticated or profile doesn't exist yet.
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  return (data.role as UserRole) ?? "customer";
}

/**
 * Guard for admin Server Components.
 *
 * - Not authenticated          → redirect /login?next=<callbackUrl>
 * - Authenticated but customer → redirect /
 * - Admin                      → returns the authenticated user id
 *
 * Usage (top of a server page):
 *   await requireAdmin("/admin");
 */
export async function requireAdmin(callbackUrl = "/admin"): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(callbackUrl)}`);
  }

  const role = await getCurrentUserRole();

  if (role !== "admin") {
    // Redirect customers silently — don't reveal admin route exists
    redirect("/");
  }

  return user.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD METRICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches real overview numbers for the admin dashboard.
 * Uses the server client — RLS still applies, but admin can see all
 * profiles (via the service role or via a future admin policy).
 *
 * NOTE: Because we're using the anon key + RLS, counts are currently
 * restricted by the user's own session. To read ALL orders/profiles,
 * a service-role client or an admin-role RLS policy bypass is needed.
 * For now we use Postgres aggregate functions safely via RPC or direct
 * queries through the admin's own session — the dashboard is server-only.
 *
 * Phase 1: queries that work with existing RLS (session-based totals).
 * Future: add service-role route handler for cross-user admin reads.
 */
export async function getAdminOverview(): Promise<AdminOverview> {
  const supabase = await createClient();

  // ── Total orders ────────────────────────────────────────────────────
  // count=exact via Prefer header is fastest
  const { count: totalOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true });

  // ── Pending orders ──────────────────────────────────────────────────
  const { count: pendingOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  // ── Revenue — sum of total_amount, exclude cancelled ────────────────
  const { data: revenueRows } = await supabase
    .from("orders")
    .select("total_amount")
    .neq("status", "cancelled");

  const totalRevenue = (revenueRows ?? []).reduce(
    (sum, r) => sum + (Number(r.total_amount) || 0),
    0,
  );

  // ── Total customer profiles ─────────────────────────────────────────
  const { count: totalCustomers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "customer");

  return {
    totalOrders:    totalOrders    ?? 0,
    pendingOrders:  pendingOrders  ?? 0,
    totalRevenue,
    totalCustomers: totalCustomers ?? 0,
    currency:       "INR",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RECENT ORDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the N most recent orders with a resolved item count.
 * Admin-only — call only after requireAdmin() succeeds.
 */
export async function getRecentOrders(limit = 10): Promise<RecentOrderRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      customer_email,
      created_at,
      status,
      total_amount,
      currency,
      order_items ( id )
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("[getRecentOrders]", error?.message);
    return [];
  }

  return data.map(row => ({
    id:             row.id as string,
    customer_email: row.customer_email as string | null,
    created_at:     row.created_at as string,
    status:         row.status as string,
    total_amount:   Number(row.total_amount) || 0,
    currency:       (row.currency as string) ?? "INR",
    item_count:     Array.isArray(row.order_items) ? row.order_items.length : 0,
  }));
}
