-- Migration: Spalte "urgent" (Dringend) zur orders-Tabelle hinzufügen.
-- Im Supabase SQL-Editor ausführen. Idempotent.

alter table public.orders
  add column if not exists urgent boolean not null default false;

-- Lieferung bis spätestens (Datum, optional)
alter table public.orders
  add column if not exists deliver_by date;
