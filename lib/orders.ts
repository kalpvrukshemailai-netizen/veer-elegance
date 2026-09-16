/**
 * VEER ELEGANCE — Order Utilities
 *
 * Server-side functions for creating and reading orders.
 * All functions use the Supabase server client (never the browser client).
 * Never called from Client Components directly.
 *
 * Order totals are calculated from the verified product catalog.
 * The client never submits totals — they are always derived server-side.
 */

import { createClient }      from "@/lib/supabase/server";
import type { CartItem, CartBundleInfo }     from "@/lib/cart";
import type { CustomerInformation, ShippingAddress, DeliveryMethodId } from "@/data/checkout";
import { DELIVERY_METHODS }  from "@/data/checkout";
import { calculateShipping } from "@/lib/shipping";
import { getShippingConfig } from "@/lib/site-content";
import { validateAndCalculateCouponServer, normalizeCouponCode } from "@/lib/coupons";
import { validateCompleteTheLookBundle } from "@/lib/complete-the-look-server";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

import type { OrderStatus } from "@/lib/order-utils";
export type { OrderStatus };
export { isValidTransition, allowedNextStatuses } from "@/lib/order-utils";
import { isValidTransition } from "@/lib/order-utils";

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT STATUS
// Separate from order.status — payment can be captured while order is pending.
// ─────────────────────────────────────────────────────────────────────────────

export type PaymentStatus =
  | "pending"     // initial — no payment attempt yet
  | "authorized"  // authorised but not captured (future use)
  | "captured"    // verified and captured — ✅ payment confirmed
  | "failed"      // signature verification failed or payment declined
  | "refunded";   // refunded (future use)

export interface OrderRow {
  id:                  string;
  user_id:             string;
  status:              OrderStatus;
  currency:            string;
  subtotal:            number;
  coupon_code:         string | null;
  discount_amount:     number;
  shipping_amount:     number;
  total_amount:        number;
  complete_the_look_snapshot?: Record<string, any> | null;
  customer_email:      string | null;
  customer_phone:      string | null;
  shipping_first_name: string | null;
  shipping_last_name:  string | null;
  shipping_address:    string | null;
  shipping_apartment:  string | null;
  shipping_city:       string | null;
  shipping_state:      string | null;
  shipping_postal_code:string | null;
  shipping_country:    string | null;
  // ── Payment fields (added in migration 010) ──────────────────────────────
  payment_status:      PaymentStatus;
  razorpay_order_id:   string | null;
  razorpay_payment_id: string | null;
  razorpay_signature:  string | null;
  // ── Inventory fields (added in migration 011) ─────────────────────────────
  inventory_finalized: boolean;
  // ─────────────────────────────────────────────────────────────────────────
  created_at:          string;
  updated_at:          string;
}

export interface OrderItemRow {
  id:                 string;
  order_id:           string;
  product_id:         string;
  product_name:       string | null;
  product_slug:       string | null;
  /** Primary image URL captured at order time. Null for pre-migration orders. */
  product_image_url:  string | null;
  quantity:           number;
  unit_price:         number | null;
  line_total:         number | null;
  created_at:         string;
}

export interface OrderWithItems extends OrderRow {
  order_items: OrderItemRow[];
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPLAY REFERENCE
// Converts a raw UUID to a customer-facing order reference.
// Example: "8f42a1c3-..." → "VE-8F42A1"
// This is a display label only — not a payment ID.
// ─────────────────────────────────────────────────────────────────────────────

export function orderDisplayRef(orderId: string): string {
  return "VE-" + orderId.replace(/-/g, "").slice(0, 6).toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE ORDER
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  cartItems:   CartItem[];
  customer:    CustomerInformation;
  shipping:    ShippingAddress;
  deliveryId:  DeliveryMethodId;
  couponCode?: string | null;
  bundle?:     CartBundleInfo | null;
}

export interface CreateOrderResult {
  success:  true;
  orderId:  string;
}

export interface CreateOrderError {
  success: false;
  error:   string;
}

/**
 * Creates an order + order_items in Supabase.
 * Called from the API route — never from the browser directly.
 *
 * Guarantees:
 *   - user_id is taken from the server-side session (cannot be faked)
 *   - totals are calculated from the verified product catalog
 *   - cart is NEVER cleared by this function (caller handles that after success)
 *   - if ANY database operation fails, the entire order is abandoned (no partial writes)
 */
export async function createOrderFromCheckout(
  input: CreateOrderInput,
  client?: any,
): Promise<CreateOrderResult | CreateOrderError> {
  const supabase = client ?? (await createClient());

  // ── Auth — server-side only ───────────────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be signed in to place an order." };
  }

