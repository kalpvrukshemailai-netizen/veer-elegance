/**
 * VEER ELEGANCE — Customer Wishlist Module (Types)
 *
 * Core types for authenticated customer wishlist state.
 * Safe to import in both Client and Server components.
 */

export interface WishlistItem {
  productId:   string;
  productSlug: string;
  addedAt:     string;
}

export interface WishlistState {
  slugs: string[];
}
