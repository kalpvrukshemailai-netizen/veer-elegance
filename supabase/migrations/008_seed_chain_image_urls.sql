-- ============================================================
-- VEER ELEGANCE — Seed Local Image URLs for Existing Chain Products (008)
--
-- The 9 existing chain products were created before Supabase Storage.
-- Their product images live at /public/images/products/chains/chain-0N.jpeg
-- and their image_url column is currently NULL.
--
-- This migration sets image_url for each existing chain product to the
-- local public path so the storefront adapter (lib/storefront.ts) can
-- resolve them correctly without Supabase Storage uploads.
--
-- Once the owner uploads real product-images via Admin → Products → Edit,
-- the image_url is automatically updated to the Supabase Storage CDN URL
-- and these fallback paths are superseded.
--
-- Run in Supabase SQL Editor.
-- ============================================================

update public.products
set image_url = '/images/products/chains/chain-01.jpeg'
where slug = 'chain-01' and (image_url is null or image_url = '');

update public.products
set image_url = '/images/products/chains/chain-02.jpeg'
where slug = 'chain-02' and (image_url is null or image_url = '');

update public.products
set image_url = '/images/products/chains/chain-03.jpeg'
where slug = 'chain-03' and (image_url is null or image_url = '');

update public.products
set image_url = '/images/products/chains/chain-04.jpeg'
where slug = 'chain-04' and (image_url is null or image_url = '');

update public.products
set image_url = '/images/products/chains/chain-05.jpeg'
where slug = 'chain-05' and (image_url is null or image_url = '');

update public.products
set image_url = '/images/products/chains/chain-06.jpeg'
where slug = 'chain-06' and (image_url is null or image_url = '');

update public.products
set image_url = '/images/products/chains/chain-07.jpeg'
where slug = 'chain-07' and (image_url is null or image_url = '');

update public.products
set image_url = '/images/products/chains/chain-08.jpeg'
where slug = 'chain-08' and (image_url is null or image_url = '');

update public.products
set image_url = '/images/products/chains/chain-09.jpeg'
where slug = 'chain-09' and (image_url is null or image_url = '');

-- Verify: all 9 chains should now have image_url set
-- select slug, image_url, published, featured from public.products
-- where category = 'chains'
-- order by display_order;