  const { cartItems, customer, shipping, deliveryId } = input;

  if (cartItems.length === 0) {
    return { success: false, error: "Your cart is empty." };
  }

  // ── Resolve products + calculate totals ───────────────────────────────────
  // Totals are ALWAYS derived server-side from the verified product catalog.
  // The client never submits prices.

  type ResolvedItem = {
    productId:        string;
    productName:      string | null;
    productSlug:      string | null;
    productImageUrl:  string | null;
    quantity:         number;
    unitPrice:        number | null;
    lineTotal:        number | null;
  };

  const resolvedItems: ResolvedItem[] = [];
  let   subtotal = 0;

  // ── Collect all slugs and batch-fetch from Supabase ────────────────────
  // Price is ALWAYS resolved server-side from public.products.
  // Client-submitted snapshot prices are display-only and never trusted.
  const slugs = cartItems.map(item => item.productId);
  const { data: dbProducts } = await supabase
    .from("products")
    .select("id, slug, name, price, image_url, published, archived")
    .in("slug", slugs)
    .eq("published", true)
    .eq("archived",  false);

  type DbProductRow = {
    id: string;
    slug: string;
    name: string | null;
    price: number | null;
    image_url: string | null;
    published: boolean;
    archived: boolean;
  };

  const productMap = new Map<string, DbProductRow>(
    ((dbProducts as DbProductRow[] | null) ?? []).map((p: DbProductRow) => [p.slug, p])
  );

  // ── AUTHORITATIVE STOCK VALIDATION (server-side; never trust client) ───────
  // Batch-read inventory for all product UUIDs found in the catalog.
  const productIds = [...productMap.values()].map(p => p.id);
  const { data: invRows } = productIds.length > 0
    ? await supabase
        .from("inventory")
        .select("product_id, stock_quantity")
        .in("product_id", productIds)
    : { data: [] as { product_id: string; stock_quantity: number }[] };

  type InvRow = { product_id: string; stock_quantity: number };
  const invMap = new Map<string, number>(
    ((invRows as InvRow[] | null) ?? []).map((r: InvRow) => [r.product_id, r.stock_quantity])
  );

  // Validate every cart item BEFORE creating the order or Razorpay order
  for (const cartItem of cartItems) {
    const dbProduct = productMap.get(cartItem.productId);

    if (!dbProduct) {
      return {
        success: false,
        error:   `"${cartItem.snapshot?.name ?? cartItem.productId}" is no longer available.`,
      };
    }

    const stock = invMap.get(dbProduct.id as string) ?? 0;

    if (stock <= 0) {
      return {
        success: false,
        error:   `${(dbProduct.name as string | null) ?? cartItem.productId} is currently out of stock.`,
      };
    }

    if (cartItem.quantity > stock) {
      return {
        success: false,
        error:   `Only ${stock} of ${(dbProduct.name as string | null) ?? cartItem.productId} available.`,
      };
    }
  }
  // ── END STOCK VALIDATION ─────────────────────────────────────────────────

  // ── Authoritative Complete-the-Look bundle revalidation server-side ───────
  let hasActiveBundle = false;
  let bundleCouponAllowed = true;
  let bundleSnapshot: Record<string, any> | null = null;
  const candidateBundle = input.bundle;

  if (candidateBundle && candidateBundle.setId) {
    const bundleItemsInCart = cartItems.filter(
      i => i.bundleId === candidateBundle.bundleId && i.quantity === 1
    );
    const bundleItemSlugs = bundleItemsInCart.map(i => i.productId);

    const bundleVal = await validateCompleteTheLookBundle(
      {
        setId: candidateBundle.setId,
        productIds: bundleItemSlugs,
      },
      supabase
    );

    if (bundleVal.isValid && bundleVal.bundle) {
      hasActiveBundle = true;
      bundleCouponAllowed = bundleVal.bundle.couponAllowed;
      bundleSnapshot = {
        setId:           bundleVal.bundle.setId,
        baseProductId:   bundleVal.bundle.baseProductId,
        baseProductSlug: bundleVal.bundle.baseProductSlug,
        bundlePrice:     bundleVal.bundle.bundlePrice,
        individualTotal: bundleVal.bundle.individualTotal,
        savings:         bundleVal.bundle.savings,
        couponAllowed:   bundleVal.bundle.couponAllowed,
        productIds:      bundleVal.bundle.productIds,
        productSlugs:    bundleVal.bundle.productSlugs,
      };
    }
  }

