/**
 * VEER ELEGANCE — Cart Logic
 *
 * Pure TypeScript cart types and localStorage helpers.
 * No React. No side effects. Fully unit-testable.
 *
 * Cart state stores identifiers, quantities, AND a product snapshot.
 * The snapshot (name, price, imageUrl, slug) is captured at the moment
 * the customer adds to cart from the live product page.
 *
 * This means CartDrawer, CartItem, and OrderSummary never need to look
 * up product data from any static catalogue or make API calls at render
 * time — everything needed for display is already in the cart state.
 *
 * Security note:
 *   The snapshot price is used ONLY for display.
 *   The order creation API (/api/orders) ALWAYS re-validates price from
 *   public.products server-side. Client-submitted prices are never trusted.
 *
 * Legacy migration:
 *   Old cart items from the static catalogue (pre-Supabase, no snapshot)
 *   are automatically purged on the next app load by the CartProvider.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Snapshot of product data captured at add-to-cart time.
 * Allows the cart drawer to render without any runtime product lookups.
 */
export interface ProductSnapshot {
  /** public.products.slug — used for routing and display only */
  slug:      string;
  /** Product name at time of add */
  name:      string | null;
  /** Price in INR at time of add — display only, re-validated at checkout */
  price:     number | null;
  /** Primary image URL (Supabase CDN or local /public path) */
  imageUrl:  string;
  /** Anti-tarnish flag */
  antiTarnish: boolean;
}

export interface CartItem {
  /** public.products.slug — canonical cart key for deduplication */
  productId:    string;
  quantity:     number;
  /** Product snapshot captured at add-to-cart time */
  snapshot:     ProductSnapshot;
  /** Optional bundle instance ID if added as part of Complete-the-Look */
  bundleId?:    string;
  /** Optional Complete-the-Look set UUID */
  bundleSetId?: string;
}

export interface CartBundleInfo {
  bundleId:        string;
  setId:           string;
  baseProductId:   string;
  baseProductSlug?: string;
  productIds:      string[]; // Slugs or UUIDs matching cartItem.productId
  productSlugs?:   string[];
  bundlePrice:     number;
  individualTotal: number;
  savings:         number;
  couponAllowed:   boolean;
}

export interface CartState {
  items:         CartItem[];
  bundle?:       CartBundleInfo | null;
  bundleNotice?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const CART_STORAGE_KEY = "veer-elegance-cart";

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Read cart from localStorage. Returns empty cart on any error. */
export function readCartFromStorage(): CartState {
  if (typeof window === "undefined") return { items: [] };
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidCartState(parsed)) {
      // Could be an old cart without snapshots — purge silently
      window.localStorage.removeItem(CART_STORAGE_KEY);
      return { items: [] };
    }
    return reconcileCartBundle(parsed);
  } catch {
    window.localStorage.removeItem(CART_STORAGE_KEY);
    return { items: [] };
  }
}

/** Write cart to localStorage. Silently no-ops on error. */
export function writeCartToStorage(cart: CartState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Storage quota exceeded or unavailable — graceful no-op
  }
}

/**
 * Type guard — validates shape of parsed JSON.
 * Old cart items (missing snapshot) fail this guard and trigger a clean purge.
 */
