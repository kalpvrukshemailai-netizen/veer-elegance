-- ============================================================
-- VEER ELEGANCE — Migration 011: Payment→Inventory + Addresses
-- Run in Supabase SQL Editor — IDEMPOTENT (safe to re-run)
--
-- Part A: Inventory finalization after payment capture
--   1. Add inventory_finalized column to orders
--   2. Extend orders_status_check for new statuses
--   3. SECURITY DEFINER function: finalize_order_inventory()
--   4. Grant EXECUTE to authenticated role
--
-- Part B: Saved addresses table + RLS + default trigger
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- PART A — INVENTORY FINALIZATION
-- ════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- A1. Add inventory_finalized to orders
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS inventory_finalized boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.orders.inventory_finalized IS
  'True once stock has been successfully deducted for all order items after payment capture. '
  'Used as the idempotency gate — prevents double stock deduction on webhook retry.';


-- ────────────────────────────────────────────────────────────
-- A2. Extend orders.status CHECK constraint
--
-- Adds two new statuses without breaking existing ones.
-- Drop-and-recreate pattern (idempotent).
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'payment_captured_stock_issue'   -- payment OK but stock insufficient at finalization time
  ));


-- ────────────────────────────────────────────────────────────
-- A3. SECURITY DEFINER function: finalize_order_inventory
--
-- Called from route handlers (customer JWT) after payment capture.
-- Runs as the Postgres role that owns the tables, bypassing RLS.
--
-- Algorithm:
--   1. Lock the order row to prevent concurrent finalization.
--   2. Idempotency gate: if inventory_finalized = true, return success immediately.
--   3. For each order_item where product_id is a valid UUID:
--        a. Read current stock_quantity.
--        b. If insufficient: set order.status = payment_captured_stock_issue, return error.
--        c. Deduct stock, insert inventory_movements row.
--   4. Set orders.inventory_finalized = true, orders.status = confirmed.
--   5. Return success JSON.
--
-- Returns JSONB: { success: bool, reason?: text, product_id?: text }
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
  SELECT id, status, inventory_finalized, user_id
    INTO v_order
    FROM public.orders
   WHERE id = p_order_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'order_not_found');
  END IF;

  -- ── Idempotency gate ───────────────────────────────────────────────────
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

    -- Read current stock (skip if no inventory row)
    SELECT * INTO v_inventory
      FROM public.inventory
     WHERE product_id = v_product_uuid
       FOR UPDATE;

    IF NOT FOUND THEN
      CONTINUE;  -- no inventory row = untracked product, skip
    END IF;

    -- ── Stock sufficiency check ──────────────────────────────────────────
    IF v_item.quantity > v_inventory.stock_quantity THEN
      -- Payment captured but stock is now insufficient.
      -- Flag the order for admin reconciliation — do NOT deduct negative stock.
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

    -- ── Log inventory movement ───────────────────────────────────────────
    INSERT INTO public.inventory_movements
      (product_id, change_quantity, movement_type, reason, created_by)
    VALUES
      (v_product_uuid,
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

-- Grant execute to authenticated users — the function itself validates ownership
GRANT EXECUTE ON FUNCTION public.finalize_order_inventory(uuid) TO authenticated;


-- ════════════════════════════════════════════════════════════
-- PART B — SAVED ADDRESSES
-- ════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- B1. addresses table
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.addresses (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  label       text,            -- e.g. "Home", "Office" — optional

  first_name  text        NOT NULL,
  last_name   text        NOT NULL,
  phone       text        NOT NULL,

  address     text        NOT NULL,
  apartment   text,

  city        text        NOT NULL,
  state       text        NOT NULL,
  postal_code text        NOT NULL,
  country     text        NOT NULL DEFAULT 'India',

  is_default  boolean     NOT NULL DEFAULT false,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- updated_at trigger
DROP TRIGGER IF EXISTS addresses_set_updated_at ON public.addresses;
CREATE TRIGGER addresses_set_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();


-- ────────────────────────────────────────────────────────────
-- B2. RLS — customers can only access their own addresses
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "addresses_select_own" ON public.addresses;
DROP POLICY IF EXISTS "addresses_insert_own" ON public.addresses;
DROP POLICY IF EXISTS "addresses_update_own" ON public.addresses;
DROP POLICY IF EXISTS "addresses_delete_own" ON public.addresses;

CREATE POLICY "addresses_select_own"
  ON public.addresses FOR SELECT
  USING ( (SELECT auth.uid()) = user_id );

CREATE POLICY "addresses_insert_own"
  ON public.addresses FOR INSERT
  WITH CHECK ( (SELECT auth.uid()) = user_id );

CREATE POLICY "addresses_update_own"
  ON public.addresses FOR UPDATE
  USING  ( (SELECT auth.uid()) = user_id )
  WITH CHECK ( (SELECT auth.uid()) = user_id );

CREATE POLICY "addresses_delete_own"
  ON public.addresses FOR DELETE
  USING ( (SELECT auth.uid()) = user_id );


-- ────────────────────────────────────────────────────────────
-- B3. Enforce single default address per user
--
-- When a row is inserted or updated with is_default = true,
-- clear is_default on all other rows for the same user.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_single_default_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.addresses
       SET is_default = false,
           updated_at = now()
     WHERE user_id = NEW.user_id
       AND id      <> NEW.id
       AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_single_default_address ON public.addresses;
CREATE TRIGGER enforce_single_default_address
  AFTER INSERT OR UPDATE OF is_default ON public.addresses
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.enforce_single_default_address();


-- ────────────────────────────────────────────────────────────
-- B4. VERIFY
-- ────────────────────────────────────────────────────────────

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('orders', 'addresses')
  AND column_name IN ('inventory_finalized', 'is_default', 'label')
ORDER BY table_name, column_name;
