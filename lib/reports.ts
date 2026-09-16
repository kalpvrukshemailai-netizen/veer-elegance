/**
 * VEER ELEGANCE — Reports & Analytics Server Utilities
 *
 * All functions are server-side only.
 * Call only after requireAdmin() has verified the session.
 *
 * Revenue rule: exclude orders with status = 'cancelled'.
 * Included statuses: pending | confirmed | processing | shipped | delivered
 *
 * Structured for future CSV/PDF export without rewriting query logic —
 * each function returns typed, flat data suitable for both rendering and serialisation.
 */

import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/data/categories";

// ─────────────────────────────────────────────────────────────────────────────
// DATE RANGE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export type ReportPeriod =
  | "today"
  | "7days"
  | "30days"
  | "this_month"
  | "this_year"
  | "all_time"
  | "custom";

export interface DateRange {
  from: string;   // ISO timestamp string — inclusive
  to: string;   // ISO timestamp string — inclusive (end of day)
}

export function getPeriodRange(period: ReportPeriod, custom?: DateRange): DateRange {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");

  // End of today
  const endOfDay = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T23:59:59.999Z`;

  // Start of a day
  const startOfDay = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00:00.000Z`;

  if (period === "custom" && custom) return custom;

  if (period === "today") {
    return { from: startOfDay(now), to: endOfDay(now) };
  }

  if (period === "7days") {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    return { from: startOfDay(from), to: endOfDay(now) };
  }

  if (period === "30days") {
    const from = new Date(now);
    from.setDate(from.getDate() - 29);
    return { from: startOfDay(from), to: endOfDay(now) };
  }

  if (period === "this_month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: startOfDay(from), to: endOfDay(now) };
  }

  if (period === "this_year") {
    const from = new Date(now.getFullYear(), 0, 1);
    return { from: startOfDay(from), to: endOfDay(now) };
  }

  // all_time — epoch start
  return { from: "2024-01-01T00:00:00.000Z", to: endOfDay(now) };
}

/** Group label for a date, given the active period. */
export type ChartGrouping = "hour" | "day" | "month";

