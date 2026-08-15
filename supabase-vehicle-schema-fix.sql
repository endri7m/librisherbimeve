-- Fix for: Could not find the 'owner_name' column of 'vehicles' in the schema cache
-- Run this once in Supabase SQL Editor, then refresh the app.

alter table public.vehicles
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists owner_name text,
  add column if not exists owner_phone text,
  add column if not exists vehicle_brand text,
  add column if not exists vehicle_model text,
  add column if not exists vehicle_plate text,
  add column if not exists vehicle_year integer,
  add column if not exists vehicle_engine text,
  add column if not exists vehicle_vin text,
  add column if not exists mileage integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.services
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists vehicle_id uuid,
  add column if not exists service_date date,
  add column if not exists mileage integer not null default 0,
  add column if not exists service_types jsonb not null default '[]'::jsonb,
  add column if not exists description text,
  add column if not exists parts jsonb not null default '[]'::jsonb,
  add column if not exists labor_cost numeric not null default 0,
  add column if not exists parts_cost numeric not null default 0,
  add column if not exists total_cost numeric not null default 0,
  add column if not exists notes text,
  add column if not exists archived boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists vehicles_user_id_idx on public.vehicles(user_id);
create index if not exists services_user_id_idx on public.services(user_id);
create index if not exists services_vehicle_id_idx on public.services(vehicle_id);

-- Reload PostgREST's schema cache immediately.
notify pgrst, 'reload schema';