  for (const cartItem of cartItems) {
    const dbProduct = productMap.get(cartItem.productId)!; // safe: validated above

    const unitPrice = typeof dbProduct.price === "number" ? dbProduct.price : null;
    const lineTotal = unitPrice !== null ? unitPrice * cartItem.quantity : null;

    // If item is part of an active validated bundle, its price is covered by the bundle price
    if (!hasActiveBundle || cartItem.bundleId !== candidateBundle?.bundleId) {
      if (lineTotal !== null) {
        subtotal += lineTotal;
      }
    }

    resolvedItems.push({
      productId:       dbProduct.id as string,
      productName:     (dbProduct.name as string | null) ?? cartItem.snapshot?.name ?? null,
      productSlug:     dbProduct.slug as string,
      productImageUrl: (dbProduct.image_url as string | null) ?? cartItem.snapshot?.imageUrl ?? null,
      quantity:        cartItem.quantity,
      unitPrice,
      lineTotal,
    });
  }

  // If active bundle verified, add authoritative bundle price to subtotal
  if (hasActiveBundle && bundleSnapshot) {
    subtotal += bundleSnapshot.bundlePrice;
  }

  // ── Server-side Coupon & Discount Calculation ───────────────────────────
  // Coupon is validated against current database state.
  // Discount is calculated on selling-price subtotal (never MRP).
  let appliedCouponCode: string | null = null;
  let discountAmount = 0;

  if (input.couponCode && input.couponCode.trim() !== "") {
    const couponResult = await validateAndCalculateCouponServer(input.couponCode, subtotal, {
      userId: user.id,
      client: client,
      hasActiveBundle,
      bundleCouponAllowed,
    });
    if (!couponResult.valid) {
      return { success: false, error: couponResult.error };
    }
    appliedCouponCode = couponResult.code;
    discountAmount    = couponResult.discountAmount;
  }

  // ── Calculate shipping & total server-side ───────────────────────────────
  // Free shipping threshold applies to the POST-COUPON discounted subtotal.
  // Client-submitted amounts are NEVER trusted.
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const shippingConfig     = await getShippingConfig();
  const shippingResult     = calculateShipping({
    deliveryMethod:     "standard",
    postCouponSubtotal: discountedSubtotal,
    shippingConfig,
  });
  const shippingAmount     = shippingResult.shippingCost;
  const totalAmount        = discountedSubtotal + shippingAmount;

