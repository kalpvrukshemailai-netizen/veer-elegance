-- ============================================================
-- VEER ELEGANCE — Database Schema
-- Run this in the Supabase SQL Editor (dashboard.supabase.com)
-- Project → SQL Editor → New query → paste → Run
--
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. PROFILES
-- ────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  first_name   text,
  last_name    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;

-- Drop existing policies before recreating (idempotent)
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select
  using ( (select auth.uid()) = id );

create policy "profiles_insert_own"
  on public.profiles for insert
  with check ( (select auth.uid()) = id );

create policy "profiles_update_own"
  on public.profiles for update
  using ( (select auth.uid()) = id );


-- ────────────────────────────────────────────────────────────
-- 2. AUTO-PROFILE TRIGGER
--    Creates a profile row whenever a new user is confirmed.
--    Reads first_name / last_name from raw_user_meta_data
--    (populated by our SignupForm via supabase.auth.signUp options.data).
-- ────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  )
  on conflict (id) do nothing;   -- safe if trigger fires more than once
  return new;
end;
$$;

-- Drop and recreate trigger (idempotent)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ────────────────────────────────────────────────────────────
-- 3. ORDERS
-- ────────────────────────────────────────────────────────────

create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,

  -- Status lifecycle: pending → confirmed → processing → shipped → delivered | cancelled
  status              text not null default 'pending',

  -- Financials (INR)
  currency            text not null default 'INR',
  subtotal            numeric(12,2) not null default 0,
  shipping_amount     numeric(12,2) not null default 0,
  total_amount        numeric(12,2) not null default 0,

  -- Customer contact snapshot (historical — independent of current profile)
  customer_email      text,
  customer_phone      text,

  -- Shipping address snapshot
  shipping_first_name  text,
  shipping_last_name   text,
  shipping_address     text,
  shipping_apartment   text,
  shipping_city        text,
  shipping_state       text,
  shipping_postal_code text,
  shipping_country     text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- RLS
alter table public.orders enable row level security;

drop policy if exists "orders_select_own"  on public.orders;
drop policy if exists "orders_insert_own"  on public.orders;

-- Customers may only read their own orders
create policy "orders_select_own"
  on public.orders for select
  using ( (select auth.uid()) = user_id );

-- Customers may INSERT their own orders (server-side API route runs as authed user)
-- Financial fields and user_id are set server-side — client cannot fake them
create policy "orders_insert_own"
  on public.orders for insert
  with check ( (select auth.uid()) = user_id );

-- NO update/delete policy for customers — status updates are admin-only (future)


-- ────────────────────────────────────────────────────────────
-- 4. ORDER ITEMS
-- ────────────────────────────────────────────────────────────

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,

  -- Product snapshot — stored at order time for historical integrity
  -- If the product is later renamed/removed, this record stays correct
  product_id    text not null,
  product_name  text,
  product_slug  text,

  quantity      integer not null,
  unit_price    numeric(12,2),   -- null when price was not yet set
  line_total    numeric(12,2),   -- null when unit_price is null

  created_at    timestamptz not null default now()
);

-- RLS
alter table public.order_items enable row level security;

drop policy if exists "order_items_select_own" on public.order_items;
drop policy if exists "order_items_insert_own" on public.order_items;

-- Users may only read items that belong to their own orders
create policy "order_items_select_own"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.user_id = (select auth.uid())
    )
  );

-- Allow insert when the parent order belongs to the authenticated user
create policy "order_items_insert_own"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.user_id = (select auth.uid())
    )
  );


-- ────────────────────────────────────────────────────────────
-- 5. UPDATED_AT TRIGGER (orders)
-- ────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute procedure public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
