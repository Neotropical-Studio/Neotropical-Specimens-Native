-- Allow an authenticated admin to read THEIR OWN admin_users row.
-- Used by /admin login when SUPABASE_SERVICE_ROLE_KEY is not set on the host
-- (session JWT + RLS instead of service_role for the permission check only).

alter table public.admin_users enable row level security;

drop policy if exists admin_users_select_own on public.admin_users;
create policy admin_users_select_own
  on public.admin_users
  for select
  to authenticated
  using (id = auth.uid() and active = true);
