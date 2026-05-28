-- Migration: Fehlende Spalten zur employees-Tabelle hinzufügen
-- Ausführen im Supabase SQL-Editor oder via Supabase CLI.
-- Idempotent (IF NOT EXISTS).

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Optional: Trigger für automatisches updated_at bei UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'employees_set_updated_at'
  ) THEN
    CREATE TRIGGER employees_set_updated_at
      BEFORE UPDATE ON employees
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END;
$$;