  // ── Insert order ──────────────────────────────────────────────────────────
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id:                    user.id,
      status:                     "pending",
      currency:                   "INR",
      subtotal:                   subtotal,
      coupon_code:                appliedCouponCode,
      discount_amount:            discountAmount,
      shipping_amount:            shippingAmount,
      total_amount:               totalAmount,
      complete_the_look_snapshot: bundleSnapshot,
      customer_email:             customer.email,
      customer_phone:             customer.phone,
      shipping_first_name:        shipping.firstName,
      shipping_last_name:         shipping.lastName,
      shipping_address:           shipping.address,
      shipping_apartment:         shipping.apartment ?? null,
      shipping_city:              shipping.city,
      shipping_state:             shipping.state,
      shipping_postal_code:       shipping.postalCode,
      shipping_country:           shipping.country,
    })
    .select("id")
    .single();

  if (orderError || !orderData) {
    console.error("[createOrderFromCheckout] order insert failed:", orderError?.message);
    return { success: false, error: "Unable to place order. Please try again." };
  }

  const orderId = orderData.id as string;

  // ── Insert order_items ────────────────────────────────────────────────────
  const itemRows = resolvedItems.map(item => ({
    order_id:          orderId,
    product_id:        item.productId,
    product_name:      item.productName,
    product_slug:      item.productSlug,
    product_image_url: item.productImageUrl,
    quantity:          item.quantity,
    unit_price:        item.unitPrice,
    line_total:        item.lineTotal,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(itemRows);

  if (itemsError) {
    // Log full Supabase error for diagnosis — safe fields only, no secrets
    console.error("[createOrderFromCheckout] order_items INSERT failed:", {
      message: itemsError.message,
      code:    (itemsError as { code?: string }).code,
      details: (itemsError as { details?: string }).details,
      hint:    (itemsError as { hint?: string }).hint,
      orderId,
      itemCount: itemRows.length,
    });

    // Best-effort cleanup of the orphaned order header.
    // Note: there is NO DELETE RLS policy on public.orders for customers,
    // so this delete will fail silently on the client-session supabase client.
    // The orphaned order with status=pending is benign — it has no items and
    // will not show correct item data. Admin can clean up manually if needed.
    // TODO: add orders_delete_own RLS policy or use a DB function to atomise this.
    const { error: deleteError } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId);
    if (deleteError) {
      console.warn("[createOrderFromCheckout] orphan order cleanup failed (no DELETE RLS):", {
        message: deleteError.message,
        code:    (deleteError as { code?: string }).code,
        orderId,
      });
    }

    // Surface the root cause clearly (safe for server logs, generic for UI)
    const code = (itemsError as { code?: string }).code;
    if (code === "42703") {
      // "undefined column" — most likely product_image_url column missing
      // (migration 009 not yet applied to this Supabase project)
      console.error(
        "[createOrderFromCheckout] SCHEMA ERROR: The 'product_image_url' column does not exist on public.order_items.\n" +
        "Run migration 009_order_item_image_url.sql in the Supabase SQL Editor."
      );
      return { success: false, error: "Unable to save order items: schema migration required. Please contact support." };
    }

    return { success: false, error: "Unable to save order items. Please try again." };
  }

  return { success: true, orderId };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET USER ORDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the authenticated user's orders, newest first.
 * Returns [] if not authenticated or no orders exist.
 */
export async function getUserOrders(): Promise<OrderRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getUserOrders]", error.message);
    return [];
  }

  return (data ?? []) as OrderRow[];
}

// ─────────────────────────────────────────────────────────────────────────────
// GET USER ORDER BY ID
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a single order with its items, scoped to the current user.
 * Returns null if the order doesn't exist OR belongs to another user.
 */
export async function getUserOrderById(orderId: string): Promise<OrderWithItems | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", orderId)
    .eq("user_id", user.id)      // enforces ownership — RLS + explicit filter
    .single();

  if (error || !data) return null;

  return data as OrderWithItems;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — ORDER MANAGEMENT
// Call only after requireAdmin() has verified the session.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns ALL orders for the admin list, newest first.
 * Optionally filtered by status.
 */
export async function getAllOrders(
  statusFilter?: OrderStatus,
): Promise<(OrderRow & { item_count: number })[]> {
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select(`*, order_items ( id )`)
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getAllOrders]", error.message);
    return [];
  }

  return (data ?? []).map(row => ({
    ...(row as OrderRow),
    item_count: Array.isArray(row.order_items) ? row.order_items.length : 0,
  }));
}

/**
 * Returns a single order with all items for the admin detail view.
 * Does NOT enforce user_id — admin can view any order.
 */
export async function getAdminOrderById(
  orderId: string,
): Promise<OrderWithItems | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", orderId)
    .single();

  if (error || !data) return null;
  return data as OrderWithItems;
}

// (isValidTransition and allowedNextStatuses are re-exported from lib/order-utils)

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT STATUS UPDATE
// Called only from server-side route handlers after signature verification.
// ─────────────────────────────────────────────────────────────────────────────

export interface UpdateOrderPaymentInput {
  orderId:           string;
  paymentStatus:     PaymentStatus;
  razorpayOrderId?:  string;
  razorpayPaymentId?:string;
  razorpaySignature?:string;
}

/**
 * Updates payment_status and Razorpay IDs on an existing order.
 *
 * Idempotent: if the order is already 'captured', subsequent calls
 * return success without overwriting the stored payment data.
 *
 * Ownership is enforced by RLS + the user_id filter.
 * Only call this from authenticated server route handlers.
 */
