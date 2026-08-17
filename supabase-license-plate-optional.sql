-- Libri i Shërbimeve: make vehicle license plates optional.
-- Run the whole file in Supabase SQL Editor.

-- Create the base table if this is a new Supabase project.
create table if not exists public.vehicles (
  id text primary key default ('veh_' || gen_random_uuid()::text),
  created_at timestamptz not null default now()
);

-- Add the application column if it is missing.
alter table public.vehicles
  add column if not exists license_plate text;

-- The plate is optional. NULL values are allowed and do not conflict
-- with the unique constraint for non-empty plates.
alter table public.vehicles
  alter column license_plate drop not null;

-- Convert old empty-string plates to NULL.
update public.vehicles
set license_plate = null
where license_plate is not null
  and btrim(license_plate) = '';

-- Refresh PostgREST schema cache.
notify pgrst, 'reload schema';

-- Verify the result. is_nullable must be YES.
select column_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'vehicles'
  and column_name = 'license_plate';