export function getGroupingForPeriod(period: ReportPeriod): ChartGrouping {
  if (period === "today") return "hour";
  if (period === "this_year" || period === "all_time") return "month";
  return "day";
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ReportSummary {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
}

export interface SalesDataPoint {
  label: string;   // "2026-08-22" or "Aug" or "14:00"
  revenue: number;
  orders: number;
}

export interface StatusBreakdown {
  status: string;
  count: number;
  revenue: number;
}

export interface TopProduct {
  product_name: string;
  product_slug: string | null;
  units_sold: number;
  revenue: number;
}

export interface CategoryPerformance {
  category: string;
  units_sold: number;
  revenue: number;
}

export interface RecentSaleRow {
  id: string;
  customer_email: string | null;
  created_at: string;
  status: string;
  total_amount: number;
  currency: string;
  item_count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

export async function getReportSummary(range: DateRange): Promise<ReportSummary> {
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("status, total_amount")
    .gte("created_at", range.from)
    .lte("created_at", range.to);

  if (error || !orders) {
    console.error("[getReportSummary]", error?.message);
    return { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, pendingOrders: 0, deliveredOrders: 0, cancelledOrders: 0 };
  }

  let totalRevenue = 0;
  let revenueCount = 0;
  let pendingOrders = 0;
  let deliveredOrders = 0;
  let cancelledOrders = 0;

  for (const o of orders) {
    if (o.status !== "cancelled") {
      totalRevenue += Number(o.total_amount) || 0;
      revenueCount++;
    }
    if (o.status === "pending") pendingOrders++;
    if (o.status === "delivered") deliveredOrders++;
    if (o.status === "cancelled") cancelledOrders++;
  }

  return {
    totalRevenue,
    totalOrders: orders.length,
    avgOrderValue: revenueCount > 0 ? totalRevenue / revenueCount : 0,
    pendingOrders,
    deliveredOrders,
    cancelledOrders,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SALES OVER TIME
// ─────────────────────────────────────────────────────────────────────────────

export async function getSalesOverTime(
  range: DateRange,
  grouping: ChartGrouping,
): Promise<SalesDataPoint[]> {
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("created_at, total_amount, status")
    .gte("created_at", range.from)
    .lte("created_at", range.to)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });

  if (error || !orders) {
    console.error("[getSalesOverTime]", error?.message);
    return [];
  }

  // Build a map: label → { revenue, orders }
  const map = new Map<string, { revenue: number; orders: number }>();

  for (const o of orders) {
    const date = new Date(o.created_at);
    let label = "";

    if (grouping === "hour") {
      label = `${String(date.getUTCHours()).padStart(2, "0")}:00`;
    } else if (grouping === "day") {
      label = date.toISOString().slice(0, 10); // YYYY-MM-DD
    } else {
      label = date.toISOString().slice(0, 7);  // YYYY-MM
    }

    const existing = map.get(label) ?? { revenue: 0, orders: 0 };
    map.set(label, {
      revenue: existing.revenue + (Number(o.total_amount) || 0),
      orders: existing.orders + 1,
    });
  }

  // Fill in zero-value buckets across the full range
  const buckets = generateBuckets(range, grouping);
  return buckets.map(label => {
    const entry = map.get(label);
    return { label, revenue: entry?.revenue ?? 0, orders: entry?.orders ?? 0 };
  });
}

/** Generate all expected bucket labels for the range, so gaps show as 0. */
function generateBuckets(range: DateRange, grouping: ChartGrouping): string[] {
  const buckets: string[] = [];
  const from = new Date(range.from);
  const to = new Date(range.to);

  if (grouping === "hour") {
    for (let h = 0; h < 24; h++) {
      buckets.push(`${String(h).padStart(2, "0")}:00`);
    }
    return buckets;
  }

  if (grouping === "day") {
    const cur = new Date(from);
    cur.setUTCHours(0, 0, 0, 0);
    while (cur <= to) {
      buckets.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return buckets;
  }

  // month grouping
  const cur = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cur <= to) {
    buckets.push(cur.toISOString().slice(0, 7));
    cur.setMonth(cur.getMonth() + 1);
  }
  return buckets;
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER STATUS BREAKDOWN
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrderStatusBreakdown(range: DateRange): Promise<StatusBreakdown[]> {
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("status, total_amount")
    .gte("created_at", range.from)
    .lte("created_at", range.to);

  if (error || !orders) {
    console.error("[getOrderStatusBreakdown]", error?.message);
    return [];
  }

  const statuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
  const map = new Map<string, { count: number; revenue: number }>();

  for (const s of statuses) map.set(s, { count: 0, revenue: 0 });

  for (const o of orders) {
    const existing = map.get(o.status) ?? { count: 0, revenue: 0 };
    map.set(o.status, {
      count: existing.count + 1,
      revenue: existing.revenue + (o.status !== "cancelled" ? (Number(o.total_amount) || 0) : 0),
    });
  }

  return statuses.map(s => ({
    status: s,
    count: map.get(s)?.count ?? 0,
    revenue: map.get(s)?.revenue ?? 0,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// BEST-SELLING PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────

export async function getTopProducts(range: DateRange, limit = 5): Promise<TopProduct[]> {
  const supabase = await createClient();

  // ── Step 1: get eligible order IDs in range (exclude cancelled) ───────────
  const { data: eligibleOrders, error: ordersErr } = await supabase
    .from("orders")
    .select("id")
    .gte("created_at", range.from)
    .lte("created_at", range.to)
    .neq("status", "cancelled");

  if (ordersErr) { console.error("[getTopProducts:orders]", ordersErr.message); return []; }
  if (!eligibleOrders || eligibleOrders.length === 0) return [];

  const orderIds = eligibleOrders.map(o => o.id as string);

  // ── Step 2: fetch order_items for those orders ────────────────────────────
  // order_items.order_id → orders.id FK exists, so .in() is safe.
  const { data: items, error: itemsErr } = await supabase
    .from("order_items")
    .select("product_name, product_slug, quantity, line_total")
    .in("order_id", orderIds);

  if (itemsErr) { console.error("[getTopProducts:items]", itemsErr.message); return []; }
  if (!items || items.length === 0) return [];

  // ── Step 3: aggregate by product name in JS ───────────────────────────────
  const map = new Map<string, { slug: string | null; units: number; revenue: number }>();

  for (const item of items) {
    const name = (item.product_name as string | null) ?? "Unknown Product";
    const slug = item.product_slug as string | null;
    const qty = Number(item.quantity) || 0;
    const rev = Number(item.line_total) || 0;

    const existing = map.get(name) ?? { slug, units: 0, revenue: 0 };
    map.set(name, { slug: existing.slug ?? slug, units: existing.units + qty, revenue: existing.revenue + rev });
  }

  return Array.from(map.entries())
    .map(([name, v]) => ({
      product_name: name,
      product_slug: v.slug,
      units_sold: v.units,
      revenue: v.revenue,
    }))
    .sort((a, b) => b.units_sold - a.units_sold)
    .slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY PERFORMANCE
// ─────────────────────────────────────────────────────────────────────────────

export async function getCategoryPerformance(range: DateRange): Promise<CategoryPerformance[]> {
  const supabase = await createClient();

  const ALL_CATEGORIES = CATEGORIES.map(c => c.id);
  const map = new Map<string, { units: number; revenue: number }>();
  for (const c of ALL_CATEGORIES) map.set(c, { units: 0, revenue: 0 });

  // ── Step 1: get eligible order IDs in range (exclude cancelled) ───────────
  const { data: eligibleOrders, error: ordersErr } = await supabase
    .from("orders")
    .select("id")
    .gte("created_at", range.from)
    .lte("created_at", range.to)
    .neq("status", "cancelled");

  if (ordersErr) { console.error("[getCategoryPerformance:orders]", ordersErr.message); return ALL_CATEGORIES.map(c => ({ category: c, units_sold: 0, revenue: 0 })); }
  if (!eligibleOrders || eligibleOrders.length === 0) return ALL_CATEGORIES.map(c => ({ category: c, units_sold: 0, revenue: 0 }));

  const orderIds = eligibleOrders.map(o => o.id as string);

  // ── Step 2: fetch order_items for those orders ────────────────────────────
  const { data: items, error: itemsErr } = await supabase
    .from("order_items")
    .select("product_slug, quantity, line_total")
    .in("order_id", orderIds);

  if (itemsErr) { console.error("[getCategoryPerformance:items]", itemsErr.message); return ALL_CATEGORIES.map(c => ({ category: c, units_sold: 0, revenue: 0 })); }
  if (!items || items.length === 0) return ALL_CATEGORIES.map(c => ({ category: c, units_sold: 0, revenue: 0 }));

  // ── Step 3: build slug → category map from live products table ───────────
  // No FK exists between order_items and products, so we query separately.
  const slugs = [...new Set(items.map(i => i.product_slug as string | null).filter(Boolean))] as string[];

  const slugCategoryMap = new Map<string, string>();

  if (slugs.length > 0) {
    const { data: prods, error: prodsErr } = await supabase
      .from("products")
      .select("slug, category")
      .in("slug", slugs);

    if (!prodsErr && prods) {
      for (const p of prods) {
        slugCategoryMap.set(p.slug as string, p.category as string);
      }
    }
  }

  // ── Step 4: aggregate in JS ───────────────────────────────────────────────
  for (const item of items) {
    const slug = item.product_slug as string | null;
    // Prefer live product category from the slug→category map
    let category = slug ? slugCategoryMap.get(slug) ?? null : null;

    // Fallback: slug prefix heuristic for historical items whose product no longer exists
    if (!category && slug) {
      if (slug.startsWith("chain")) category = "chains";
      else if (slug.startsWith("ring")) category = "rings";
      else if (slug.startsWith("ear")) category = "earrings";
      else if (slug.startsWith("brac")) category = "bracelets";
    }

    if (!category) continue;

    const existing = map.get(category) ?? { units: 0, revenue: 0 };
    map.set(category, {
      units: existing.units + (Number(item.quantity) || 0),
      revenue: existing.revenue + (Number(item.line_total) || 0),
    });
  }

  return ALL_CATEGORIES.map(c => ({
    category: c,
    units_sold: map.get(c)?.units ?? 0,
    revenue: map.get(c)?.revenue ?? 0,
  })).sort((a, b) => b.revenue - a.revenue);
}

// ─────────────────────────────────────────────────────────────────────────────
// RECENT SALES
// ─────────────────────────────────────────────────────────────────────────────

export async function getRecentSales(limit = 8): Promise<RecentSaleRow[]> {
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
    console.error("[getRecentSales]", error?.message);
    return [];
  }

  return data.map(row => ({
    id: row.id as string,
    customer_email: row.customer_email as string | null,
    created_at: row.created_at as string,
    status: row.status as string,
    total_amount: Number(row.total_amount) || 0,
    currency: (row.currency as string) ?? "INR",
    item_count: Array.isArray(row.order_items) ? row.order_items.length : 0,
  }));
}
