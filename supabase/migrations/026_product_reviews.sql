-- ============================================================
-- VEER ELEGANCE — Migration 026: Product Reviews & Ratings
-- Run in Supabase SQL Editor — IDEMPOTENT (safe to re-run)
--
-- Purpose:
--   1. Create public.product_reviews table.
--   2. Enforce unique constraint (user_id, product_id) to prevent duplicates.
--   3. Create review-photos storage bucket & access policies.
--   4. Configure RLS:
--      - Public can read APPROVED reviews only.
--      - Authenticated authors can view, insert, update, delete their own reviews.
--      - Admins can view, moderate (approve/reject), and delete all reviews.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. CREATE public.product_reviews TABLE
-- ────────────────────────────────────────────────────────────

create table if not exists public.product_reviews (
  id                 uuid        primary key default gen_random_uuid(),
  product_id         uuid        not null references public.products(id) on delete cascade,
  user_id            uuid        not null references auth.users(id) on delete cascade,
  order_id           uuid        references public.orders(id) on delete set null,
  rating             integer     not null check (rating >= 1 and rating <= 5),
  review_text        text        not null,
  image_url          text,
  status             text        not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  verified_purchase  boolean     not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Unique constraint: prevent duplicate reviews per customer and product
alter table public.product_reviews
  drop constraint if exists product_reviews_user_product_unique;
alter table public.product_reviews
  add constraint product_reviews_user_product_unique unique (user_id, product_id);

-- Indexes for efficient queries
create index if not exists idx_product_reviews_product_id on public.product_reviews (product_id);
create index if not exists idx_product_reviews_user_id on public.product_reviews (user_id);
create index if not exists idx_product_reviews_status on public.product_reviews (status);
create index if not exists idx_product_reviews_created_at on public.product_reviews (created_at desc);

-- ────────────────────────────────────────────────────────────
-- 2. STORAGE BUCKET: review-photos
-- ───────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-photos',
  'review-photos',
  true,
  5242880, -- 5 MB max per file
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public              = true,
  file_size_limit     = 5242880,
  allowed_mime_types  = array['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Storage policy: public READ (allow any request for approved review images)
drop policy if exists "review_photos_public_read" on storage.objects;
create policy "review_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'review-photos');

-- Storage policy: authenticated user INSERT (upload customer review photo)
drop policy if exists "review_photos_authenticated_insert" on storage.objects;
create policy "review_photos_authenticated_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'review-photos'
    and (select auth.uid()) is not null
  );

-- Storage policy: authenticated user DELETE (clean up review photo)
drop policy if exists "review_photos_authenticated_delete" on storage.objects;
create policy "review_photos_authenticated_delete"
  on storage.objects for delete
  using (
    bucket_id = 'review-photos'
    and (
      (select auth.uid()) is not null
      or exists (
        select 1 from public.profiles
        where id = (select auth.uid())
          and role = 'admin'
      )
    )
  );

-- ────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY ON public.product_reviews
-- ────────────────────────────────────────────────────────────

alter table public.product_reviews enable row level security;

-- 3.1. Public: read APPROVED reviews only
drop policy if exists "product_reviews_public_read_approved" on public.product_reviews;
create policy "product_reviews_public_read_approved"
  on public.product_reviews for select
  using (status = 'approved');

-- 3.2. Customer: view own reviews regardless of status
drop policy if exists "product_reviews_select_own" on public.product_reviews;
create policy "product_reviews_select_own"
  on public.product_reviews for select
  using ((select auth.uid()) = user_id);

-- 3.3. Customer: insert own review
drop policy if exists "product_reviews_insert_own" on public.product_reviews;
create policy "product_reviews_insert_own"
  on public.product_reviews for insert
  with check ((select auth.uid()) = user_id);

-- 3.4. Customer: update own review
drop policy if exists "product_reviews_update_own" on public.product_reviews;
create policy "product_reviews_update_own"
  on public.product_reviews for update
  using ((select auth.uid()) = user_id);

-- 3.5. Customer: delete own review
drop policy if exists "product_reviews_delete_own" on public.product_reviews;
create policy "product_reviews_delete_own"
  on public.product_reviews for delete
  using ((select auth.uid()) = user_id);

-- 3.6. Admin: view all reviews
drop policy if exists "product_reviews_admin_select" on public.product_reviews;
create policy "product_reviews_admin_select"
  on public.product_reviews for select
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and role = 'admin'
    )
  );

-- 3.7. Admin: update review status (approve / reject)
drop policy if exists "product_reviews_admin_update" on public.product_reviews;
create policy "product_reviews_admin_update"
  on public.product_reviews for update
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and role = 'admin'
    )
  );

-- 3.8. Admin: delete any review
drop policy if exists "product_reviews_admin_delete" on public.product_reviews;
create policy "product_reviews_admin_delete"
  on public.product_reviews for delete
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and role = 'admin'
    )
  );

grant select on public.product_reviews to anon, authenticated;
grant insert, update, delete on public.product_reviews to authenticated;
