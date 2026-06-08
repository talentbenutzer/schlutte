-- Migration: Testnamen löschen.
-- Im Supabase SQL-Editor ausführen (reines DML, kein ALTER/Policy → kein Owner nötig).
--
-- Self-Provisioning (neuer Login → Mitarbeiter-Eintrag) macht die App app-seitig
-- mit der Session des eingeloggten Nutzers (siehe app/start/page.tsx).
--
-- Die employees-Tabelle gehört einer anderen Rolle; RLS-Policies lassen sich daher
-- NICHT per SQL-Editor ändern, sondern nur über die Supabase-Dashboard-UI
-- (Table Editor → employees → RLS → New Policy), falls Insert/Update fehlt:
--   • SELECT  to authenticated  USING (true)
--   • INSERT  to authenticated  WITH CHECK (true)
--   • UPDATE  to authenticated  USING (true) WITH CHECK (true)
--   • DELETE  to authenticated  USING (true)

delete from public.employees
where initials in ('TMK', 'MWB', 'JBR', 'LHR');
