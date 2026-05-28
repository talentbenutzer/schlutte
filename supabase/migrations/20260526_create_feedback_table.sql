-- Migration: feedback-Tabelle anlegen
-- Ausführen im Supabase SQL-Editor oder via Supabase CLI.
-- Idempotent (IF NOT EXISTS / CREATE POLICY ... IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS feedback (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message               text NOT NULL,
  category              text,
  status                text NOT NULL DEFAULT 'offen',
  response_text         text,
  response_by_initials  char(3),
  response_at           timestamptz,
  created_by_user_id    uuid,
  created_by_email      text,
  created_by_initials   char(3),
  current_path          text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Row Level Security aktivieren
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Authenticated users: SELECT (alle eingeloggten Nutzer sehen alle Feedbacks)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feedback' AND policyname = 'authenticated_select_feedback'
  ) THEN
    CREATE POLICY "authenticated_select_feedback" ON feedback
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Authenticated users: INSERT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feedback' AND policyname = 'authenticated_insert_feedback'
  ) THEN
    CREATE POLICY "authenticated_insert_feedback" ON feedback
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- Authenticated users: UPDATE (Status und Antwort ändern — MVP pragmatisch)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feedback' AND policyname = 'authenticated_update_feedback'
  ) THEN
    CREATE POLICY "authenticated_update_feedback" ON feedback
      FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;

-- Trigger für automatisches updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'feedback_set_updated_at'
  ) THEN
    CREATE TRIGGER feedback_set_updated_at
      BEFORE UPDATE ON feedback
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
