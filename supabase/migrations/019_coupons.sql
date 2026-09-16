-- ============================================================
-- VEER ELEGANCE — Migration 019: Customer Coupon / Promo Code System
-- Run in Supabase SQL Editor — IDEMPOTENT (safe to re-run)
--
-- Purpose:
--   1. Create public.coupons table for promo codes.
--   2. Add coupon_code and discount_amount to public.orders.
--   3. Update finalize_order_inventory() to atomically increment coupon used_count.
--   4. Configure RLS policies on public.coupons.
--   5. Seed initial verified coupons (VEER10 and FLAT100).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. CREATE public.coupons TABLE
-- ────────────────────────────────────────────────────────────

create table if not exists public.coupons (
  id                  uuid primary key default gen_random_uuid(),
  code                text unique not null,
  discount_type       text not null,
  discount_value      numeric(12,2) not null,
  minimum_order_value numeric(12,2),
  maximum_discount    numeric(12,2),
  usage_limit         integer,
  used_count          integer not null default 0,
  starts_at           timestamptz,
  expires_at          timestamptz,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Constraints
alter table public.coupons drop constraint if exists coupons_discount_type_check;
alter table public.coupons add constraint coupons_discount_type_check
  check (discount_type in ('percentage', 'fixed'));

alter table public.coupons drop constraint if exists coupons_discount_value_check;
alter table public.coupons add constraint coupons_discount_value_check
  check (discount_value > 0);

alter table public.coupons drop constraint if exists coupons_percentage_range_check;
alter table public.coupons add constraint coupons_percentage_range_check
  check (discount_type != 'percentage' or (discount_value > 0 and discount_value <= 100));

alter table public.coupons drop constraint if exists coupons_min_order_check;
alter table public.coupons add constraint coupons_min_order_check
  check (minimum_order_value is null or minimum_order_value >= 0);

alter table public.coupons drop constraint if exists coupons_max_discount_check;
alter table public.coupons add constraint coupons_max_discount_check
  check (maximum_discount is null or maximum_discount >= 0);

alter table public.coupons drop constraint if exists coupons_usage_limit_check;
alter table public.coupons add constraint coupons_usage_limit_check
  check (usage_limit is null or usage_limit >= 0);

alter table public.coupons drop constraint if exists coupons_used_count_check;
alter table public.coupons add constraint coupons_used_count_check
  check (used_count >= 0);

-- Indexes for fast uppercase code lookup and active status filtering
create index if not exists idx_coupons_code on public.coupons (code);
create index if not exists idx_coupons_active on public.coupons (is_active) where is_active = true;


-- ────────────────────────────────────────────────────────────
-- 2. ADD ADDITIVE FIELDS TO public.orders
-- ────────────────────────────────────────────────────────────

alter table public.orders
  add column if not exists coupon_code text,
  add column if not exists discount_amount numeric(12,2) not null default 0;

comment on column public.orders.coupon_code is
  'Coupon/promo code applied at checkout. Null if no coupon.';
comment on column public.orders.discount_amount is
  'Total coupon discount in INR applied at checkout. Defaults to 0.';


-- ────────────────────────────────────────────────────────────
-- 3. UPDATE finalize_order_inventory()
--
-- Atomically increments public.coupons.used_count within the
-- same ACID transaction, protected by the inventory_finalized
-- idempotency gate.
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
  SELECT id, status, inventory_finalized, user_id, coupon_code
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

  -- ── Increment coupon usage count atomically ───────────────────────────
  IF v_order.coupon_code IS NOT NULL AND trim(v_order.coupon_code) != '' THEN
    UPDATE public.coupons
       SET used_count = used_count + 1,
           updated_at = now()
     WHERE code = upper(trim(v_order.coupon_code));
  END IF;

  -- ── Mark order as finalized and confirmed ──────────────────────────────
  UPDATE public.orders
     SET inventory_finalized = true,
         status              = 'confirmed',
         updated_at          = now()
   WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'reason', 'finalized');
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_order_inventory(uuid) TO authenticated;


-- ────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY ON public.coupons
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Admins have full access to view, create, edit, deactivate coupons
DROP POLICY IF EXISTS "coupons_admin_all" ON public.coupons;

CREATE POLICY "coupons_admin_all"
  ON public.coupons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
       WHERE profiles.id = (SELECT auth.uid())
         AND profiles.role = 'admin'
    )
  );


-- ────────────────────────────────────────────────────────────
-- 5. INITIAL SEED SAMPLE COUPONS
-- ────────────────────────────────────────────────────────────

INSERT INTO public.coupons (
  code,
  discount_type,
  discount_value,
  minimum_order_value,
  maximum_discount,
  usage_limit,
  is_active
)
VALUES
  ('VEER10',  'percentage', 10.00, 500.00, 200.00, NULL, true),
  ('FLAT100', 'fixed',      100.00, 500.00, NULL,   NULL, true)
ON CONFLICT (code) DO NOTHING;
