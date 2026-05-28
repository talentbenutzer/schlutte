-- Migration: Bekannte Mitarbeiter in employees-Tabelle einsetzen (Seed).
-- Idempotent: legt nur an, was per Kürzel (initials) noch nicht existiert.
-- Im Supabase SQL-Editor oder via Supabase CLI ausführen.

insert into public.employees (initials, name, email, is_admin, is_active)
select v.initials, v.name, v.email, v.is_admin, v.is_active
from (values
  ('EDL', 'Eddy Lorenz',   null::text, true,  true),
  ('TMK', 'Thomas Köhler', null::text, false, true),
  ('MWB', 'Marius Weber',  null::text, false, true),
  ('JBR', 'Jonas Braun',   null::text, false, true),
  ('LHR', 'Lena Herr',     null::text, false, true)
) as v(initials, name, email, is_admin, is_active)
where not exists (
  select 1 from public.employees e where e.initials = v.initials
);
