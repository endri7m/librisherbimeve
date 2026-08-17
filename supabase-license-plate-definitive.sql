-- DEFINITIVE FIX: make public.vehicles.license_plate optional.
-- Run the entire script in the Supabase SQL Editor.

begin;

-- The application needs this table. Do not fail if it already exists.
create table if not exists public.vehicles (
  id text primary key default ('veh_' || gen_random_uuid()::text),
  created_at timestamptz not null default now()
);

-- Ensure the column exists before changing its constraint.
alter table public.vehicles
  add column if not exists license_plate text;

-- This is the critical fix for:
-- null value in column "license_plate" violates not-null constraint
alter table public.vehicles
  alter column license_plate drop not null;

-- Clean up old empty-string values.
update public.vehicles
set license_plate = null
where license_plate is not null
  and btrim(license_plate) = '';

commit;

-- Verify the live database. The result must be false.
select
  n.nspname as schema_name,
  c.relname as table_name,
  a.attname as column_name,
  a.attnotnull as not_null
from pg_attribute a
join pg_class c on c.oid = a.attrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'vehicles'
  and a.attname = 'license_plate'
  and a.attnum > 0
  and not a.attisdropped;

notify pgrst, 'reload schema';
