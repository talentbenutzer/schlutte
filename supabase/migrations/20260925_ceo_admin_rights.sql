-- CEO und Admin dürfen Mitarbeiter und Rollen verwalten.
-- Die CEO-Rolle bleibt dabei 'ceo'; is_admin bleibt ausschließlich bei 'admin' true.

create or replace function public.employees_guard_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.is_admin, false) or coalesce(new.role, 'mitarbeiter') <> 'mitarbeiter' then
      if public.app_role() not in ('ceo', 'admin') then
        raise exception 'Nur CEO und Administratoren dürfen Rollen vergeben.'
          using errcode = '42501';
      end if;
    end if;
  elsif new.role is distinct from old.role or new.is_admin is distinct from old.is_admin then
    if public.app_role() not in ('ceo', 'admin') then
      raise exception 'Nur CEO und Administratoren dürfen Rollen ändern.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop policy if exists employees_admin_insert_guard on public.employees;
create policy employees_admin_insert_guard on public.employees
  as restrictive for insert to public
  with check (
    (select public.app_role()) in ('ceo', 'admin')
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
  using ((select public.app_role()) in ('ceo', 'admin'))
  with check ((select public.app_role()) in ('ceo', 'admin'));

drop policy if exists employees_admin_delete_guard on public.employees;
create policy employees_admin_delete_guard on public.employees
  as restrictive for delete to public
  using ((select public.app_role()) in ('ceo', 'admin'));

notify pgrst, 'reload schema';
