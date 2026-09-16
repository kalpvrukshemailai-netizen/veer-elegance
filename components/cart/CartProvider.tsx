"use client";

/**
 * VEER ELEGANCE — CartProvider
 *
 * React context that owns the cart state and exposes it via useCart().
 *
 * Hydration safety:
 *   localStorage is read ONLY on the client after mount (useEffect).
 *   SSR always renders an empty cart to avoid hydration mismatch.
 *
 * Exposes:
 *   items           — CartItem[]
 *   itemCount       — total quantity across all items
 *   isOpen          — whether the drawer is visible
 *   openDrawer()    — open the bag drawer
 *   closeDrawer()   — close the bag drawer
 *   addToCart()     — add product (opens drawer automatically)
 *   removeFromCart()
 *   updateQuantity()
 *   clearCart()     — empty all items (call on successful checkout)
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type CartItem,
  type CartState,
  type CartBundleInfo,
  type ProductSnapshot,
  addItem,
  addBundleToCart as addBundleToCartReducer,
  removeItem,
  setQuantity,
  totalItemCount,
  readCartFromStorage,
  writeCartToStorage,
} from "@/lib/cart";

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface CartContextValue {
  items:             CartItem[];
  itemCount:         number;
  bundle:            CartBundleInfo | null;
  bundleNotice:      string | null;
  clearBundleNotice: () => void;
  isOpen:            boolean;
  openDrawer:        () => void;
  closeDrawer:       () => void;
  /**
   * Add a product to the cart. Opens the drawer automatically.
   * Pass the full ProductSnapshot so the cart can render without
   * any runtime product lookups (works for ANY Supabase product).
   */
  addToCart:         (productId: string, snapshot: ProductSnapshot) => void;
  /** Add a verified Complete-the-Look bundle to the cart atomically. */
  addBundleToCart:   (bundle: CartBundleInfo, items: { productId: string; snapshot: ProductSnapshot }[]) => void;
  removeFromCart:    (productId: string) => void;
  updateQuantity:    (productId: string, quantity: number) => void;
  /** Clears all cart items and persists empty state to localStorage. */
  clearCart:         () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Always start with an empty cart (SSR safe)
  const [cart,   setCart]   = useState<CartState>({ items: [] });
  const [isOpen, setIsOpen] = useState(false);

  // Hydrate from localStorage once on the client
  useEffect(() => {
    const stored = readCartFromStorage();
    setCart(stored);
  }, []);

  // Persist to localStorage whenever cart changes (skip first SSR render)
  const isMounted = useRef(false);
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    writeCartToStorage(cart);
  }, [cart]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const openDrawer  = useCallback(() => setIsOpen(true),  []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);

  const addToCart = useCallback((productId: string, snapshot: ProductSnapshot) => {
    setCart(prev => addItem(prev, productId, snapshot));
    setIsOpen(true);   // auto-open drawer on add
  }, []);

  const addBundleToCart = useCallback(
    (bundle: CartBundleInfo, items: { productId: string; snapshot: ProductSnapshot }[]) => {
      setCart(prev => addBundleToCartReducer(prev, bundle, items));
      setIsOpen(true); // auto-open drawer on add
    },
    []
  );

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => removeItem(prev, productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setCart(prev => setQuantity(prev, productId, quantity));
  }, []);

  const clearBundleNotice = useCallback(() => {
    setCart(prev => ({ ...prev, bundleNotice: null }));
  }, []);

  /**
   * Clears all cart items.
   * Setting state to { items: [] } triggers the existing writeCartToStorage
   * useEffect, which immediately writes the empty cart to localStorage.
   * All subscribed UI (navbar count, drawer) updates in the same render cycle.
   */
  const clearCart = useCallback(() => {
    setCart({ items: [], bundle: null, bundleNotice: null });
  }, []);

  // ── Context value ──────────────────────────────────────────────────────────

  const value: CartContextValue = {
    items:             cart.items,
    itemCount:         totalItemCount(cart),
    bundle:            cart.bundle ?? null,
    bundleNotice:      cart.bundleNotice ?? null,
    clearBundleNotice,
    isOpen,
    openDrawer,
    closeDrawer,
    addToCart,
    addBundleToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

/** Access cart state and actions from any client component. */
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside <CartProvider>");
  }
  return ctx;
}