export async function updateOrderPayment(
  input: UpdateOrderPaymentInput,
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated." };
  }

  // Idempotency check — don't overwrite a captured payment
  const { data: current } = await supabase
    .from("orders")
    .select("payment_status, user_id")
    .eq("id", input.orderId)
    .single();

  if (!current) {
    return { success: false, error: "Order not found." };
  }

  // Ownership guard (belt-and-suspenders alongside RLS)
  if ((current as { user_id: string }).user_id !== user.id) {
    return { success: false, error: "Order does not belong to this user." };
  }

  // Idempotent — already captured, return success without re-writing
  if ((current as { payment_status: string }).payment_status === "captured" &&
      input.paymentStatus === "captured") {
    return { success: true };
  }

  const updatePayload: Record<string, string> = {
    payment_status: input.paymentStatus,
    updated_at:     new Date().toISOString(),
  };

  if (input.razorpayOrderId)   updatePayload.razorpay_order_id   = input.razorpayOrderId;
  if (input.razorpayPaymentId) updatePayload.razorpay_payment_id = input.razorpayPaymentId;
  if (input.razorpaySignature) updatePayload.razorpay_signature  = input.razorpaySignature;

  const { error: updateError } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", input.orderId)
    .eq("user_id", user.id);  // belt-and-suspenders ownership check

  if (updateError) {
    console.error("[updateOrderPayment]", updateError.message);
    return { success: false, error: "Failed to update payment status." };
  }

  return { success: true };
}

/**
 * Admin-only: update payment status without user_id restriction.
 * Called by the webhook handler (no user session available).
 *
 * Idempotency: Uses the DB-level capture_order_payment() RPC for the
 * captured→captured transition. This is a SINGLE ATOMIC conditional UPDATE:
 *   UPDATE orders SET payment_status = 'captured' WHERE payment_status != 'captured'
 * which eliminates the read-then-write TOCTOU race present in a check+update pattern.
 * Two simultaneous webhook deliveries will serialize: one updates, the other is a no-op.
 *
 * For non-captured transitions (failed, etc.) a plain UPDATE is used — those
 * transitions don't need the same atomicity guarantee because inventory is never
 * deducted on failed payments.
 */
export async function adminUpdateOrderPayment(
  input: UpdateOrderPaymentInput,
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();

  // ── captured transition: single atomic conditional UPDATE via RPC ──────
  // Eliminates the TOCTOU race: the DB UPDATE's WHERE clause is the guard.
  if (input.paymentStatus === "captured") {
    const { data: captured, error: rpcError } = await supabase
      .rpc("capture_order_payment", {
        p_order_id:            input.orderId,
        p_razorpay_order_id:   input.razorpayOrderId   ?? null,
        p_razorpay_payment_id: input.razorpayPaymentId ?? null,
      });

    if (rpcError) {
      console.error("[adminUpdateOrderPayment] capture_order_payment RPC error:", rpcError.message);
      return { success: false, error: "Failed to update payment status." };
    }

    // captured = true → this call did the update (first caller)
    // captured = false → already captured (idempotent no-op)
    if (!(captured as boolean)) {
      console.info("[adminUpdateOrderPayment] Order already captured — idempotent no-op:", input.orderId);
    }

    // Also store signature if provided (plain UPDATE, non-critical)
    if (input.razorpaySignature) {
      await supabase
        .from("orders")
        .update({ razorpay_signature: input.razorpaySignature, updated_at: new Date().toISOString() })
        .eq("id", input.orderId);
    }

    return { success: true };
  }

  // ── non-captured transitions (failed, refunded, etc.) ─────────────────
  const updatePayload: Record<string, string> = {
    payment_status: input.paymentStatus,
    updated_at:     new Date().toISOString(),
  };

  if (input.razorpayOrderId)   updatePayload.razorpay_order_id   = input.razorpayOrderId;
  if (input.razorpayPaymentId) updatePayload.razorpay_payment_id = input.razorpayPaymentId;
  if (input.razorpaySignature) updatePayload.razorpay_signature  = input.razorpaySignature;

  // Idempotency: do not overwrite a captured payment with failed/etc.
  const { data: current } = await supabase
    .from("orders")
    .select("payment_status")
    .eq("id", input.orderId)
    .single();

  if (current && (current as { payment_status: string }).payment_status === "captured") {
    console.warn("[adminUpdateOrderPayment] Refusing to overwrite captured status with:", input.paymentStatus);
    return { success: true };  // idempotent — already in a better state
  }

  const { error } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", input.orderId);

  if (error) {
    console.error("[adminUpdateOrderPayment]", error.message);
    return { success: false, error: "Failed to update payment status." };
  }

  return { success: true };
}

