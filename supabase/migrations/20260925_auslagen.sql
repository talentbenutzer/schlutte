-- =============================================================================
-- Migration: Auslagen & Belege (Schlutte) — 2026-09-25
--
-- AUSFÜHRUNG
--   Im Supabase-Dashboard → SQL Editor → "New query": die komplette Datei
--   einfügen und ausführen. Das Skript ist idempotent und darf beliebig oft
--   laufen (if not exists / drop policy if exists / on conflict do nothing) —
--   nach einem Fehler also Ursache beheben und erneut komplett ausführen.
--   Kann auch erst nach dem Deploy laufen (App fällt bis dahin auf is_admin zurück).
--
-- HINWEIS employees (Owner-Rechte)
--   Die Tabelle public.employees gehört ggf. einer anderen Rolle. Scheitert das
--   Anlegen der Spalte "role" (Meldung "Keine Owner-Rechte auf public.employees"
--   bzw. "must be owner of table employees"):
--     1. Table Editor → employees → "Insert column":
--        Name  role · Type  text · Default value  mitarbeiter
--     2. Diese Datei danach erneut komplett ausführen (der ALTER-Teil wird
--        übersprungen, der Backfill füllt die Rolle aus is_admin).
--   Der Check-Constraint auf role wird dann u. U. nicht angelegt (nur Hinweis
--   in der Ausgabe) — die App prüft die Werte selbst.
--
-- INHALT
--   1. employees.role ('mitarbeiter' | 'ceo' | 'admin') + Backfill aus is_admin
--   2. public.app_role()  — Rolle des angemeldeten Nutzers (für RLS)
--   3. public.set_updated_at()
--   4. Tabellen: expense_companies, expense_profiles, credit_cards,
--      expense_claims, receipts, card_statements, card_transactions
--   5. Indizes
--   6. Trigger (updated_at, Zuordnung lösen bei card_transactions)
--   7. Row Level Security
--   8. Storage-Bucket "auslagen" (privat) + Policies
--   9. Seed der Firmen (Adresse/E-Mail pflegt der CEO in den Einstellungen)
--  10. Schutz: nur Admins dürfen Rollen (role/is_admin) ändern
--
-- ROLLEN
--   Finanz-Rolle = 'ceo' oder 'admin' (Admin als Vertretung): Kreditkarten,
--   Abrechnungen/Abgleich, Einstellungen. Beim Speichern setzt die App
--   is_admin = (role = 'admin'); bestehende is_admin-Prüfungen bleiben gültig.
--   Die App funktioniert auch vor dieser Migration (Rolle dann aus is_admin).
-- =============================================================================


-- ─── 1. employees.role ───────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = 'employees'
       and a.attname = 'role'
       and not a.attisdropped
  ) then
    begin
      alter table public.employees
        add column role text not null default 'mitarbeiter'
        constraint employees_role_check check (role in ('mitarbeiter', 'ceo', 'admin'));
    exception when insufficient_privilege then
      raise exception using
        message = 'Keine Owner-Rechte auf public.employees – Spalte "role" konnte nicht angelegt werden.',
        hint    = 'Im Table Editor bei employees die Spalte role (Typ text, Default mitarbeiter) anlegen und dieses Skript danach erneut komplett ausführen.';
    end;
  end if;
end;
$$;

-- Check-Constraint nachziehen, falls die Spalte über den Table Editor entstand.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.employees'::regclass
       and conname = 'employees_role_check'
  ) then
    alter table public.employees
      add constraint employees_role_check check (role in ('mitarbeiter', 'ceo', 'admin'));
  end if;
exception
  when insufficient_privilege then
    raise notice 'employees_role_check nicht angelegt (keine Owner-Rechte) – unkritisch, die App prüft die Rolle.';
  when check_violation then
    raise notice 'employees_role_check nicht angelegt: vorhandene Werte in employees.role bitte prüfen.';
end;
$$;

-- Backfill: Admins übernehmen, leere Rollen auffüllen (wiederholbar).
update public.employees
   set role = 'admin'
 where is_admin is true
   and (role is null or role = 'mitarbeiter');

update public.employees
   set role = 'mitarbeiter'
 where role is null;


