-- ============================================================
-- VEER ELEGANCE — Add product_image_url to order_items (009)
--
-- order_items currently stores a product snapshot at order time:
--   product_id, product_name, product_slug, quantity, unit_price, line_total
--
-- But it does NOT store the product image URL. For newly-created Supabase
-- products, the order detail pages cannot resolve the image from the old
-- static data/products.ts and show a blank image.
--
-- This migration adds:
--   product_image_url text — the primary image URL at time of order
--
-- Historical orders (NULL image_url) will use the live-catalog fallback
-- strategy in the order detail pages.
--
-- Run in Supabase SQL Editor.
-- ============================================================

alter table public.order_items
  add column if not exists product_image_url text;

comment on column public.order_items.product_image_url is
  'Primary image URL of the product at time of order placement. Null for orders placed before this migration.';
