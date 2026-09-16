-- ============================================================
-- VEER ELEGANCE — Product Images (007)
--
-- Creates public.product_images table and Supabase Storage
-- bucket policies for product-images.
--
-- Storage strategy: PUBLIC BUCKET with admin-only write.
-- Customers read directly via public CDN URL (fast, no signed URL expiry).
-- Only admins may insert/update/delete objects.
--
-- Run in Supabase SQL Editor.
-- ============================================================

-- ── 1. PRODUCT IMAGES TABLE ────────────────────────────────────────────────

create table if not exists public.product_images (
  id           uuid        primary key default gen_random_uuid(),
  product_id   uuid        not null references public.products(id) on delete cascade,
  storage_path text        not null,              -- e.g. products/{productId}/{filename}
  public_url   text,                              -- cached CDN URL
  sort_order   integer     not null default 0,    -- 0 = primary image
  created_at   timestamptz not null default now()
);

create index if not exists product_images_product_id_idx on public.product_images (product_id);
create index if not exists product_images_sort_order_idx on public.product_images (product_id, sort_order);

-- ── 2. RLS ON PRODUCT_IMAGES ───────────────────────────────────────────────

alter table public.product_images enable row level security;

-- Public SELECT: anyone can read image metadata for published products
drop policy if exists "product_images_public_select" on public.product_images;
create policy "product_images_public_select"
  on public.product_images for select
  using (true);   -- Storage CDN handles actual image access; metadata is not sensitive

-- Admin INSERT
drop policy if exists "product_images_admin_insert" on public.product_images;
create policy "product_images_admin_insert"
  on public.product_images for insert
  with check (
    exists (
      select 1 from public.profiles
      where id   = (select auth.uid())
        and role = 'admin'
    )
  );

-- Admin UPDATE (reorder, set primary)
drop policy if exists "product_images_admin_update" on public.product_images;
create policy "product_images_admin_update"
  on public.product_images for update
  using (
    exists (
      select 1 from public.profiles
      where id   = (select auth.uid())
        and role = 'admin'
    )
  );

-- Admin DELETE
drop policy if exists "product_images_admin_delete" on public.product_images;
create policy "product_images_admin_delete"
  on public.product_images for delete
  using (
    exists (
      select 1 from public.profiles
      where id   = (select auth.uid())
        and role = 'admin'
    )
  );

-- ── 3. STORAGE BUCKET + POLICIES ──────────────────────────────────────────
-- Run these in Supabase Dashboard → Storage → New bucket OR via SQL below.
-- The bucket must be PUBLIC so product image URLs work without signed URLs.

-- Create bucket (idempotent — safe to re-run)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,                                    -- PUBLIC: CDN URLs work without auth
  5242880,                                 -- 5 MB max per file
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public              = true,
  file_size_limit     = 5242880,
  allowed_mime_types  = array['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Storage policy: public READ (allow any request)
drop policy if exists "product_images_storage_public_read" on storage.objects;
create policy "product_images_storage_public_read"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Storage policy: admin INSERT (upload)
drop policy if exists "product_images_storage_admin_insert" on storage.objects;
create policy "product_images_storage_admin_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.profiles
      where id   = (select auth.uid())
        and role = 'admin'
    )
  );

-- Storage policy: admin UPDATE (replace/overwrite)
drop policy if exists "product_images_storage_admin_update" on storage.objects;
create policy "product_images_storage_admin_update"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.profiles
      where id   = (select auth.uid())
        and role = 'admin'
    )
  );

-- Storage policy: admin DELETE
drop policy if exists "product_images_storage_admin_delete" on storage.objects;
create policy "product_images_storage_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.profiles
      where id   = (select auth.uid())
        and role = 'admin'
    )
  );

-- ── 4. VERIFY ─────────────────────────────────────────────────────────────
select tablename, policyname, cmd
from pg_policies
where tablename in ('product_images')
order by tablename, policyname;