-- ─── 2. app_role() ───────────────────────────────────────────────────────────
-- Rolle des angemeldeten Nutzers aus employees: Treffer per id = auth.uid()
-- (bevorzugt) oder per E-Mail aus dem JWT. Inaktive Mitarbeiter und Nutzer ohne
-- Datensatz gelten als 'mitarbeiter'. is_admin = true ist immer mindestens
-- 'admin' (passt zu lib/auth/app-role.ts → resolveAppRole).
-- security definer: liest employees unabhängig von deren RLS.

create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
               when e.role = 'ceo' then 'ceo'
               when e.role = 'admin' or coalesce(e.is_admin, false) then 'admin'
               else 'mitarbeiter'
             end
        from public.employees e
       where (e.id = auth.uid() or lower(e.email) = lower(auth.jwt() ->> 'email'))
         and coalesce(e.is_active, true)
       order by (e.id = auth.uid()) desc nulls last
       limit 1
    ),
    'mitarbeiter'
  );
$$;

grant execute on function public.app_role() to authenticated;


-- ─── 3. updated_at-Trigger-Funktion ──────────────────────────────────────────
-- Existiert i. d. R. schon (frühere Migrationen); gehört sie einer anderen
-- Rolle, wird die vorhandene Funktion unverändert genutzt.

do $$
begin
  create or replace function public.set_updated_at()
  returns trigger
  language plpgsql
  as $fn$
  begin
    new.updated_at = now();
    return new;
  end;
  $fn$;
exception when insufficient_privilege then
  raise notice 'public.set_updated_at() gehört einer anderen Rolle – vorhandene Funktion wird verwendet.';
end;
$$;


-- ─── 4. Tabellen (Reihenfolge wegen Fremdschlüsseln) ─────────────────────────

-- Firmen, für die Anträge gestellt werden.
create table if not exists public.expense_companies (
  id              text primary key,              -- 'grabner' | 'hoellental'
  name            text not null,
  address         text,                          -- mehrzeilig
  recipient_email text,                          -- Empfänger der Anträge
  sort            integer not null default 0,
  updated_at      timestamptz not null default now()
);

-- Persönliche Daten für Anträge (eine Zeile pro Nutzer).
create table if not exists public.expense_profiles (
  user_id        uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  first_name     text,
  last_name      text,
  street         text,
  postal_code    text,
  city           text,
  personnel_no   text,
  cost_center    text,
  account_holder text,
  iban           text,
  bic            text,
  bank_name      text,
  updated_at     timestamptz not null default now()
);

