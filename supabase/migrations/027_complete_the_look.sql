-- ============================================================
-- VEER ELEGANCE — Migration 027: Complete the Look System (Step 1)
-- Run in Supabase SQL Editor — IDEMPOTENT (safe to re-run)
--
-- Purpose:
--   1. Create public.complete_the_look_sets table.
--   2. Create public.complete_the_look_items table.
--   3. Configure cascade behavior, constraints, and indexes.
--   4. Configure RLS:
--      - Public/storefront can read enabled sets and items.
--      - Admins have full access (select, insert, update, delete).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. CREATE public.complete_the_look_sets TABLE
-- ────────────────────────────────────────────────────────────

create table if not exists public.complete_the_look_sets (
  id                 uuid           primary key default gen_random_uuid(),
  base_product_id    uuid           not null references public.products(id) on delete cascade,
  bundle_price       numeric(12,2)  not null check (bundle_price > 0),
  enabled            boolean        not null default false,
  coupon_allowed     boolean        not null default true,
  created_at         timestamptz    not null default now(),
  updated_at         timestamptz    not null default now(),

  -- One curated look per base product
  constraint ctl_sets_base_product_unique unique (base_product_id)
);

-- ────────────────────────────────────────────────────────────
-- 2. CREATE public.complete_the_look_items TABLE
-- ────────────────────────────────────────────────────────────

create table if not exists public.complete_the_look_items (
  id             uuid        primary key default gen_random_uuid(),
  set_id         uuid        not null references public.complete_the_look_sets(id) on delete cascade,
  product_id     uuid        not null references public.products(id) on delete cascade,
  display_order  integer     not null default 0,
  created_at     timestamptz not null default now(),

  -- Prevent duplicate products within the same look set
  constraint ctl_items_set_product_unique unique (set_id, product_id)
);

-- ────────────────────────────────────────────────────────────
-- 3. INDEXES
-- ────────────────────────────────────────────────────────────

create index if not exists idx_ctl_sets_base_product_id
  on public.complete_the_look_sets(base_product_id);

create index if not exists idx_ctl_sets_enabled
  on public.complete_the_look_sets(enabled);

create index if not exists idx_ctl_items_set_id
  on public.complete_the_look_items(set_id);

create index if not exists idx_ctl_items_product_id
  on public.complete_the_look_items(product_id);

create index if not exists idx_ctl_items_display_order
  on public.complete_the_look_items(set_id, display_order);

-- ────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY (RLS)
-- ────────────────────────────────────────────────────────────

alter table public.complete_the_look_sets enable row level security;
alter table public.complete_the_look_items enable row level security;

-- Drop existing policies before recreating (idempotent)
drop policy if exists "ctl_sets_public_read_enabled" on public.complete_the_look_sets;
drop policy if exists "ctl_sets_admin_all" on public.complete_the_look_sets;
drop policy if exists "ctl_items_public_read" on public.complete_the_look_items;
drop policy if exists "ctl_items_admin_all" on public.complete_the_look_items;

-- ── complete_the_look_sets policies ──

-- Public / storefront visitors can read enabled look sets
create policy "ctl_sets_public_read_enabled"
  on public.complete_the_look_sets for select
  using ( enabled = true );

-- Admins can view and manage all look sets
create policy "ctl_sets_admin_all"
  on public.complete_the_look_sets for all
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and role = 'admin'
    )
  );

-- ── complete_the_look_items policies ──

-- Public / storefront visitors can read items belonging to enabled sets
create policy "ctl_items_public_read"
  on public.complete_the_look_items for select
  using (
    exists (
      select 1 from public.complete_the_look_sets s
      where s.id = set_id
        and s.enabled = true
    )
  );

-- Admins can view and manage all look items
create policy "ctl_items_admin_all"
  on public.complete_the_look_items for all
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and role = 'admin'
    )
  );

-- Grants
grant select on public.complete_the_look_sets to anon, authenticated;
grant insert, update, delete on public.complete_the_look_sets to authenticated;

grant select on public.complete_the_look_items to anon, authenticated;
grant insert, update, delete on public.complete_the_look_items to authenticated;
