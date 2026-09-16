-- ============================================================
-- VEER ELEGANCE — Migration 016: Site Content Management (Mini CMS)
-- Run in Supabase SQL Editor — IDEMPOTENT (safe to re-run)
--
-- Purpose:
--   Store structured key-value JSON content blocks for editorial pages
--   (About, Founder, Philosophy, Wholesale, Physical Store,
--    Global Footer, Contact, Social, Newsletter).
--   Public users may read site_content.
--   Only admin users may insert, update, or delete site_content.
-- ============================================================

-- ── 1. TABLE ─────────────────────────────────────────────────────────────────

create table if not exists public.site_content (
  id                uuid        primary key default gen_random_uuid(),
  key               text        unique not null,
  value             jsonb       not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  updated_by        uuid        references auth.users(id) on delete set null
);

-- ── 2. INDEXES ───────────────────────────────────────────────────────────────

create index if not exists site_content_key_idx on public.site_content (key);
create index if not exists site_content_updated_at_idx on public.site_content (updated_at desc);

-- ── 3. RLS ───────────────────────────────────────────────────────────────────

alter table public.site_content enable row level security;

-- Public / Customer / Guest SELECT: anyone can read site content
drop policy if exists "site_content_public_select" on public.site_content;
create policy "site_content_public_select"
  on public.site_content for select
  using (true);

-- Admin INSERT: only admins may create content entries
drop policy if exists "site_content_admin_insert" on public.site_content;
create policy "site_content_admin_insert"
  on public.site_content for insert
  with check (
    exists (
      select 1 from public.profiles
      where id   = (select auth.uid())
        and role = 'admin'
    )
  );

-- Admin UPDATE: only admins may update content entries
drop policy if exists "site_content_admin_update" on public.site_content;
create policy "site_content_admin_update"
  on public.site_content for update
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

-- Admin DELETE: only admins may delete content entries
drop policy if exists "site_content_admin_delete" on public.site_content;
create policy "site_content_admin_delete"
  on public.site_content for delete
  using (
    exists (
      select 1 from public.profiles
      where id   = (select auth.uid())
        and role = 'admin'
    )
  );
