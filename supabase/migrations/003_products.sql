-- ============================================================
-- VEER ELEGANCE — Products Table + RLS + Chain Data Migration
-- Run in Supabase SQL Editor
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT DO NOTHING
-- ============================================================


-- ── 1. CREATE products TABLE ──────────────────────────────────────────

create table if not exists public.products (
  id                uuid        primary key default gen_random_uuid(),
  slug              text        unique not null,
  name              text        not null,
  category          text        not null,
  price             numeric(12,2),             -- null = not yet priced
  currency          text        not null default 'INR',
  short_description text,
  description       text,
  material          text,
  anti_tarnish      boolean     not null default true,
  featured          boolean     not null default false,
  published         boolean     not null default false,
  archived          boolean     not null default false,
  image_url         text,
  display_order     integer     not null default 999,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Category constraint
alter table public.products
  drop constraint if exists products_category_check;

alter table public.products
  add constraint products_category_check
  check (category in ('chains', 'rings', 'earrings', 'bracelets'));

-- Currency constraint  
alter table public.products
  drop constraint if exists products_currency_check;

alter table public.products
  add constraint products_currency_check
  check (currency in ('INR'));


-- ── 2. UPDATED_AT TRIGGER ──────────────────────────────────────────────

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute procedure public.set_updated_at();


-- ── 3. ROW LEVEL SECURITY ──────────────────────────────────────────────

alter table public.products enable row level security;

-- Drop all existing policies before recreating (idempotent)
drop policy if exists "products_public_read"  on public.products;
drop policy if exists "products_admin_select" on public.products;
drop policy if exists "products_admin_insert" on public.products;
drop policy if exists "products_admin_update" on public.products;

-- Public/customer: only published + non-archived products are visible
create policy "products_public_read"
  on public.products for select
  using (
    published = true
    and archived = false
  );

-- Admin SELECT: can see everything (including unpublished/archived)
create policy "products_admin_select"
  on public.products for select
  using (
    exists (
      select 1 from public.profiles
      where id   = (select auth.uid())
        and role = 'admin'
    )
  );

-- Admin INSERT
create policy "products_admin_insert"
  on public.products for insert
  with check (
    exists (
      select 1 from public.profiles
      where id   = (select auth.uid())
        and role = 'admin'
    )
  );

-- Admin UPDATE (includes archive, publish/unpublish, edit)
create policy "products_admin_update"
  on public.products for update
  using (
    exists (
      select 1 from public.profiles
      where id   = (select auth.uid())
        and role = 'admin'
    )
  );

-- Note: No DELETE policy — products are archived, never hard-deleted.


-- ── 4. MIGRATE EXISTING CHAIN PRODUCTS ────────────────────────────────
-- Only inserts if the slug doesn't exist yet (safe re-run via ON CONFLICT).
-- Prices omitted — not yet verified by brand team.
-- Images use existing /images/products/chains/ paths.

insert into public.products
  (slug, name, category, currency, anti_tarnish, featured, published, archived, image_url, display_order)
values
  ('chain-01', 'Chain 01', 'chains', 'INR', true, true,  true, false, '/images/products/chains/chain-01.jpeg', 1),
  ('chain-02', 'Chain 02', 'chains', 'INR', true, true,  true, false, '/images/products/chains/chain-02.jpeg', 2),
  ('chain-03', 'Chain 03', 'chains', 'INR', true, true,  true, false, '/images/products/chains/chain-03.jpeg', 3),
  ('chain-04', 'Chain 04', 'chains', 'INR', true, true,  true, false, '/images/products/chains/chain-04.jpeg', 4),
  ('chain-05', 'Chain 05', 'chains', 'INR', true, true,  true, false, '/images/products/chains/chain-05.jpeg', 5),
  ('chain-06', 'Chain 06', 'chains', 'INR', true, true,  true, false, '/images/products/chains/chain-06.jpeg', 6),
  ('chain-07', 'Chain 07', 'chains', 'INR', true, false, true, false, '/images/products/chains/chain-07.jpeg', 7),
  ('chain-08', 'Chain 08', 'chains', 'INR', true, false, true, false, '/images/products/chains/chain-08.jpeg', 8),
  ('chain-09', 'Chain 09', 'chains', 'INR', true, false, true, false, '/images/products/chains/chain-09.jpeg', 9)
on conflict (slug) do nothing;


-- ── 5. VERIFY ──────────────────────────────────────────────────────────

select
  id,
  slug,
  name,
  category,
  price,
  published,
  featured,
  archived,
  display_order
from public.products
order by display_order;
