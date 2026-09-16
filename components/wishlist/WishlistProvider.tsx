"use client";

/**
 * VEER ELEGANCE — WishlistProvider
 *
 * React context that manages customer wishlist state.
 *
 * Rules:
 *  - STRICTLY requires customer authentication.
 *  - Guests can NOT save wishlist items (no localStorage, no database writes).
 *  - When an unauthenticated visitor attempts to wishlist an item, a branded
 *    "Login required" modal opens with a safe return path.
 *  - Authenticated users persist their wishlist directly to Supabase via /api/wishlist.
 *  - Optimistic UI updates with rollback on network failure.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import WishlistAuthModal from "./WishlistAuthModal";

interface WishlistContextValue {
  wishlistSlugs:      string[];
  isWishlisted:       (slug: string) => boolean;
  toggleWishlist:     (slug: string) => Promise<void>;
  addToWishlist:      (slug: string) => Promise<void>;
  removeFromWishlist: (slug: string) => Promise<void>;
  itemCount:          number;
  loading:            boolean;
  isAuthenticated:    boolean;
  openAuthModal:      () => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlistSlugs, setWishlistSlugs] = useState<string[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // ── Fetch user's wishlist from Supabase via /api/wishlist ──────────────
  const fetchUserWishlist = useCallback(async () => {
    try {
      const res = await fetch("/api/wishlist");
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.slugs)) {
          setWishlistSlugs(json.slugs);
        }
      } else {
        setWishlistSlugs([]);
      }
    } catch {
      setWishlistSlugs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Auth initialization & subscription ──────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    // Check current session on mount
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIsAuthenticated(true);
        fetchUserWishlist();
      } else {
        setIsAuthenticated(false);
        setWishlistSlugs([]);
        setLoading(false);
      }
    });

    // Listen for auth state changes (login, logout, session expiration)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setIsAuthenticated(true);
        await fetchUserWishlist();
      } else if (event === "SIGNED_OUT") {
        setIsAuthenticated(false);
        setWishlistSlugs([]);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserWishlist]);

  // ── Action: isWishlisted ────────────────────────────────────────────────
  const isWishlisted = useCallback((slug: string): boolean => {
    if (!slug) return false;
    return wishlistSlugs.includes(slug.trim());
  }, [wishlistSlugs]);

  // ── Action: addToWishlist ───────────────────────────────────────────────
  const addToWishlist = useCallback(async (slug: string) => {
    const clean = slug.trim();
    if (!clean) return;

    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    setWishlistSlugs(prev => (prev.includes(clean) ? prev : [...prev, clean]));

    try {
      const res = await fetch("/api/wishlist", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ slug: clean }),
      });

      if (!res.ok) {
        // Rollback on failure
        setWishlistSlugs(prev => prev.filter(s => s !== clean));
      }
    } catch {
      setWishlistSlugs(prev => prev.filter(s => s !== clean));
    }
  }, [isAuthenticated]);

  // ── Action: removeFromWishlist ──────────────────────────────────────────
  const removeFromWishlist = useCallback(async (slug: string) => {
    const clean = slug.trim();
    if (!clean) return;

    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    setWishlistSlugs(prev => prev.filter(s => s !== clean));

    try {
      const res = await fetch("/api/wishlist", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ slug: clean }),
      });

      if (!res.ok) {
        // Rollback on failure
        setWishlistSlugs(prev => (prev.includes(clean) ? prev : [...prev, clean]));
      }
    } catch {
      setWishlistSlugs(prev => (prev.includes(clean) ? prev : [...prev, clean]));
    }
  }, [isAuthenticated]);

  // ── Action: toggleWishlist ──────────────────────────────────────────────
  const toggleWishlist = useCallback(async (slug: string) => {
    const clean = slug.trim();
    if (!clean) return;

    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (wishlistSlugs.includes(clean)) {
      await removeFromWishlist(clean);
    } else {
      await addToWishlist(clean);
    }
  }, [isAuthenticated, wishlistSlugs, addToWishlist, removeFromWishlist]);

  const openAuthModal = useCallback(() => {
    setShowAuthModal(true);
  }, []);

  const value = useMemo<WishlistContextValue>(() => ({
    wishlistSlugs,
    isWishlisted,
    toggleWishlist,
    addToWishlist,
    removeFromWishlist,
    itemCount: wishlistSlugs.length,
    loading,
    isAuthenticated,
    openAuthModal,
  }), [wishlistSlugs, isWishlisted, toggleWishlist, addToWishlist, removeFromWishlist, loading, isAuthenticated, openAuthModal]);

  return (
    <WishlistContext.Provider value={value}>
      {children}
      {/* Global Login-Required Modal */}
      <WishlistAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used inside <WishlistProvider>");
  }
  return context;
}
