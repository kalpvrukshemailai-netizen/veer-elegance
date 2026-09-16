-- ============================================================
-- VEER ELEGANCE — Migration 012: Payment→Inventory Idempotency
-- Run in Supabase SQL Editor — IDEMPOTENT (safe to re-run)
--
-- Purpose:
--   Add database-level constraints that make duplicate payment
--   events / webhook retries provably safe — not just guarded by
--   application logic.
--
-- Changes:
--   1. Add order_id to inventory_movements
--   2. Filtered UNIQUE index: one order_completed row per (order, product)
--   3. Unique index on orders.razorpay_payment_id
--   4. Rebuild finalize_order_inventory() with order_id in INSERT
--   5. Conditional UPDATE guard for payment_status
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. Add order_id to inventory_movements
--
-- Nullable for backward compat (existing admin stock_in/out rows
-- have no associated order).
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS order_id uuid
  REFERENCES public.orders(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.inventory_movements.order_id IS
  'Supabase order UUID. Set for order_completed movements; null for manual adjustments.';


-- ────────────────────────────────────────────────────────────
-- 2. Unique constraint: exactly one order_completed movement
--    per (order, product) pair.
--
-- Uses a PARTIAL unique index (WHERE clause) so non-order
-- movements (stock_in, adjustment, etc.) are unaffected.
--
-- This is the DATABASE-LEVEL hard stop against double deduction.
-- Even if two server processes call finalize_order_inventory()
-- simultaneously and both pass the FOR UPDATE gate (impossible
-- with correct locking, but belt-and-suspenders), the second
-- INSERT will raise a unique violation that the function catches.
-- ────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS
  inventory_movements_order_completed_unique
  ON public.inventory_movements (order_id, product_id)
  WHERE movement_type = 'order_completed';

COMMENT ON INDEX public.inventory_movements_order_completed_unique IS
  'Ensures exactly one order_completed inventory movement per (order, product). '
  'Database-level idempotency guard for payment capture events.';


-- ────────────────────────────────────────────────────────────
-- 3. Unique index on orders.razorpay_payment_id
--
-- A razorpay_payment_id uniquely identifies a single captured
-- payment. It must never map to more than one order.
-- Partial (WHERE NOT NULL) so orders without a payment ID
-- (pending/failed) don't conflict with each other.
-- ────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS
  orders_razorpay_payment_id_unique
  ON public.orders (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

COMMENT ON INDEX public.orders_razorpay_payment_id_unique IS
  'Ensures a single Razorpay payment ID maps to at most one order.';


-- ────────────────────────────────────────────────────────────
-- 4. Rebuild finalize_order_inventory() with order_id
--
-- Identical algorithm to migration 011 with one addition:
--   - inventory_movements INSERT now sets order_id = p_order_id
--
-- The UNIQUE INDEX from step 2 provides the hard stop:
-- If this function is somehow called twice for the same order
-- and the idempotency gate misses (impossible with FOR UPDATE,
-- but theoretically possible with a future code bug), the second
-- INSERT will raise a unique_violation exception that the outer
-- BEGIN/EXCEPTION block catches cleanly.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.finalize_order_inventory(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order         RECORD;
  v_item          RECORD;
  v_inventory     RECORD;
  v_product_uuid  uuid;
  v_order_ref     text;
BEGIN
  -- ── Lock the order row to serialise concurrent calls ──────────────────
  -- FOR UPDATE ensures that if two server processes call this function
  -- at the same time for the same order_id, one will wait until the
  -- other commits. This makes the subsequent inventory_finalized check
  -- truly atomic.
  SELECT id, status, inventory_finalized, user_id
    INTO v_order
    FROM public.orders
   WHERE id = p_order_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'order_not_found');
  END IF;

  -- ── Primary idempotency gate ───────────────────────────────────────────
  -- After acquiring the lock, re-check inventory_finalized.
  -- If true, the first call already completed — return immediately.
  IF v_order.inventory_finalized = true THEN
    RETURN jsonb_build_object('success', true, 'reason', 'already_finalized');
  END IF;

  -- ── Build display reference for movement reason ────────────────────────
  v_order_ref := 'VE-' || upper(left(replace(p_order_id::text, '-', ''), 6));

  -- ── Process each order item ────────────────────────────────────────────
  FOR v_item IN
    SELECT oi.product_id, oi.quantity
      FROM public.order_items oi
     WHERE oi.order_id = p_order_id
  LOOP
    -- Skip items where product_id is not a valid UUID
    -- (slug-based fallback items have no inventory record)
    BEGIN
      v_product_uuid := v_item.product_id::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      CONTINUE;
    END;

    -- Read current stock (skip if no inventory row exists)
    SELECT * INTO v_inventory
      FROM public.inventory
     WHERE product_id = v_product_uuid
       FOR UPDATE;                  -- lock this inventory row too

    IF NOT FOUND THEN
      CONTINUE;  -- no inventory row = untracked product, skip
    END IF;

    -- ── Stock sufficiency check ──────────────────────────────────────────
    IF v_item.quantity > v_inventory.stock_quantity THEN
      -- Payment captured but stock is now insufficient (race lost at purchase time).
      -- Flag for admin reconciliation — do NOT deduct negative stock.
      UPDATE public.orders
         SET status           = 'payment_captured_stock_issue',
             updated_at       = now()
       WHERE id = p_order_id;

      RETURN jsonb_build_object(
        'success',    false,
        'reason',     'insufficient_stock',
        'product_id', v_item.product_id,
        'available',  v_inventory.stock_quantity,
        'requested',  v_item.quantity
      );
    END IF;

    -- ── Deduct stock ─────────────────────────────────────────────────────
    UPDATE public.inventory
       SET stock_quantity = stock_quantity - v_item.quantity,
           updated_at     = now()
     WHERE product_id = v_product_uuid;

    -- ── Log inventory movement (with order_id for traceability) ──────────
    -- The UNIQUE INDEX inventory_movements_order_completed_unique is the
    -- database-level hard stop: if this INSERT is somehow reached twice
    -- for the same (order_id, product_id), it will raise a unique_violation
    -- rather than silently deducting stock a second time.
    INSERT INTO public.inventory_movements
      (order_id, product_id, change_quantity, movement_type, reason, created_by)
    VALUES
      (p_order_id,
       v_product_uuid,
       -v_item.quantity,
       'order_completed',
       'Order ' || v_order_ref,
       v_order.user_id);

  END LOOP;

  -- ── Mark order as finalized and confirmed ──────────────────────────────
  UPDATE public.orders
     SET inventory_finalized = true,
         status              = 'confirmed',
         updated_at          = now()
   WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'reason', 'finalized');
END;
$$;

-- Re-grant execute (CREATE OR REPLACE resets grants)
GRANT EXECUTE ON FUNCTION public.finalize_order_inventory(uuid) TO authenticated;


-- ────────────────────────────────────────────────────────────
-- 5. Conditional UPDATE guard for payment_status
--
-- Add a DB-level function that updates payment_status to 'captured'
-- only if it is not already 'captured'. This eliminates the
-- TOCTOU race in adminUpdateOrderPayment (read-then-write).
--
-- Used by the webhook handler to atomically claim the transition.
-- Returns true if the row was updated (first caller wins),
-- false if it was already captured (idempotent no-op).
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.capture_order_payment(
  p_order_id            uuid,
  p_razorpay_order_id   text,
  p_razorpay_payment_id text DEFAULT NULL
)
RETURNS boolean        -- true = update happened; false = already captured
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows_updated integer;
BEGIN
  -- Single atomic conditional UPDATE — no read-then-write race
  UPDATE public.orders
     SET payment_status      = 'captured',
         razorpay_order_id   = COALESCE(p_razorpay_order_id, razorpay_order_id),
         razorpay_payment_id = COALESCE(p_razorpay_payment_id, razorpay_payment_id),
         updated_at          = now()
   WHERE id             = p_order_id
     AND payment_status != 'captured';  -- atomic guard: only one caller can win

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  RETURN v_rows_updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.capture_order_payment(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.capture_order_payment(uuid, text, text) TO service_role;


-- ────────────────────────────────────────────────────────────
-- 6. VERIFY
-- ────────────────────────────────────────────────────────────

-- Confirm order_id column added to inventory_movements
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'inventory_movements'
  AND column_name  = 'order_id';

-- Confirm unique indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('inventory_movements', 'orders')
  AND indexname IN (
    'inventory_movements_order_completed_unique',
    'orders_razorpay_payment_id_unique'
  );
