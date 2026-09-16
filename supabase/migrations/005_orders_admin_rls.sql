-- ============================================================
-- VEER ELEGANCE — Orders Admin RLS Policies (005)
-- Adds admin SELECT + UPDATE policies to public.orders and
-- public.order_items so the admin dashboard can read all orders.
--
-- Run in Supabase SQL Editor.
-- Safe to re-run: uses DROP IF EXISTS before recreating.
-- ============================================================

-- ── ORDERS — admin policies ───────────────────────────────────────────────────

-- Admin may SELECT any order (existing policy only lets customers see their own)
drop policy if exists "orders_admin_select" on public.orders;
create policy "orders_admin_select"
  on public.orders for select
  using (
    exists (
      select 1 from public.profiles
      where id   = (select auth.uid())
        and role = 'admin'
    )
  );

-- Admin may UPDATE order status (customers cannot touch this)
drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update"
  on public.orders for update
  using (
    exists (
      select 1 from public.profiles
      where id   = (select auth.uid())
        and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id   = (select auth.uid())
        and role = 'admin'
    )
  );

-- ── ORDER_ITEMS — admin SELECT policy ─────────────────────────────────────────

drop policy if exists "order_items_admin_select" on public.order_items;
create policy "order_items_admin_select"
  on public.order_items for select
  using (
    exists (
      select 1 from public.profiles
      where id   = (select auth.uid())
        and role = 'admin'
    )
  );

-- ── VERIFY policies ───────────────────────────────────────────────────────────
select
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where tablename in ('orders', 'order_items')
order by tablename, policyname;
