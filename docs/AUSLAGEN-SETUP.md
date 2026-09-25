# Auslagen & Belege einrichten

## 1. Datenbank

Im Supabase SQL-Editor für das Schlutte-Projekt diese Migrationen in der Reihenfolge ausführen:

1. `supabase/migrations/20260925_auslagen.sql`
2. `supabase/migrations/20260925_auslagen_employees_write_guard.sql`
3. `supabase/migrations/20260925_auslagen_company_addresses.sql`
4. `supabase/migrations/20260925_ceo_admin_rights.sql`
5. `supabase/migrations/20260925_payment_channels_claim_inbox.sql`
6. `supabase/migrations/20260925_receipt_storage_retention.sql`

Die erste Migration legt Rollen, Tabellen, den privaten Storage-Bucket und Zugriffsregeln an. Die zweite schützt bestehende Schreibrechte an der Mitarbeitertabelle; beim ersten Login darf ein Nutzer weiterhin nur den eigenen Datensatz als aktiven Mitarbeiter ohne Adminrechte anlegen. Die dritte trägt die Firmenanschriften ein. Die vierte gibt dem CEO dieselben Verwaltungsrechte wie dem Admin. Die fünfte ergänzt Zahlungswege und den geschützten Antragseingang für eingereichte Mitarbeiteranträge. Die sechste sorgt dafür, dass Original-Belegfotos 30 Tage nach Zuordnung zu einer Kartenbuchung automatisch aus dem Speicher gelöscht werden (die erfassten Daten bleiben erhalten). Alle sechs Dateien sind wiederholbar. Vor dem produktiven Einsatz die vorhandenen Mitarbeiter- und Rollen-Zuordnungen prüfen; `employees.is_admin = true` wird als `admin` übernommen.

## 2. Konfiguration

Die vorhandenen Supabase-Umgebungsvariablen bleiben erforderlich. Für das automatische Auslesen von Belegen und Kreditkartenabrechnungen zusätzlich in Vercel setzen:

- `ANTHROPIC_API_KEY` — serverseitiger API-Schlüssel
- `ANTHROPIC_WORKSPACE_ID` — erforderlich, wenn der API-Schlüssel keinem einzelnen Workspace zugeordnet ist; die ID (`wrkspc_…`) steht in der Claude Platform unter **Settings → Workspaces**. Bei einem Workspace-spezifischen Schlüssel weglassen.
- `ANTHROPIC_MODEL` — optional; Standard `claude-sonnet-4-6`

Ohne API-Schlüssel lassen sich Belege manuell erfassen. PDF-Abrechnungen können dann noch nicht automatisch ausgelesen werden, die Buchungen lassen sich aber auf der Abrechnungs-Detailseite von Hand eintragen ("Buchung manuell hinzufügen"). Die Belegfotos und Abrechnungen werden beim KI-Auslesen an Anthropic gesendet.

Für die tägliche Löschung fälliger Belegfotos zusätzlich setzen:

- `CRON_SECRET` — beliebiges, ausreichend langes Geheimnis; sichert den Cron-Endpunkt `/api/cron/purge-receipts` gegen fremden Aufruf ab.
- `SUPABASE_SERVICE_ROLE_KEY` — falls noch nicht gesetzt (wird für Storage-Löschungen mit erhöhten Rechten benötigt).

`vercel.json` registriert den Cron-Job bereits (täglich 4 Uhr).

## 3. Start in der App

1. Im Mitarbeiterbereich die Rollen `Mitarbeiter`, `CEO` und `Admin` zuweisen. CEO und Admin haben dieselben Verwaltungsrechte, einschließlich Mitarbeiterverwaltung, Kreditkarten und Firmeneinstellungen. Nur die Rolle `Admin` setzt `employees.is_admin = true`.
2. Unter **Belege → Einstellungen** die Empfänger-E-Mail und Anschrift für Grabner Design und höllental hinterlegen. Weitere Firmen kann die Finanz-Rolle dort selbst anlegen.
3. Unter **Profil** die persönlichen Daten samt gültiger IBAN pflegen.
4. Beleg fotografieren, den von der KI erkannten Zahlungsweg (AMEX, Bar, EC, Kreditkarte oder Tank- & Raststätten) prüfen oder manuell wählen und speichern. „Privat bezahlt“ beziehungsweise „Firma bezahlt“ bleibt davon getrennt. Privat bezahlte Belege lassen sich in einem Antrag sammeln; Firmenkartenbelege werden im Abgleich verwendet.
5. Antrags-PDF erzeugen, Empfängeradresse kopieren und über die Teilen-Funktion an Mail übergeben. Die Web Share API kann keine Empfängeradresse vorausfüllen. Alternativ PDF herunterladen, „E-Mail öffnen“ wählen und die Datei anhängen. Den Antrag nach dem tatsächlichen Versand als eingereicht markieren.
6. Für den CEO/Admin: Zahlungskarte mit Zahlungsweg anlegen, PDF-Abrechnung hochladen, erkannte Buchungen und automatische Treffer prüfen, fehlende Belege zuordnen und die Belegmappe als PDF exportieren. Firmenzahlungen ohne Kartenbuchung können unter „Weitere Firmenzahlungen“ manuell als geprüft markiert werden.
7. Sobald Mitarbeiter ihre PDF-Anträge als eingereicht markieren, erscheinen sie für CEO/Admin im Antragseingang und im Dashboard. Ungelesene Anträge haben einen roten Punkt. Die PDFs lassen sich einzeln oder gesammelt als ZIP herunterladen. Sobald ein Beleg einer Kartenbuchung zugeordnet wird, wird das Originalfoto automatisch nach 30 Tagen gelöscht; die erfassten Daten bleiben erhalten.

Originalbelege aufbewahren und bei Bedarf im Original vorlegen. Bei Beträgen über 250 € auf eine vollständige Rechnung mit Firmenanschrift achten. Die App macht keine Aussage darüber, ob ein digitalisierter Beleg die papiergebundene Aufbewahrung im konkreten Fall ersetzen darf.

## iPhone ohne App Store

Es gibt zwei getrennte Home-Bildschirm-Icons, je nachdem, von welcher Seite aus installiert wird — beide über **Teilen → Zum Home-Bildschirm** in Safari:

- Von `/start` (oder irgendeiner anderen Seite) aus installiert entsteht „Schlutte“, die allgemeine App für Kommissionen, Bestellliste, Werkstatt usw. Sie startet immer beim Dashboard.
- Von `/auslagen/erfassen` aus installiert entsteht ein eigenes Icon „Belege“, das direkt zum Fotografieren eines Belegs startet — unabhängig von der allgemeinen App. Beide Icons können parallel installiert sein.

Beim ersten Start kann eine erneute Anmeldung nötig sein.

## Prüfung vor Freigabe

- Migrationen in Supabase ausgeführt; privater Bucket `auslagen` vorhanden.
- Ein Mitarbeiter sieht nur eigene Belege und Anträge; CEO/Admin sehen zusätzlich Kartenabrechnungen und eingereichte Mitarbeiteranträge, nicht aber deren Entwürfe.
- Belegfoto und PDF hochladen, Angaben speichern und Antrags-PDF mit Anhängen öffnen.
- PDF-Abrechnung mit einem Beispiel der tatsächlich verwendeten Bank/Karte testen und jede extrahierte Buchung gegen das Original prüfen.
- Die E-Mail-Freigabe auf einem iPhone in Safari und als Home-Bildschirm-App testen.
