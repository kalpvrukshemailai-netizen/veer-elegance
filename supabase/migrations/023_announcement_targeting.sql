-- ============================================================
-- VEER ELEGANCE — Migration 023: Announcement Targeting & Custom URLs
-- Run in Supabase SQL Editor — IDEMPOTENT (safe to re-run)
--
-- Purpose:
--   Update existing announcement content in public.site_content
--   to ensure displayTargets (default: ["all"]) and customUrls (default: [])
--   are present in the jsonb payload.
-- ============================================================

update public.site_content
set value = value || '{
  "displayTargets": ["all"],
  "customUrls": []
}'::jsonb
where key = 'announcement'
  and (value->>'displayTargets' is null or value->>'customUrls' is null);

-- Ensure default record exists if not already present
insert into public.site_content (key, value)
values (
  'announcement',
  '{
    "enabled": false,
    "text": "✨ Festive Elegance: Enjoy 15% off with code VEER15 • Free express shipping on orders over ₹1,999 • 100% Anti-Tarnish Stainless Steel",
    "backgroundColor": "#2C1810",
    "textColor": "#FAF8F5",
    "accentColor": "#B89A68",
    "displayTargets": ["all"],
    "customUrls": []
  }'::jsonb
)
on conflict (key) do nothing;
