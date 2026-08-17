-- Run the whole script in the SAME Supabase project used by the website.
-- This script diagnoses the live table and removes the NOT NULL constraint.

-- 1) Confirm the active database/schema.
select current_database() as database_name, current_schema() as schema_name;

-- 2) Confirm the live table and column state BEFORE the fix.
select
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'vehicles'
  and column_name = 'license_plate';

-- 3) Inspect triggers and constraints that may rewrite the insert.
select
  trigger_name,
  event_manipulation,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = 'vehicles';

select
  conname,
  pg_get_constraintdef(oid) as constraint_definition
from pg_constraint
where conrelid = 'public.vehicles'::regclass;

-- 4) Remove NOT NULL from the exact live column.
do $$
begin
  if to_regclass('public.vehicles') is null then
    raise exception 'Tabela public.vehicles nuk ekziston në këtë projekt Supabase.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vehicles'
      and column_name = 'license_plate'
  ) then
    alter table public.vehicles add column license_plate text;
  end if;

  alter table public.vehicles
    alter column license_plate drop not null;
end $$;

-- 5) Normalize old empty strings.
update public.vehicles
set license_plate = null
where license_plate is not null
  and btrim(license_plate) = '';

-- 6) Refresh PostgREST and verify the LIVE result.
notify pgrst, 'reload schema';

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

-- Expected final result: not_null = false and no trigger should insert into a different vehicles table.
