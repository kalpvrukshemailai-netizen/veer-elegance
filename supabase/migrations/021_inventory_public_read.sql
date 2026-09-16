-- ============================================================
-- VEER ELEGANCE — Migration 021: Inventory Public Read Policy
-- Run in Supabase SQL Editor — IDEMPOTENT (safe to re-run)
--
-- Purpose:
--   Allows anonymous / customer storefront clients to read inventory
--   (stock_quantity, low_stock_threshold) ONLY for published and
--   non-archived products.
--
-- Security:
--   - SELECT ONLY.
--   - No INSERT, UPDATE, or DELETE permissions granted to public.
--   - Existing admin policies and inventory_movements RLS preserved.
--   - Draft and archived product inventory rows remain hidden from public.
-- ============================================================

-- Drop existing public read policy if exists
drop policy if exists "inventory_public_read" on public.inventory;

-- Create public read policy for published, non-archived products
create policy "inventory_public_read"
  on public.inventory
  for select
  using (
    exists (
      select 1
      from public.products p
      where p.id = inventory.product_id
        and p.published = true
        and p.archived = false
    )
  );