-- Firmen-Kreditkarten (nur Finanz-Rolle).
create table if not exists public.credit_cards (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid default auth.uid() references auth.users (id) on delete set null,
  company_id  text references public.expense_companies (id),
  label       text not null,
  last4       text check (last4 ~ '^[0-9]{4}$'),
  holder_name text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Anträge auf Auslagenerstattung (vor receipts wegen receipts.claim_id).
create table if not exists public.expense_claims (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company_id      text not null references public.expense_companies (id),
  recipient_email text,                          -- Snapshot
  applicant       jsonb not null,                -- Snapshot der Profilfelder
  place           text,
  claim_date      date not null default current_date,
  signature_png   text,                          -- Data-URL
  total_gross     numeric(12,2) not null,
  receipt_count   integer not null,
  pdf_path        text,                          -- {uid}/antraege/{id}.pdf
  status          text not null default 'erstellt' check (status in ('erstellt', 'versendet')),
  sent_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Belege (Quittungen/Rechnungen). Datei liegt im Bucket "auslagen".
create table if not exists public.receipts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status           text not null default 'entwurf' check (status in ('entwurf', 'erfasst')),
  receipt_date     date,
  merchant         text,
  description      text,
  currency         text not null default 'EUR',
  gross_amount     numeric(12,2),
  net_amount       numeric(12,2),
  vat_amount       numeric(12,2),
  vat_rate         numeric(5,2),                 -- null = gemischt/unbekannt
  gross_amount_eur numeric(12,2),                -- nur bei Fremdwährung
  payment_method   text not null default 'privat' check (payment_method in ('privat', 'kreditkarte')),
  credit_card_id   uuid references public.credit_cards (id) on delete set null,
  file_path        text not null unique,         -- {uid}/belege/{uuid}.jpg|pdf
  file_mime        text not null,
  file_name        text,
  extraction       jsonb,
  extraction_error text,
  claim_id         uuid references public.expense_claims (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- Datei muss im Ordner des Beleg-Inhabers liegen. Verhindert, dass fremde
  -- Dateien über die Storage-Select-Policy (Abgleich file_path) sichtbar werden.
  constraint receipts_file_path_owner check (split_part(file_path, '/', 1) = user_id::text)
);

-- Kreditkartenabrechnungen (PDF, nur Finanz-Rolle).
create table if not exists public.card_statements (
  id               uuid primary key default gen_random_uuid(),
  uploaded_by      uuid default auth.uid() references auth.users (id) on delete set null,
  credit_card_id   uuid references public.credit_cards (id) on delete cascade,
  period_start     date,
  period_end       date,
  statement_date   date,
  total_amount     numeric(12,2),
  currency         text default 'EUR',
  file_path        text not null unique,         -- {uid}/abrechnungen/{uuid}.pdf
  file_name        text,
  extraction       jsonb,
  extraction_error text,
  status           text not null default 'neu' check (status in ('neu', 'verarbeitet', 'fehler')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint card_statements_file_path_owner
    check (uploaded_by is null or split_part(file_path, '/', 1) = uploaded_by::text)
);

-- Einzelbuchungen einer Abrechnung, optional 1:1 mit einem Beleg verknüpft.
create table if not exists public.card_transactions (
  id                uuid primary key default gen_random_uuid(),
  statement_id      uuid not null references public.card_statements (id) on delete cascade,
  credit_card_id    uuid references public.credit_cards (id) on delete set null,
  transaction_date  date,
  booking_date      date,
  merchant          text,
  description       text,
  amount            numeric(12,2) not null,      -- EUR; positiv = Belastung, negativ = Gutschrift
  original_amount   numeric(12,2),
  original_currency text,
  receipt_id        uuid unique references public.receipts (id) on delete set null,
  match_status      text not null default 'offen'
                    check (match_status in ('offen', 'auto', 'manuell', 'ohne_beleg')),
  match_score       integer,
  note              text,
  sort              integer,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

grant select, insert, update, delete on
  public.expense_companies,
  public.expense_profiles,
  public.credit_cards,
  public.expense_claims,
  public.receipts,
  public.card_statements,
  public.card_transactions
to authenticated;


-- ─── 5. Indizes ──────────────────────────────────────────────────────────────
-- receipts(file_path), card_statements(file_path) und card_transactions(receipt_id)
-- sind durch ihre UNIQUE-Constraints bereits indiziert.

create index if not exists credit_cards_owner_idx            on public.credit_cards (owner_id);
create index if not exists credit_cards_company_idx          on public.credit_cards (company_id);
create index if not exists expense_claims_user_idx           on public.expense_claims (user_id);
create index if not exists expense_claims_company_idx        on public.expense_claims (company_id);
create index if not exists receipts_user_claim_idx           on public.receipts (user_id, claim_id);
create index if not exists receipts_claim_idx                on public.receipts (claim_id);
create index if not exists receipts_credit_card_idx          on public.receipts (credit_card_id);
create index if not exists card_statements_card_idx          on public.card_statements (credit_card_id);
create index if not exists card_statements_uploaded_by_idx   on public.card_statements (uploaded_by);
create index if not exists card_transactions_statement_idx   on public.card_transactions (statement_id);
create index if not exists card_transactions_card_idx        on public.card_transactions (credit_card_id);


-- ─── 6. Trigger ──────────────────────────────────────────────────────────────

drop trigger if exists expense_companies_set_updated_at on public.expense_companies;
create trigger expense_companies_set_updated_at
  before update on public.expense_companies
  for each row execute function public.set_updated_at();

drop trigger if exists expense_profiles_set_updated_at on public.expense_profiles;
create trigger expense_profiles_set_updated_at
  before update on public.expense_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists credit_cards_set_updated_at on public.credit_cards;
create trigger credit_cards_set_updated_at
  before update on public.credit_cards
  for each row execute function public.set_updated_at();

drop trigger if exists expense_claims_set_updated_at on public.expense_claims;
create trigger expense_claims_set_updated_at
  before update on public.expense_claims
  for each row execute function public.set_updated_at();

drop trigger if exists receipts_set_updated_at on public.receipts;
create trigger receipts_set_updated_at
  before update on public.receipts
  for each row execute function public.set_updated_at();

drop trigger if exists card_statements_set_updated_at on public.card_statements;
create trigger card_statements_set_updated_at
  before update on public.card_statements
  for each row execute function public.set_updated_at();

drop trigger if exists card_transactions_set_updated_at on public.card_transactions;
create trigger card_transactions_set_updated_at
  before update on public.card_transactions
  for each row execute function public.set_updated_at();

-- Wird receipt_id geleert (auch per "on delete set null", wenn der Beleg
-- gelöscht wird), fällt eine automatische/manuelle Zuordnung auf 'offen' zurück.
create or replace function public.card_transactions_reset_match()
returns trigger
language plpgsql
as $$
begin
  if new.receipt_id is null and new.match_status in ('auto', 'manuell') then
    new.match_status := 'offen';
    new.match_score := null;
  end if;
  return new;
end;
$$;

drop trigger if exists card_transactions_reset_match on public.card_transactions;
create trigger card_transactions_reset_match
  before insert or update on public.card_transactions
  for each row execute function public.card_transactions_reset_match();


-- ─── 7. Row Level Security ───────────────────────────────────────────────────
-- (select …) um Funktionsaufrufe: wird einmal pro Abfrage statt pro Zeile ausgewertet.

alter table public.expense_companies enable row level security;
alter table public.expense_profiles  enable row level security;
alter table public.credit_cards      enable row level security;
alter table public.expense_claims    enable row level security;
alter table public.receipts          enable row level security;
alter table public.card_statements   enable row level security;
alter table public.card_transactions enable row level security;

-- expense_companies: lesen alle Angemeldeten, ändern nur CEO/Admin.
drop policy if exists expense_companies_select on public.expense_companies;
create policy expense_companies_select on public.expense_companies
  for select to authenticated
  using (true);

drop policy if exists expense_companies_insert on public.expense_companies;
create policy expense_companies_insert on public.expense_companies
  for insert to authenticated
  with check ((select public.app_role()) in ('ceo', 'admin'));

drop policy if exists expense_companies_update on public.expense_companies;
create policy expense_companies_update on public.expense_companies
  for update to authenticated
  using ((select public.app_role()) in ('ceo', 'admin'))
  with check ((select public.app_role()) in ('ceo', 'admin'));

drop policy if exists expense_companies_delete on public.expense_companies;
create policy expense_companies_delete on public.expense_companies
  for delete to authenticated
  using ((select public.app_role()) in ('ceo', 'admin'));

-- expense_profiles: nur die eigene Zeile.
drop policy if exists expense_profiles_own on public.expense_profiles;
create policy expense_profiles_own on public.expense_profiles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- credit_cards: nur Finanz-Rolle.
drop policy if exists credit_cards_finance on public.credit_cards;
create policy credit_cards_finance on public.credit_cards
  for all to authenticated
  using ((select public.app_role()) in ('ceo', 'admin'))
  with check ((select public.app_role()) in ('ceo', 'admin'));

-- expense_claims: nur eigene Anträge; löschen nur solange nicht versendet.
drop policy if exists expense_claims_select on public.expense_claims;
create policy expense_claims_select on public.expense_claims
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists expense_claims_insert on public.expense_claims;
create policy expense_claims_insert on public.expense_claims
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists expense_claims_update on public.expense_claims;
create policy expense_claims_update on public.expense_claims
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists expense_claims_delete on public.expense_claims;
create policy expense_claims_delete on public.expense_claims
  for delete to authenticated
  using (user_id = (select auth.uid()) and status = 'erstellt');

-- receipts: eigene Belege; Kreditkarten-Belege zusätzlich für CEO/Admin.
-- Belege in einem Antrag (claim_id gesetzt) sind schreibgeschützt. Das Setzen
-- von claim_id (Antrag erstellen) ist erlaubt, aber nur auf einen eigenen Antrag.
drop policy if exists receipts_select on public.receipts;
create policy receipts_select on public.receipts
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (payment_method = 'kreditkarte' and (select public.app_role()) in ('ceo', 'admin'))
  );

drop policy if exists receipts_insert on public.receipts;
create policy receipts_insert on public.receipts
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists receipts_update on public.receipts;
create policy receipts_update on public.receipts
  for update to authenticated
  using (
    (
      user_id = (select auth.uid())
      or (payment_method = 'kreditkarte' and (select public.app_role()) in ('ceo', 'admin'))
    )
    and claim_id is null
  )
  with check (
    (
      user_id = (select auth.uid())
      or (payment_method = 'kreditkarte' and (select public.app_role()) in ('ceo', 'admin'))
    )
    and (
      claim_id is null
      or exists (
        select 1 from public.expense_claims c
         where c.id = receipts.claim_id
           and c.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists receipts_delete on public.receipts;
create policy receipts_delete on public.receipts
  for delete to authenticated
  using (user_id = (select auth.uid()) and claim_id is null);

-- card_statements / card_transactions: nur Finanz-Rolle.
drop policy if exists card_statements_finance on public.card_statements;
create policy card_statements_finance on public.card_statements
  for all to authenticated
  using ((select public.app_role()) in ('ceo', 'admin'))
  with check ((select public.app_role()) in ('ceo', 'admin'));

drop policy if exists card_transactions_finance on public.card_transactions;
create policy card_transactions_finance on public.card_transactions
  for all to authenticated
  using ((select public.app_role()) in ('ceo', 'admin'))
  with check ((select public.app_role()) in ('ceo', 'admin'));


-- ─── 8. Storage: privater Bucket "auslagen" ──────────────────────────────────
-- Pfade: {uid}/belege/{uuid}.jpg|pdf · {uid}/antraege/{claimId}.pdf ·
--        {uid}/abrechnungen/{uuid}.pdf
-- Schreiben nur im eigenen Ordner. Lesen: eigener Ordner oder Datei gehört zu
-- einem Beleg / einer Abrechnung, deren Zeile der Nutzer sehen darf (die RLS der
-- Tabellen greift in den Unterabfragen) — so sieht z. B. der Admin die
-- Kreditkarten-Belege des CEO.

insert into storage.buckets (id, name, public)
values ('auslagen', 'auslagen', false)
on conflict (id) do nothing;

drop policy if exists auslagen_objects_insert on storage.objects;
create policy auslagen_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'auslagen'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists auslagen_objects_update on storage.objects;
create policy auslagen_objects_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'auslagen'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'auslagen'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists auslagen_objects_delete on storage.objects;
create policy auslagen_objects_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'auslagen'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists auslagen_objects_select on storage.objects;
create policy auslagen_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'auslagen'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (select 1 from public.receipts r where r.file_path = storage.objects.name)
      or exists (select 1 from public.card_statements s where s.file_path = storage.objects.name)
    )
  );


-- ─── 9. Seed: Firmen ─────────────────────────────────────────────────────────
-- Keine Adressen/E-Mails vorbelegen — pflegt der CEO unter /auslagen/einstellungen.

insert into public.expense_companies (id, name, sort)
values
  ('grabner', 'Grabner Design', 1),
  ('hoellental', 'höllental', 2)
on conflict (id) do nothing;


-- ─── 10. Schutz der Rollen in employees ──────────────────────────────────────
-- Die bestehenden employees-Policies erlauben allen Angemeldeten Schreibzugriff.
-- Damit sich niemand selbst zum CEO/Admin macht, blockiert dieser Trigger
-- Änderungen an role/is_admin durch App-Nutzer ohne Admin-Rolle. SQL-Editor,
-- Table Editor und Service-Role sind nicht betroffen. Kann der Trigger mangels
-- Rechten nicht angelegt werden, erscheint nur ein Hinweis.

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
      if public.app_role() <> 'admin' then
        raise exception 'Nur Administratoren dürfen Rollen vergeben.'
          using errcode = '42501';
      end if;
    end if;
  elsif new.role is distinct from old.role or new.is_admin is distinct from old.is_admin then
    if public.app_role() <> 'admin' then
      raise exception 'Nur Administratoren dürfen Rollen ändern.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

-- Nur anlegen, wenn er fehlt (DROP TRIGGER bräuchte Owner-Rechte); Änderungen
-- an der Funktion oben greifen ohne Neuanlage.
do $$
begin
  if not exists (
    select 1 from pg_trigger
     where tgrelid = 'public.employees'::regclass
       and tgname = 'employees_guard_role'
  ) then
    create trigger employees_guard_role
      before insert or update on public.employees
      for each row execute function public.employees_guard_role();
  end if;
exception when insufficient_privilege then
  raise notice 'Trigger employees_guard_role nicht angelegt (keine Rechte auf public.employees). Rollen sind dann nur durch die App-Prüfung geschützt.';
end;
$$;


-- PostgREST-Schema-Cache neu laden (neue Tabellen/Spalte sofort per API sichtbar).
notify pgrst, 'reload schema';
