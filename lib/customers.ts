/**
 * VEER ELEGANCE — Customer Management Utilities
 *
 * Server-side only. Call only after requireAdmin() has verified the session.
 *
 * Revenue rule: total spend excludes cancelled orders (consistent with reports).
 */

import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface CustomerRow {
  id:          string;
  first_name:  string | null;
  last_name:   string | null;
  email:       string | null;   // resolved from auth.users via profiles join
  created_at:  string;
  order_count: number;
  total_spend: number;
  latest_order_at: string | null;
}

export interface CustomerDetail {
  id:          string;
  first_name:  string | null;
  last_name:   string | null;
  email:       string | null;
  created_at:  string;
  order_count: number;
  total_spend: number;
  latest_order_at: string | null;
  orders:      CustomerOrderRow[];
}

export interface CustomerOrderRow {
  id:          string;
  created_at:  string;
  status:      string;
  total_amount:number;
  currency:    string;
  item_count:  number;
}

export type CustomerFilter = "all" | "with_orders" | "without_orders";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function fullName(first: string | null, last: string | null): string {
  return [first, last].filter(Boolean).join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER LIST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all customer profiles with aggregated order metrics.
 *
 * Strategy: two queries joined in JS.
 * 1. Fetch all profiles with role = 'customer'.
 * 2. Fetch all non-cancelled orders (aggregated per user).
 * This avoids PostgREST relationship assumptions on profiles → orders.
 */
export async function getCustomers(
  filter: CustomerFilter = "all",
  search = "",
): Promise<CustomerRow[]> {
  const supabase = await createClient();

  // ── Step 1: fetch customer profiles ──────────────────────────────────────
  const { data: profiles, error: profileErr } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, created_at")
    .eq("role", "customer")
    .order("created_at", { ascending: false });

  if (profileErr || !profiles) {
    console.error("[getCustomers:profiles]", profileErr?.message);
    return [];
  }

  // ── Step 2: fetch all orders (group by user_id in JS) ─────────────────────
  const { data: orders, error: ordersErr } = await supabase
    .from("orders")
    .select("user_id, total_amount, status, created_at, customer_email");

  if (ordersErr) {
    console.error("[getCustomers:orders]", ordersErr.message);
  }

  // Build user_id → order stats map
  type OrderStats = {
    count:        number;
    spend:        number;
    latest_at:    string | null;
    email:        string | null;
  };
  const statsMap = new Map<string, OrderStats>();

  for (const o of (orders ?? [])) {
    const uid = o.user_id as string | null;
    if (!uid) continue;
    const existing = statsMap.get(uid) ?? { count: 0, spend: 0, latest_at: null, email: null };
    statsMap.set(uid, {
      count:     existing.count + 1,
      spend:     existing.spend + (o.status !== "cancelled" ? (Number(o.total_amount) || 0) : 0),
      latest_at: !existing.latest_at || o.created_at > existing.latest_at
        ? (o.created_at as string)
        : existing.latest_at,
      email:     existing.email ?? (o.customer_email as string | null),
    });
  }

  // ── Step 3: assemble rows ─────────────────────────────────────────────────
  let rows: CustomerRow[] = profiles.map(p => {
    const stats = statsMap.get(p.id as string);
    return {
      id:          p.id as string,
      first_name:  p.first_name as string | null,
      last_name:   p.last_name  as string | null,
      email:       stats?.email ?? null,
      created_at:  p.created_at as string,
      order_count: stats?.count   ?? 0,
      total_spend: stats?.spend   ?? 0,
      latest_order_at: stats?.latest_at ?? null,
    };
  });

  // ── Step 4: apply filter ──────────────────────────────────────────────────
  if (filter === "with_orders")    rows = rows.filter(r => r.order_count > 0);
  if (filter === "without_orders") rows = rows.filter(r => r.order_count === 0);

  // ── Step 5: apply search ──────────────────────────────────────────────────
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    rows = rows.filter(r =>
      fullName(r.first_name, r.last_name).toLowerCase().includes(q) ||
      (r.email ?? "").toLowerCase().includes(q),
    );
  }

  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER DETAIL
// ─────────────────────────────────────────────────────────────────────────────

export async function getCustomerById(id: string): Promise<CustomerDetail | null> {
  const supabase = await createClient();

  // ── Profile ───────────────────────────────────────────────────────────────
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, created_at, role")
    .eq("id", id)
    .eq("role", "customer")
    .single();

  if (profileErr || !profile) return null;

  // ── Orders for this customer ─────────────────────────────────────────────
  const { data: orders, error: ordersErr } = await supabase
    .from("orders")
    .select("id, created_at, status, total_amount, currency, customer_email, order_items(id)")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  if (ordersErr) console.error("[getCustomerById:orders]", ordersErr.message);

  const orderRows: CustomerOrderRow[] = (orders ?? []).map(o => ({
    id:           o.id as string,
    created_at:   o.created_at as string,
    status:       o.status as string,
    total_amount: Number(o.total_amount) || 0,
    currency:     (o.currency as string) ?? "INR",
    item_count:   Array.isArray(o.order_items) ? o.order_items.length : 0,
  }));

  const email     = (orders?.[0] as { customer_email?: string | null } | undefined)?.customer_email ?? null;
  const totalSpend = orderRows
    .filter(o => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total_amount, 0);
  const latestAt  = orderRows[0]?.created_at ?? null;

  return {
    id:          profile.id as string,
    first_name:  profile.first_name as string | null,
    last_name:   profile.last_name  as string | null,
    email,
    created_at:  profile.created_at as string,
    order_count: orderRows.length,
    total_spend: totalSpend,
    latest_order_at: latestAt,
    orders:      orderRows,
  };
}
