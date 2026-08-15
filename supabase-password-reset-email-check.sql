-- Verifikim i email-it për Forgot Password.
-- Ky funksion ekspozon vetëm një vlerë boolean dhe nuk kthen të dhëna nga auth.users.
create or replace function public.email_exists_for_password_reset(email_to_check text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users
    where lower(email) = lower(trim(email_to_check))
  );
$$;

revoke all on function public.email_exists_for_password_reset(text) from public;
grant execute on function public.email_exists_for_password_reset(text) to anon, authenticated;
