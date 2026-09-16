-- ============================================================
-- VEER ELEGANCE — Product Care Instructions Toggle (020)
--
-- Adds additive show_care_instructions boolean column to public.products.
-- Default: false (preserves existing product behavior without rewrite).
-- ============================================================

alter table public.products
  add column if not exists show_care_instructions boolean not null default false;
