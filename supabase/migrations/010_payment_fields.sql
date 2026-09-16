-- ============================================================
-- VEER ELEGANCE — Migration 010: Payment Fields + Schema Fixes
-- Run in Supabase SQL Editor:
--   Project → SQL Editor → New query → paste → Run
--
-- IDEMPOTENT — safe to re-run at any time.
--
-- What this does:
--   1. Adds product_image_url to order_items  (was migration 009)
--   2. Adds payment_status + razorpay_* to orders
--   3. Adds UPDATE RLS policy on orders  (for /api/payments/verify)
--   4. Adds DELETE RLS policy on orders  (for orphan cleanup on error)
--   5. Adds index on razorpay_order_id
--
-- ⚠️  TEST MODE ONLY — these columns support Razorpay test payments.
--     Do NOT store live payment credentials in these fields.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. order_items: add product_image_url
--    (originally migration 009 — merged here for a single run)
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_image_url text;

COMMENT ON COLUMN public.order_items.product_image_url IS
  'Primary image URL of the product at time of order placement. Null for orders placed before migration 009.';


-- ────────────────────────────────────────────────────────────
-- 2. orders: add payment tracking columns
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status      text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS razorpay_order_id   text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
  ADD COLUMN IF NOT EXISTS razorpay_signature  text;

-- payment_status CHECK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'orders'
      AND constraint_name = 'orders_payment_status_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_payment_status_check
      CHECK (payment_status IN ('pending', 'authorized', 'captured', 'failed', 'refunded'));
  END IF;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 3. RLS: UPDATE policy on orders
--    Allows /api/payments/verify (authed as the user) to write
--    payment_status + razorpay_* back to the user's own order.
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "orders_update_payment_own" ON public.orders;

CREATE POLICY "orders_update_payment_own"
  ON public.orders FOR UPDATE
  USING  ( (SELECT auth.uid()) = user_id )
  WITH CHECK ( (SELECT auth.uid()) = user_id );


-- ────────────────────────────────────────────────────────────
-- 4. RLS: DELETE policy on orders
--    Allows /api/payments/create-order to delete an orphaned
--    order header if order_items insertion fails.
--    Scoped to own orders only — cannot delete other users'.
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "orders_delete_own" ON public.orders;

CREATE POLICY "orders_delete_own"
  ON public.orders FOR DELETE
  USING ( (SELECT auth.uid()) = user_id );


-- ────────────────────────────────────────────────────────────
-- 5. INDEX: razorpay_order_id for fast lookups in verify route
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS orders_razorpay_order_id_idx
  ON public.orders (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;


-- ────────────────────────────────────────────────────────────
-- 6. VERIFY: confirm all expected columns exist
-- ────────────────────────────────────────────────────────────

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('orders', 'order_items')
  AND column_name IN (
    'payment_status', 'razorpay_order_id', 'razorpay_payment_id',
    'razorpay_signature', 'product_image_url'
  )
ORDER BY table_name, column_name;
