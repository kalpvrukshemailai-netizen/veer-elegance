-- ============================================================
-- VEER ELEGANCE — Migration 018: Seed Shipping Configuration
-- Run in Supabase SQL Editor — IDEMPOTENT (safe to re-run)
--
-- Purpose:
--   Seeds initial shipping configuration in public.site_content
--   with shippingRate = 49 and freeShippingThreshold = 1499.
-- ============================================================

insert into public.site_content (key, value)
values (
  'shipping',
  '{"shippingRate": 49, "freeShippingThreshold": 1499}'::jsonb
)
on conflict (key) do nothing;
