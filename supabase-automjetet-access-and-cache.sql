-- Run this whole script in the same Supabase project used by the app.
-- The application uses the public.automjetet table.

select to_regclass('public.automjetet') as table_name;

-- Allow the Supabase API roles to access the table.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on table public.automjetet to anon, authenticated, service_role;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- Refresh the PostgREST schema cache.
notify pgrst, 'reload schema';

-- Verify the table and the required application columns.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'automjetet'
  and column_name in (
    'owner_name',
    'vehicle_brand',
    'vehicle_plate',
    'vehicle_model',
    'owner_phone',
    'user_id'
  )
order by ordinal_position;

-- Expected table_name: public.automjetet.
-- Expected columns: owner_name, vehicle_brand, vehicle_plate,
-- vehicle_model, owner_phone, user_id.

-- Important: RLS policies must still restrict rows by auth.uid() = user_id.
-- Do not enable RLS here unless the matching policies already exist.
