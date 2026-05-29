-- Migration: Bestellliste — orders + order_batches.
-- Im Supabase SQL-Editor oder via Supabase CLI ausführen. Idempotent.

-- Archiv-Stapel: eine Zeile pro "Bestellung aufgegeben" (gesamte Liste).
create table if not exists public.order_batches (
  id                 uuid primary key default gen_random_uuid(),
  placed_at          timestamptz not null default now(),
  placed_by_initials text
);

-- Einzelne Bestellpositionen. batch_id IS NULL  →  offene (aktuelle) Liste.
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  batch_id          uuid references public.order_batches(id) on delete cascade,
  supplier          text not null,
  custom_supplier   text,
  article           text,
  article_number    text,
  quantity          integer not null default 1,
  note              text,
  employee_initials text not null,
  urgent            boolean not null default false,
  deliver_by        date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists orders_batch_idx on public.orders (batch_id);

-- updated_at-Trigger (Funktion existiert ggf. schon aus employees-Migration).
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'orders_set_updated_at') then
    create trigger orders_set_updated_at
      before update on public.orders
      for each row execute function public.set_updated_at();
  end if;
end;
$$;

-- RLS: alle authentifizierten Nutzer dürfen lesen/schreiben (MVP).
alter table public.order_batches enable row level security;
alter table public.orders        enable row level security;

drop policy if exists "auth all order_batches" on public.order_batches;
create policy "auth all order_batches"
  on public.order_batches for all to authenticated using (true) with check (true);

drop policy if exists "auth all orders" on public.orders;
create policy "auth all orders"
  on public.orders for all to authenticated using (true) with check (true);
