-- ============================================================
-- VEER ELEGANCE — Migration 025: Customer Wishlist System
-- Run in Supabase SQL Editor — IDEMPOTENT (safe to re-run)
--
-- Purpose:
--   1. Create public.wishlists table for saved customer pieces.
--   2. Enforce unique constraint on (user_id, product_id) to prevent duplicates.
--   3. Configure RLS so customers can access only their own wishlist.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. CREATE public.wishlists TABLE
-- ────────────────────────────────────────────────────────────

create table if not exists public.wishlists (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  product_id  uuid        not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- Unique constraint: prevent duplicate wishlist records per user and product
alter table public.wishlists
  drop constraint if exists wishlists_user_product_unique;
alter table public.wishlists
  add constraint wishlists_user_product_unique unique (user_id, product_id);

-- Indexes for efficient queries
create index if not exists idx_wishlists_user_id on public.wishlists (user_id);
create index if not exists idx_wishlists_product_id on public.wishlists (product_id);

-- ────────────────────────────────────────────────────────────
-- 2. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

alter table public.wishlists enable row level security;

drop policy if exists "wishlists_select_own" on public.wishlists;
create policy "wishlists_select_own"
  on public.wishlists for select
  using ( (select auth.uid()) = user_id );

drop policy if exists "wishlists_insert_own" on public.wishlists;
create policy "wishlists_insert_own"
  on public.wishlists for insert
  with check ( (select auth.uid()) = user_id );

drop policy if exists "wishlists_delete_own" on public.wishlists;
create policy "wishlists_delete_own"
  on public.wishlists for delete
  using ( (select auth.uid()) = user_id );

grant select, insert, delete on public.wishlists to authenticated;