function isValidCartState(value: unknown): value is CartState {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.items)) return false;
  return obj.items.every(item => {
    if (!item || typeof item !== "object") return false;
    const i = item as Record<string, unknown>;
    // productId and quantity — always required
    if (typeof i.productId !== "string") return false;
    if (typeof i.quantity  !== "number") return false;
    // snapshot — required in new format; old items without it are purged
    if (!i.snapshot || typeof i.snapshot !== "object") return false;
    const s = i.snapshot as Record<string, unknown>;
    if (typeof s.slug     !== "string")  return false;
    if (typeof s.imageUrl !== "string")  return false;
    if (typeof s.antiTarnish !== "boolean") return false;
    // name and price are nullable — check they exist as a key but allow null
    if (!Object.prototype.hasOwnProperty.call(s, "name"))  return false;
    if (!Object.prototype.hasOwnProperty.call(s, "price")) return false;
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PURE CART REDUCERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reconciles bundle integrity.
 * If any product in the bundle was removed or had its quantity changed (!== 1),
 * the bundle is immediately dissolved, remaining items revert to normal individual
 * pricing, and a clear user notice is returned.
 */
export function reconcileCartBundle(state: CartState): CartState {
  if (!state.bundle) {
    return state;
  }

  const { bundle } = state;
  const requiredKeys = new Set(
    (bundle.productSlugs && bundle.productSlugs.length > 0)
      ? bundle.productSlugs
      : bundle.productIds
  );

  const bundleItems = state.items.filter(
    i => i.bundleId === bundle.bundleId && requiredKeys.has(i.productId)
  );

  const allPresentWithQtyOne =
    bundleItems.length === requiredKeys.size &&
    bundleItems.every(i => i.quantity === 1);

  if (allPresentWithQtyOne) {
    return state;
  }

  // Bundle broken: strip bundle identifiers from remaining items and clear bundle
  const cleanedItems = state.items.map(item => {
    if (item.bundleId === bundle.bundleId) {
      const { bundleId, bundleSetId, ...rest } = item;
      return rest;
    }
    return item;
  });

  return {
    items: cleanedItems,
    bundle: null,
    bundleNotice: "Complete Look offer removed. The remaining pieces are now priced individually.",
  };
}

/** Add a product with its snapshot. If already in cart, increment quantity. */
export function addItem(
  state:     CartState,
  productId: string,
  snapshot:  ProductSnapshot,
): CartState {
  const exists = state.items.find(i => i.productId === productId);
  let updatedItems: CartItem[];

  if (exists) {
    updatedItems = state.items.map(i =>
      i.productId === productId
        ? { ...i, quantity: i.quantity + 1, snapshot }
        : i
    );
  } else {
    updatedItems = [...state.items, { productId, quantity: 1, snapshot }];
  }

  return reconcileCartBundle({
    ...state,
    items: updatedItems,
  });
}

/** Add a verified Complete-the-Look bundle to cart atomically. */
export function addBundleToCart(
  state:    CartState,
  bundle:   CartBundleInfo,
  newItems: { productId: string; snapshot: ProductSnapshot }[]
): CartState {
  // First dissolve any existing bundle
  let workingItems = state.items.map(i => {
    const { bundleId, bundleSetId, ...rest } = i;
    return rest;
  });

  // For each bundle piece: update or insert as quantity 1 with bundleId
  for (const bundlePiece of newItems) {
    const existingIndex = workingItems.findIndex(i => i.productId === bundlePiece.productId);
    const itemWithBundle: CartItem = {
      productId:   bundlePiece.productId,
      quantity:    1,
      snapshot:    bundlePiece.snapshot,
      bundleId:    bundle.bundleId,
      bundleSetId: bundle.setId,
    };

    if (existingIndex >= 0) {
      workingItems[existingIndex] = itemWithBundle;
    } else {
      workingItems.push(itemWithBundle);
    }
  }

  return {
    items: workingItems,
    bundle,
    bundleNotice: null,
  };
}

/** Set quantity. Removes item when quantity reaches 0. */
export function setQuantity(
  state:     CartState,
  productId: string,
  quantity:  number,
): CartState {
  if (quantity <= 0) return removeItem(state, productId);

  const updatedItems = state.items.map(i =>
    i.productId === productId ? { ...i, quantity } : i
  );

  return reconcileCartBundle({
    ...state,
    items: updatedItems,
  });
}

/** Remove item entirely. */
export function removeItem(state: CartState, productId: string): CartState {
  const updatedItems = state.items.filter(i => i.productId !== productId);
  return reconcileCartBundle({
    ...state,
    items: updatedItems,
  });
}

/** Clear all items. */
export function clearCart(): CartState {
  return { items: [], bundle: null, bundleNotice: null };
}

/** Total item count (sum of all quantities). */
export function totalItemCount(state: CartState): number {
  return state.items.reduce((sum, i) => sum + i.quantity, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// CART SUBTOTAL & BUNDLE PRICING HELPER
// ─────────────────────────────────────────────────────────────────────────────

export interface CartSubtotalSummary {
  subtotal:          number;
  hasActiveBundle:   boolean;
  bundleDiscount:    number;
  bundlePrice:       number;
  individualTotal:   number;
  nonBundleSubtotal: number;
  allPriced:         boolean;
}

/**
 * Computes authoritative cart subtotal taking any active Complete-the-Look bundle into account.
 */
export function calculateCartSubtotal(cart: CartState): CartSubtotalSummary {
  const reconciled = reconcileCartBundle(cart);
  const { items, bundle } = reconciled;

  let individualTotal = 0;
  let nonBundleSubtotal = 0;
  let allPriced = true;

  for (const item of items) {
    const price = item.snapshot.price;
    if (typeof price !== "number" || price === null) {
      allPriced = false;
    } else {
      const lineTotal = price * item.quantity;
      individualTotal += lineTotal;
      if (!bundle || item.bundleId !== bundle.bundleId) {
        nonBundleSubtotal += lineTotal;
      }
    }
  }

  if (bundle && bundle.bundlePrice > 0) {
    const subtotal = Number((bundle.bundlePrice + nonBundleSubtotal).toFixed(2));
    const bundleDiscount = Number(Math.max(0, bundle.individualTotal - bundle.bundlePrice).toFixed(2));

    return {
      subtotal,
      hasActiveBundle: true,
      bundleDiscount,
      bundlePrice: bundle.bundlePrice,
      individualTotal,
      nonBundleSubtotal,
      allPriced,
    };
  }

  return {
    subtotal: individualTotal,
    hasActiveBundle: false,
    bundleDiscount: 0,
    bundlePrice: 0,
    individualTotal,
    nonBundleSubtotal: individualTotal,
    allPriced,
  };
}
