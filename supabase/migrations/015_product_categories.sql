-- ============================================================
-- VEER ELEGANCE — Migration 015: Multi-Category Product Architecture
-- Run in Supabase SQL Editor — IDEMPOTENT (safe to re-run)
--
-- Purpose:
--   1. Create public.product_categories junction table (many-to-many)
--   2. Backfill existing product categories safely
--   3. Enable RLS with public read for published products and admin write
-- ============================================================

-- ── 1. CREATE product_categories TABLE ─────────────────────────────────

create table if not exists public.product_categories (
  id          uuid        primary key default gen_random_uuid(),
  product_id  uuid        not null references public.products(id) on delete cascade,
  category_id text        not null,
  created_at  timestamptz not null default now(),
  constraint uq_product_category unique (product_id, category_id),
  constraint chk_product_category_id check (category_id in (
    'chains',
    'rings',
    'earrings',
    'bracelets',
    'bangles',
    'mystery-box',
    'gen-z-accessories'
  ))
);

-- Index for fast lookup by category
create index if not exists idx_product_categories_category_id
  on public.product_categories(category_id);

-- Index for fast lookup by product
create index if not exists idx_product_categories_product_id
  on public.product_categories(product_id);

-- ── 2. BACKFILL EXISTING PRODUCTS ──────────────────────────────────────
-- Safely inserts existing products.category into product_categories without duplication.

insert into public.product_categories (product_id, category_id)
select id, category from public.products
where category is not null
on conflict (product_id, category_id) do nothing;

-- ── 3. ROW LEVEL SECURITY ──────────────────────────────────────────────

alter table public.product_categories enable row level security;

-- Drop existing policies if any before recreating (idempotent)
drop policy if exists "product_categories_public_read"  on public.product_categories;
drop policy if exists "product_categories_admin_select" on public.product_categories;
drop policy if exists "product_categories_admin_insert" on public.product_categories;
drop policy if exists "product_categories_admin_update" on public.product_categories;
drop policy if exists "product_categories_admin_delete" on public.product_categories;

-- Public read: visible only for products that are published and not archived
create policy "product_categories_public_read"
  on public.product_categories for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_categories.product_id
        and p.published = true
        and p.archived = false
    )
  );

-- Admin SELECT (can see categories for draft/archived products too)
create policy "product_categories_admin_select"
  on public.product_categories for select
  using (
    exists (
      select 1 from public.profiles
      where id   = (select auth.uid())
        and role = 'admin'
    )
  );

-- Admin INSERT
create policy "product_categories_admin_insert"
  on public.product_categories for insert
  with check (
    exists (
      select 1 from public.profiles
      where id   = (select auth.uid())
        and role = 'admin'
    )
  );

-- Admin UPDATE
create policy "product_categories_admin_update"
  on public.product_categories for update
  using (
    exists (
      select 1 from public.profiles
      where id   = (select auth.uid())
        and role = 'admin'
    )
  );

-- Admin DELETE
create policy "product_categories_admin_delete"
  on public.product_categories for delete
  using (
    exists (
      select 1 from public.profiles
      where id   = (select auth.uid())
        and role = 'admin'
    )
  );
