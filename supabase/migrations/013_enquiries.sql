-- ============================================================
-- VEER ELEGANCE — Migration 013: Wholesale & Business Enquiries
-- Run in Supabase SQL Editor — IDEMPOTENT (safe to re-run)
--
-- Purpose:
--   Store B2B, wholesale, retailer, and bulk enquiries submitted
--   through the public website.
--   Public users may insert enquiries (as guest or authenticated).
--   Only admin users may select or update enquiries.
-- ============================================================

-- ── 1. TABLE ─────────────────────────────────────────────────────────────────

create table if not exists public.enquiries (
  id                uuid        primary key default gen_random_uuid(),
  full_name         text        not null,
  business_name     text,
  email             text        not null,
  phone             text        not null,
  city              text,
  country           text,
  enquiry_type      text        not null,
  expected_quantity integer,
  message           text        not null,
  status            text        not null default 'new',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint enquiries_status_check
    check (status in ('new', 'contacted', 'qualified', 'closed'))
);

-- ── 2. INDEXES ───────────────────────────────────────────────────────────────

create index if not exists enquiries_created_at_idx on public.enquiries (created_at desc);
create index if not exists enquiries_status_idx on public.enquiries (status);
create index if not exists enquiries_email_idx on public.enquiries (email);

-- ── 3. RLS ───────────────────────────────────────────────────────────────────

alter table public.enquiries enable row level security;

-- Public / Guest / Customer INSERT: allowed to submit enquiries
drop policy if exists "enquiries_public_insert" on public.enquiries;
create policy "enquiries_public_insert"
  on public.enquiries for insert
  with check (true);

-- Admin SELECT: only admins may view enquiries
drop policy if exists "enquiries_admin_select" on public.enquiries;
create policy "enquiries_admin_select"
  on public.enquiries for select
  using (
    exists (
      select 1 from public.profiles
      where id   = (select auth.uid())
        and role = 'admin'
    )
  );

-- Admin UPDATE: only admins may update status and notes
drop policy if exists "enquiries_admin_update" on public.enquiries;
create policy "enquiries_admin_update"
  on public.enquiries for update
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

-- ── 4. NOTIFICATIONS EXTENSION (if needed) ──────────────────────────────────
-- The notifications table deduplication index is on (type, reference_id).
-- wholesale_enquiry events will be keyed on reference_id = enquiry.id.

comment on table public.enquiries is
  'Wholesale, bulk, reseller, and business inquiries submitted through the storefront.';
