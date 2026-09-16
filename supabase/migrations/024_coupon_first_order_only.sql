-- ============================================================
-- VEER ELEGANCE — Migration 024: First Order Only Coupon Restriction
-- Run in Supabase SQL Editor — IDEMPOTENT (safe to re-run)
--
-- Purpose:
--   Add first_order_only column to public.coupons table.
--   Defaults to false so all existing coupons retain existing behavior.
-- ============================================================

alter table public.coupons
  add column if not exists first_order_only boolean not null default false;

comment on column public.coupons.first_order_only is
  'When true, coupon is restricted to customers placing their first successful order.';

-- Optional index to speed up customer completed order count lookups
create index if not exists idx_orders_user_status_payment
  on public.orders (user_id, status, payment_status);
