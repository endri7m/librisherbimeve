-- Make vehicle license plates optional.
-- Run this once in Supabase SQL Editor.

alter table public.vehicles
  alter column license_plate drop not null;

-- Convert legacy empty-string plates to NULL so the unique constraint
-- does not treat multiple blank plates as duplicates.
update public.vehicles
set license_plate = null
where license_plate is not null
  and btrim(license_plate) = '';

-- Refresh PostgREST schema cache.
notify pgrst, 'reload schema';

select column_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'vehicles'
  and column_name = 'license_plate';
