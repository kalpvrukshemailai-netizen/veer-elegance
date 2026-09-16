-- ============================================================
-- VEER ELEGANCE — Migration 028: Order Complete the Look Snapshot
-- Run in Supabase SQL Editor — IDEMPOTENT (safe to re-run)
--
-- Purpose:
--   Add complete_the_look_snapshot column to public.orders
--   to record authoritative bundle metadata at order placement time.
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS complete_the_look_snapshot jsonb NULL;

COMMENT ON COLUMN public.orders.complete_the_look_snapshot IS
  'Snapshot of Complete-the-Look bundle at time of order (setId, bundlePrice, individualTotal, savings, productIds, couponAllowed). Real items remain in order_items.';
