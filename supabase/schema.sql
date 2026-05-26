-- =============================================================================
-- Schlutte — Supabase Schema (Entwurf, noch nicht ausgerollt)
--
-- Status: Skizze, dient als Vertrag für die Data-Schicht in lib/data/*.
-- Wird angewandt, sobald wir das Mock-Backend ersetzen.
-- =============================================================================

-- ---------- Helpers --------------------------------------------------------
create extension if not exists "pgcrypto";

-- updated_at touch trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- Employees / Profiles ------------------------------------------
-- Spiegel der auth.users; Kürzel + Rolle für die Topbar/Owner-Anzeige.
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  kuerzel      text not null unique check (char_length(kuerzel) between 2 and 4),
  full_name    text not null,
  role         text not null check (role in ('admin', 'office', 'shop')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------- Commissions ---------------------------------------------------
create table if not exists public.commissions (
  id           uuid primary key default gen_random_uuid(),
  -- Schlutte-Kommissionsnummer, 6-stellig (z. B. "260050"); Format-Validierung
  -- als CHECK, eigentliche Sequenz erzeugt eine eigene Funktion oder ein Trigger.
  nr           text not null unique check (nr ~ '^[0-9]{6}$'),
  client       text not null,
  project      text,                 -- Bauteil / Objekt; optional
  status       text not null default 'in-progress'
               check (status in ('in-progress', 'ready', 'shipped', 'archived')),
  owner_id     uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger commissions_touch before update on public.commissions
  for each row execute function public.touch_updated_at();
create index if not exists commissions_nr_idx on public.commissions (nr);
create index if not exists commissions_client_idx on public.commissions using gin (to_tsvector('german', client));

-- ---------- Palettes ------------------------------------------------------
create table if not exists public.palettes (
  id           uuid primary key default gen_random_uuid(),
  commission_id uuid not null references public.commissions(id) on delete cascade,
  idx          int  not null check (idx > 0),       -- 1..total
  total        int  not null check (total > 0),
  content      text not null,
  weight       text,                                -- "142 kg" (free text fürs Etikett)
  dim          text,                                -- "120 × 80 × 110 cm"
  positions    text[] not null default '{}',        -- z. B. ['01','02','03']
  created_at   timestamptz not null default now(),
  unique (commission_id, idx)
);

-- ---------- Documents (Druckstände) ---------------------------------------
-- Eine Zeile pro tatsächlich erzeugter Druck-Version. Das eigentliche Dokument
-- (PDF) liegt später im Storage-Bucket `documents` unter <commission_nr>/<id>.pdf.
create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  commission_id uuid not null references public.commissions(id) on delete cascade,
  kind         text not null check (kind in ('laufzettel', 'palette')),
  -- Bei kind='palette' referenziert dies optional die zugrundeliegende Palette.
  palette_id   uuid references public.palettes(id) on delete set null,
  label        text not null,                       -- "Laufzettel" | "Palette 3 / 5"
  printed_by   uuid references public.profiles(id) on delete set null,
  printed_at   timestamptz not null default now(),
  storage_path text                                 -- z. B. "260050/abc.pdf" (folgt)
);
create index if not exists documents_commission_idx on public.documents (commission_id, printed_at desc);

-- ---------- Row Level Security --------------------------------------------
-- Grundsatz: alle authentifizierten Nutzer dürfen lesen und schreiben.
-- Nur Admin darf Vorlagen pflegen — Vorlagen kommen in einem späteren Schritt.
alter table public.commissions enable row level security;
alter table public.palettes    enable row level security;
alter table public.documents   enable row level security;
alter table public.profiles    enable row level security;

create policy if not exists "auth read commissions"
  on public.commissions for select to authenticated using (true);
create policy if not exists "auth write commissions"
  on public.commissions for insert to authenticated with check (true);
create policy if not exists "auth update commissions"
  on public.commissions for update to authenticated using (true) with check (true);

create policy if not exists "auth read palettes"
  on public.palettes for select to authenticated using (true);
create policy if not exists "auth write palettes"
  on public.palettes for all to authenticated using (true) with check (true);

create policy if not exists "auth read documents"
  on public.documents for select to authenticated using (true);
create policy if not exists "auth write documents"
  on public.documents for insert to authenticated with check (true);

create policy if not exists "self read profile"
  on public.profiles for select to authenticated using (auth.uid() = id);
