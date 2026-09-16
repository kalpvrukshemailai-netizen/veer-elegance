-- ============================================================
-- VEER ELEGANCE — Inventory Schema
-- Run in Supabase SQL Editor
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT DO NOTHING
-- ============================================================


-- ── 1. INVENTORY TABLE ────────────────────────────────────────────────

create table if not exists public.inventory (
  id                   uuid        primary key default gen_random_uuid(),
  product_id           uuid        not null references public.products(id) on delete cascade,
  stock_quantity       integer     not null default 0,
  low_stock_threshold  integer     not null default 5,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint inventory_product_unique unique (product_id),
  constraint inventory_stock_non_negative check (stock_quantity >= 0),
  constraint inventory_threshold_positive  check (low_stock_threshold >= 0)
);

-- updated_at trigger
drop trigger if exists inventory_set_updated_at on public.inventory;
create trigger inventory_set_updated_at
  before update on public.inventory
  for each row execute procedure public.set_updated_at();


-- ── 2. INVENTORY MOVEMENTS TABLE ──────────────────────────────────────

create table if not exists public.inventory_movements (
  id               uuid        primary key default gen_random_uuid(),
  product_id       uuid        not null references public.products(id) on delete cascade,
  change_quantity  integer     not null,
  movement_type    text        not null,
  reason           text,
  created_by       uuid        references auth.users(id),
  created_at       timestamptz not null default now(),

  constraint inventory_movements_type_check
    check (movement_type in (
      'stock_in',
      'stock_out',
      'adjustment',
      'order_reserved',
      'order_released',
      'order_completed'
    ))
);


-- ── 3. RLS — INVENTORY ────────────────────────────────────────────────

alter table public.inventory enable row level security;

drop policy if exists "inventory_admin_select" on public.inventory;
drop policy if exists "inventory_admin_insert" on public.inventory;
drop policy if exists "inventory_admin_update" on public.inventory;

-- Admins: full access
create policy "inventory_admin_select"
  on public.inventory for select
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'admin'
    )
  );

create policy "inventory_admin_insert"
  on public.inventory for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'admin'
    )
  );

create policy "inventory_admin_update"
  on public.inventory for update
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'admin'
    )
  );

-- Customers: no access (no policy = no access under RLS)


-- ── 4. RLS — INVENTORY MOVEMENTS ──────────────────────────────────────

alter table public.inventory_movements enable row level security;

drop policy if exists "inv_movements_admin_select" on public.inventory_movements;
drop policy if exists "inv_movements_admin_insert" on public.inventory_movements;

create policy "inv_movements_admin_select"
  on public.inventory_movements for select
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'admin'
    )
  );

create policy "inv_movements_admin_insert"
  on public.inventory_movements for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'admin'
    )
  );


-- ── 5. SEED INVENTORY ROWS FOR EXISTING PRODUCTS ──────────────────────
-- stock_quantity = 0 (not fabricated — admin enters real stock later)
-- ON CONFLICT DO NOTHING = safe re-run

insert into public.inventory (product_id, stock_quantity, low_stock_threshold)
select p.id, 0, 5
from public.products p
where not exists (
  select 1 from public.inventory i where i.product_id = p.id
)
on conflict (product_id) do nothing;


-- ── 6. AUTO-CREATE INVENTORY ON NEW PRODUCT ───────────────────────────
-- Trigger: whenever a new product is inserted, create its inventory row.

create or replace function public.handle_new_product()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.inventory (product_id, stock_quantity, low_stock_threshold)
  values (new.id, 0, 5)
  on conflict (product_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_product_created on public.products;
create trigger on_product_created
  after insert on public.products
  for each row execute procedure public.handle_new_product();


-- ── 7. VERIFY ──────────────────────────────────────────────────────────

select
  p.slug,
  p.name,
  i.stock_quantity,
  i.low_stock_threshold,
  i.updated_at
from public.inventory i
join public.products p on p.id = i.product_id
order by p.display_order;
