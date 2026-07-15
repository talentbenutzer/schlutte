-- Intranet-Startseite: Firmen-Events und Geburtstage.
-- Im Supabase SQL-Editor ausführen. Neue Tabellen → RLS-Policies können hier direkt mit.

-- ── Events ──────────────────────────────────────────────────────────────────
create table if not exists public.events (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  event_date          date not null,
  created_by_initials text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists events_date_idx on public.events (event_date);

alter table public.events enable row level security;
drop policy if exists events_auth_all on public.events;
create policy events_auth_all on public.events
  for all to authenticated using (true) with check (true);

-- ── Geburtstage ──────────────────────────────────────────────────────────────
create table if not exists public.birthdays (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  birth_date          date not null,
  created_by_initials text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists birthdays_date_idx on public.birthdays (birth_date);

alter table public.birthdays enable row level security;
drop policy if exists birthdays_auth_all on public.birthdays;
create policy birthdays_auth_all on public.birthdays
  for all to authenticated using (true) with check (true);
