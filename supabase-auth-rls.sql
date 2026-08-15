-- Libri i Shërbimeve: Supabase Auth + per-user Row Level Security
-- Ekzekutoje në Supabase SQL Editor.

alter table public.vehicles
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.services
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists vehicles_user_id_idx on public.vehicles(user_id);
create index if not exists services_user_id_idx on public.services(user_id);
create index if not exists services_vehicle_id_idx on public.services(vehicle_id);

-- RLS duhet të jetë aktiv për çdo tabelë të ekspozuar përmes Data API.
alter table public.vehicles enable row level security;
alter table public.services enable row level security;

-- Heq politikat e vjetra me këto emra nëse migrimi ekzekutohet përsëri.
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
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "Users can insert their own vehicles"
on public.vehicles for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "Users can update their own vehicles"
on public.vehicles for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "Users can delete their own vehicles"
on public.vehicles for delete to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "Users can view their own services"
on public.services for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "Users can insert their own services"
on public.services for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "Users can update their own services"
on public.services for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "Users can delete their own services"
on public.services for delete to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert, update, delete on public.services to authenticated;

-- Për siguri, të dhënat e vjetra me user_id NULL nuk bëhen të dukshme.
-- Nëse ke të dhëna të vjetra, cakto pronarin e tyre me një UUID të besuar
-- përpara se të vendosësh NOT NULL mbi user_id.
