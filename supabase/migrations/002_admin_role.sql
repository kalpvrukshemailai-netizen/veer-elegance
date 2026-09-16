-- ============================================================
-- VEER ELEGANCE — Profile Sync + Admin Role Migration
-- Run in Supabase SQL Editor
-- dashboard.supabase.com → SQL Editor → New query → Run
--
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT DO NOTHING
-- Does NOT delete any auth users or drop any tables.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- STEP 1: Add role column (idempotent — skips if exists)
-- ────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists role text not null default 'customer';

-- Ensure only valid roles are stored
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('customer', 'admin'));


-- ────────────────────────────────────────────────────────────
-- STEP 2: Sync ALL existing auth.users into public.profiles
-- Inserts a row for every auth user that has no profile yet.
-- ON CONFLICT DO NOTHING = safe to re-run, no duplicates.
-- ────────────────────────────────────────────────────────────

insert into public.profiles (id, first_name, last_name, role)
select
  u.id,
  u.raw_user_meta_data ->> 'first_name',
  u.raw_user_meta_data ->> 'last_name',
  'customer'
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
)
on conflict (id) do nothing;


-- ────────────────────────────────────────────────────────────
-- STEP 3: Recreate the auto-profile trigger (correct + safe)
-- Fires on every new auth.users INSERT.
-- security definer + empty search_path = injection-safe.
-- on conflict do nothing = idempotent (safe if trigger fires
-- more than once, e.g. OAuth re-authentication).
-- ────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ────────────────────────────────────────────────────────────
-- STEP 4: Patch the update policy
-- Prevents a customer from changing their own role to 'admin'
-- via a client-side UPDATE request.
-- ────────────────────────────────────────────────────────────

drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_update_own"
  on public.profiles for update
  using ( (select auth.uid()) = id )
  with check (
    (select auth.uid()) = id
    and role = (select role from public.profiles where id = (select auth.uid()))
  );


-- ────────────────────────────────────────────────────────────
-- STEP 5: is_admin() helper function (server-side RPC)
-- ────────────────────────────────────────────────────────────

create or replace function public.is_admin()
returns boolean
language plpgsql
security definer set search_path = ''
as $$
begin
  return exists (
    select 1 from public.profiles
    where id   = (select auth.uid())
      and role = 'admin'
  );
end;
$$;


-- ────────────────────────────────────────────────────────────
-- STEP 6: Verify row count after sync
-- ────────────────────────────────────────────────────────────

select count(*) as total_profiles from public.profiles;
select id, first_name, last_name, role, created_at from public.profiles order by created_at;


-- ────────────────────────────────────────────────────────────
-- STEP 7: Promote your owner account to admin
--
-- FIND YOUR UUID:
--   Supabase Dashboard → Authentication → Users
--   Copy the UUID of the account you want as admin.
--
-- Then run this separately (replace the UUID):
-- ────────────────────────────────────────────────────────────

-- update public.profiles
-- set role = 'admin'
-- where id = 'YOUR-ADMIN-USER-UUID-HERE';
--
-- Verify:
-- select id, role from public.profiles where role = 'admin';
