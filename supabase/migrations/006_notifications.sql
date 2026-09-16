-- ============================================================
-- VEER ELEGANCE — Notifications (006)
--
-- Admin-facing notification center.
-- RLS: only admin users may select/update.
-- Run in Supabase SQL Editor.
-- ============================================================

-- ── TABLE ──────────────────────────────────────────────────────────────────────

create table if not exists public.notifications (
  id               uuid        primary key default gen_random_uuid(),
  type             text        not null,        -- new_order | low_stock | out_of_stock | order_status | system
  title            text        not null,
  message          text        not null,
  reference_id     text,                        -- orderId or productId
  reference_type   text,                        -- 'order' | 'product'
  is_read          boolean     not null default false,
  created_at       timestamptz not null default now(),
  -- future: targeted user notifications
  user_id          uuid        references auth.users(id) on delete set null
);

-- Index for quick unread count
create index if not exists notifications_is_read_idx on public.notifications (is_read);
create index if not exists notifications_created_at_idx on public.notifications (created_at desc);

-- ── DEDUPLICATION: unique constraint per reference to prevent duplicate events ──
-- Prevents creating duplicate new_order notifications for the same order ID.
create unique index if not exists notifications_ref_type_unique
  on public.notifications (type, reference_id)
  where reference_id is not null;

-- ── RLS ────────────────────────────────────────────────────────────────────────

alter table public.notifications enable row level security;

-- Admin SELECT — read all notifications
drop policy if exists "notifications_admin_select" on public.notifications;
create policy "notifications_admin_select"
  on public.notifications for select
  using (
    exists (
      select 1 from public.profiles
      where id   = (select auth.uid())
        and role = 'admin'
    )
  );

-- Admin UPDATE — can mark notifications read/unread
drop policy if exists "notifications_admin_update" on public.notifications;
create policy "notifications_admin_update"
  on public.notifications for update
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

-- INSERT: trusted server-side code uses the session client.
-- Admins may insert (for manual/test scenarios).
drop policy if exists "notifications_admin_insert" on public.notifications;
create policy "notifications_admin_insert"
  on public.notifications for insert
  with check (
    exists (
      select 1 from public.profiles
      where id   = (select auth.uid())
        and role = 'admin'
    )
  );

-- ── VERIFY ─────────────────────────────────────────────────────────────────────
select tablename, policyname, cmd
from pg_policies
where tablename = 'notifications'
order by policyname;
