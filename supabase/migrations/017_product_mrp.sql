-- ============================================================
-- VEER ELEGANCE — Migration 017: Product MRP / Compare-at Price
-- Run in Supabase SQL Editor — IDEMPOTENT (safe to re-run)
--
-- Purpose:
--   1. Add nullable numeric field `mrp` for compare-at / original price.
--   2. Preserve existing `price` field as the canonical SELLING PRICE.
--   3. Enforce check constraints:
--      - mrp must be > 0 if provided.
--      - mrp must be >= price when both are provided.
-- ============================================================

-- ── 1. ADD mrp COLUMN ────────────────────────────────────────────────────────

alter table public.products
  add column if not exists mrp numeric(12,2);

-- ── 2. ADD CONSTRAINTS ───────────────────────────────────────────────────────

-- Drop existing constraints if already defined to allow idempotent re-run
alter table public.products
  drop constraint if exists products_mrp_check;

alter table public.products
  add constraint products_mrp_check
  check (mrp is null or mrp > 0);

alter table public.products
  drop constraint if exists products_mrp_price_check;

alter table public.products
  add constraint products_mrp_price_check
  check (mrp is null or price is null or mrp >= price);

-- ── 3. INDEX (OPTIONAL FOR FAST LOOKUP / FILTERING) ──────────────────────────

create index if not exists idx_products_mrp
  on public.products(mrp)
  where mrp is not null;
