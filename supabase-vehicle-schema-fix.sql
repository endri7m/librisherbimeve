-- Libri i Shërbimeve: safe vehicle schema repair
-- Execute the whole file in Supabase SQL Editor.
-- This version intentionally uses separate ALTER statements so a missing
-- user_id column cannot make the later index statement fail.

-- 0) Create the tables only if they do not exist. Existing tables are not replaced.
create table if not exists public.vehicles (
  id text primary key default ('veh_' || gen_random_uuid()::text),
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id text primary key default ('srv_' || gen_random_uuid()::text),
  created_at timestamptz not null default now()
);

-- 1) Add vehicle columns one by one.
alter table public.vehicles add column if not exists user_id uuid;
alter table public.vehicles add column if not exists owner_name text;
alter table public.vehicles add column if not exists owner_phone text;
alter table public.vehicles add column if not exists vehicle_brand text;
alter table public.vehicles add column if not exists vehicle_model text;
alter table public.vehicles add column if not exists license_plate text;
-- License plate is optional; empty legacy values are normalized below.
alter table public.vehicles alter column license_plate drop not null;
update public.vehicles set license_plate = null where license_plate is not null and btrim(license_plate) = '';
-- Kept for older installations; the application writes to license_plate.
alter table public.vehicles add column if not exists vehicle_plate text;
alter table public.vehicles add column if not exists vehicle_year integer;
alter table public.vehicles add column if not exists vehicle_engine text;
alter table public.vehicles add column if not exists vehicle_vin text;
alter table public.vehicles add column if not exists mileage integer;
alter table public.vehicles add column if not exists created_at timestamptz;
alter table public.vehicles add column if not exists updated_at timestamptz;

-- 2) Add service columns one by one. vehicle_id is text because the existing
-- application supports both legacy text IDs and Supabase-generated IDs.
alter table public.services add column if not exists user_id uuid;
alter table public.services add column if not exists vehicle_id text;
alter table public.services add column if not exists service_date date;
alter table public.services add column if not exists mileage integer;
alter table public.services add column if not exists service_types jsonb;
alter table public.services add column if not exists description text;
alter table public.services add column if not exists parts jsonb;
alter table public.services add column if not exists labor_cost numeric;
alter table public.services add column if not exists parts_cost numeric;
alter table public.services add column if not exists total_cost numeric;
alter table public.services add column if not exists notes text;
alter table public.services add column if not exists archived boolean;
alter table public.services add column if not exists created_at timestamptz;
alter table public.services add column if not exists updated_at timestamptz;

-- 3) Safe defaults after the columns exist.
alter table public.vehicles alter column mileage set default 0;
alter table public.vehicles alter column created_at set default now();
alter table public.vehicles alter column updated_at set default now();
alter table public.services alter column mileage set default 0;
alter table public.services alter column service_types set default '[]'::jsonb;
alter table public.services alter column parts set default '[]'::jsonb;
alter table public.services alter column labor_cost set default 0;
alter table public.services alter column parts_cost set default 0;
alter table public.services alter column total_cost set default 0;
alter table public.services alter column archived set default false;
alter table public.services alter column created_at set default now();
alter table public.services alter column updated_at set default now();

-- 4) Add the foreign keys only when the columns are present and the
-- constraints do not already exist.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vehicles_user_id_fkey'
  ) then
    alter table public.vehicles
      add constraint vehicles_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'services_user_id_fkey'
  ) then
    alter table public.services
      add constraint services_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- 5) Create indexes only after user_id has definitely been created.
create index if not exists vehicles_user_id_idx on public.vehicles (user_id);
create index if not exists services_user_id_idx on public.services (user_id);
create index if not exists services_vehicle_id_idx on public.services (vehicle_id);

-- 6) Enable RLS after the columns exist.
alter table public.vehicles enable row level security;
alter table public.services enable row level security;

-- 7) Replace ownership policies safely.
drop policy if exists "Users can view their own vehicles" on public.vehicles;
drop policy if exists "Users can insert their own vehicles" on public.vehicles;
drop policy if exists "Users can update their own vehicles" on public.vehicles;
drop policy if exists "Users can delete their own vehicles" on public.vehicles;
drop policy if exists "Users can view their own services" on public.services;
drop policy if exists "Users can insert their own services" on public.services;
drop policy if exists "Users can update their own services" on public.services;
drop policy if exists "Users can delete their own services" on public.services;

create policy "Users can view their own vehicles"
  on public.vehicles for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can insert their own vehicles"
  on public.vehicles for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own vehicles"
  on public.vehicles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own vehicles"
  on public.vehicles for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can view their own services"
  on public.services for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can insert their own services"
  on public.services for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own services"
  on public.services for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own services"
  on public.services for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert, update, delete on public.services to authenticated;

-- 8) Reload PostgREST schema cache after all DDL has completed.
notify pgrst, 'reload schema';
