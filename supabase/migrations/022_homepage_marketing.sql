-- ============================================================
-- VEER ELEGANCE — Migration 022: Homepage Marketing Content Seed
-- Run in Supabase SQL Editor — IDEMPOTENT (safe to re-run)
--
-- Purpose:
--   Seed default content records for 'announcement' (offer bar)
--   and 'popup' (homepage promotional popup ad) into public.site_content.
-- ============================================================

-- ── 1. SEED DEFAULT ANNOUNCEMENT CONTENT ─────────────────────────────────────
insert into public.site_content (key, value)
values (
  'announcement',
  '{
    "enabled": false,
    "text": "✨ Festive Elegance: Enjoy 15% off with code VEER15 • Free express shipping on orders over ₹1,999 • 100% Anti-Tarnish Stainless Steel",
    "backgroundColor": "#2C1810",
    "textColor": "#FAF8F5",
    "accentColor": "#B89A68"
  }'::jsonb
)
on conflict (key) do nothing;

-- ── 2. SEED DEFAULT POPUP CONTENT ───────────────────────────────────────────
insert into public.site_content (key, value)
values (
  'popup',
  '{
    "enabled": false,
    "imageUrl": "",
    "redirectUrl": "/shop"
  }'::jsonb
)
on conflict (key) do nothing;
