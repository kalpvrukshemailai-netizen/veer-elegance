-- ============================================================
-- VEER ELEGANCE — Migration 014: Expand Categories to 7 Collections
-- Run in Supabase SQL Editor — IDEMPOTENT (safe to re-run)
--
-- Purpose:
--   Update public.products category CHECK constraint to allow
--   all 7 supported categories:
--     1. chains             (THE EVERYDAY)
--     2. rings              (THE SIGNATURE)
--     3. earrings           (THE GLOW)
--     4. bracelets          (THE MOTION)
--     5. bangles            (THE HALO)
--     6. mystery-box        (THE UNKNOWN)
--     7. gen-z-accessories  (THE REBEL)
-- ============================================================

alter table public.products
  drop constraint if exists products_category_check;
alter table public.products
  add constraint products_category_check
  check (category in (
    'chains',
    'rings',
    'earrings',
    'bracelets',
    'bangles',
    'mystery-box',
    'gen-z-accessories'
  ));

comment on constraint products_category_check on public.products is
  'Ensures product category is one of the 7 canonical Veer Elegance collections.';