/**
 * Updates order status with transition validation.
 * Returns success or a user-friendly error string.
 * Call only after requireAdmin().
 */
export async function updateOrderStatus(
  orderId:   string,
  newStatus: OrderStatus,
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();

  // Read current status first
  const { data: current, error: fetchError } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();

  if (fetchError || !current) {
    return { success: false, error: "Order not found." };
  }

  const currentStatus = current.status as OrderStatus;

  if (currentStatus === newStatus) {
    return { success: false, error: "Order is already in that status." };
  }

  if (!isValidTransition(currentStatus, newStatus)) {
    const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    return {
      success: false,
      error:   `Cannot transition from ${label(currentStatus)} to ${label(newStatus)}.`,
    };
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (updateError) {
    return { success: false, error: "Failed to update status. Please try again." };
  }

  return { success: true };
}


// ─────────────────────────────────────────────────────────────────────────────
// ORDER ITEM IMAGE RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the best available image for an order item.
 *
 * Priority:
 *   1. item.product_image_url  — snapshot stored at order time (new orders)
 *   2. Live catalog fallback   — queries public.products by product_slug
 *   3. null                    — render graceful neutral placeholder in UI
 *
 * Historical orders (placed before migration 009) have product_image_url = null
 * and will resolve via the live catalog as long as the product still exists.
 *
 * @param item — an OrderItemRow from the order_items table
 */
export async function resolveOrderItemImage(
  item: Pick<OrderItemRow, "product_image_url" | "product_slug">,
): Promise<string | null> {
  // 1. Snapshot stored at order time — prefer this for historical integrity
  if (item.product_image_url && item.product_image_url.trim() !== "") {
    return item.product_image_url;
  }

  // 2. Live catalog fallback — works for pre-migration orders as long as
  //    the product still exists and has an image
  if (item.product_slug) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("products")
      .select("image_url")
      .eq("slug", item.product_slug)
      .maybeSingle();

    if (data?.image_url) return data.image_url as string;
  }

  // 3. No image available — return null so the UI can show a placeholder
  return null;
}


// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY FINALIZATION
// ─────────────────────────────────────────────────────────────────────────────

export interface FinalizeInventoryResult {
  success:     true;
  reason:      string;   // 'finalized' | 'already_finalized'
  alreadyDone: boolean;
}

export interface FinalizeInventoryError {
  success:   false;
  reason:    string;     // 'insufficient_stock' | 'order_not_found' | ...
  productId: string | null;
}

/**
 * Calls the Postgres SECURITY DEFINER function finalize_order_inventory().
 *
 * The DB function:
 *   - Checks inventory_finalized = false (idempotency gate)
 *   - Deducts stock for each order item
 *   - Logs inventory_movements with movement_type = 'order_completed'
 *   - Sets orders.status = 'confirmed'
 *   - Sets orders.inventory_finalized = true
 *
 * Can be called from both the verify route and the webhook handler safely.
 * Duplicate calls return { alreadyDone: true } without touching stock.
 *
 * @param orderId — Supabase order UUID
 */
export async function finalizeOrderInventory(
  orderId: string,
): Promise<FinalizeInventoryResult | FinalizeInventoryError> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("finalize_order_inventory", { p_order_id: orderId });

  if (error) {
    console.error("[finalizeOrderInventory] RPC error:", {
      message: error.message,
      code:    (error as { code?: string }).code,
      orderId,
    });
    return { success: false, reason: "rpc_error", productId: null };
  }

  const result = data as { success: boolean; reason: string; product_id?: string; available?: number; requested?: number };

  if (!result.success) {
    console.warn("[finalizeOrderInventory] finalization failed:", {
      reason:     result.reason,
      product_id: result.product_id,
      available:  result.available,
      requested:  result.requested,
      orderId,
    });
    return {
      success:   false,
      reason:    result.reason ?? "unknown",
      productId: result.product_id ?? null,
    };
  }

  return {
    success:     true,
    reason:      result.reason ?? "finalized",
    alreadyDone: result.reason === "already_finalized",
  };
}
