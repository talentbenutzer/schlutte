-- Ergänzung zu 20260925_auslagen.sql.
-- Die älteren employees-Policies gestatten angemeldeten Nutzern direkte
-- Schreibzugriffe. Der Rollen-Trigger verhindert nur Änderungen an role/is_admin;
-- ohne diese Sperre wären andere Mitarbeiterdaten weiter veränder- oder löschbar.
-- Beim ersten Login darf ein Nutzer weiterhin nur seinen eigenen Datensatz
-- als aktiven Mitarbeiter ohne Adminrechte anlegen (app/start/page.tsx).
-- RESTRICTIVE-Policies werden mit den vorhandenen Policies per AND verknüpft.
-- SELECT bleibt unverändert. Idempotent, im Supabase SQL-Editor ausführen.

alter table public.employees enable row level security;

drop policy if exists employees_admin_insert_guard on public.employees;
create policy employees_admin_insert_guard on public.employees
  as restrictive for insert to public
  with check (
    (select public.app_role()) = 'admin'
    or (
      id = (select auth.uid())
      and lower(email) = lower((select auth.jwt()) ->> 'email')
      and is_admin is false
      and role = 'mitarbeiter'
      and is_active is true
    )
  );

drop policy if exists employees_admin_update_guard on public.employees;
create policy employees_admin_update_guard on public.employees
  as restrictive for update to public
  using ((select public.app_role()) = 'admin')
  with check ((select public.app_role()) = 'admin');

drop policy if exists employees_admin_delete_guard on public.employees;
create policy employees_admin_delete_guard on public.employees
  as restrictive for delete to public
  using ((select public.app_role()) = 'admin');

notify pgrst, 'reload schema';
