


# Schlutte — Designentscheidungen

Stand: 2026-05-26 (Skelett, Daten-Kapselung & Browser-Druck implementiert).

## Designvarianten aus dem Export

| Bereich              | Gewählt                       | Quelle im Export                              |
|----------------------|-------------------------------|-----------------------------------------------|
| Navigation / Shell   | **A — Topbar voll**           | `section-navigation.jsx` → `NavVariantA`      |
| Dashboard            | **A — Action-first**          | `section-dashboard.jsx` → `DashboardA`        |
| Kommissionsdetail    | **B — Tabelle, dicht**        | `section-commission.jsx` → `CommissionB`      |
| Laufzettel-Druck A4  | **wie Palette A** (Zahl dominant, Klassisch) | abgeleitet von `PrintPaletteA` |
| Paletten-Druck A4    | **A — Klassisch, Zahl dominant** | `section-print-palette.jsx` → `PrintPaletteA` |

## Architektur

- **GitHub** ist die Codebasis. **Vercel** deployed die Next.js-App.
- **Supabase** liefert die Live-Datenbank (Tabellen: `employees`, `commissions`, `documents`, `document_prints`).
- Keine Secrets im Repo. Konfiguration ausschließlich über Umgebungsvariablen
  (lokal `.env.local`, in Vercel über das Projekt-Setting).
- Keine lokalen Dateisystem-Abhängigkeiten — alles serverless-kompatibel.

## Daten

- **Mock-Daten werden über Data-Funktionen gekapselt.** Pages und Komponenten
  importieren ausschließlich aus `lib/data/*`, nie direkt aus `mocks/*`.
- **Supabase ist live angebunden.** Die Daten-Funktionen in `lib/data/commissions.ts` und `lib/data/documents.ts` lesen und schreiben live in die Supabase-Datenbank.
- **Transparenter Fallback auf Mock-Daten:** Wenn die Datenbank leer ist, bei RLS-Fehlern (wenn keine aktive Sitzung besteht) oder bei Verbindungsproblemen greift die Data-Schicht automatisch auf die lokalen Mock-Daten in `mocks/data.ts` zurück, so dass lokales Entwickeln und Testen unterbrechungsfrei möglich sind.
- **Write-Pfad-Konvention:** Mutationen laufen über Next.js Server Actions
  (`"use server"`) in Routen-nahen `actions.ts`-Dateien, die wiederum die Data-Schicht aufrufen, `revalidatePath` ausführen und bei Erfolg weiterleiten. Die Data-Schicht wirft typisierte Fehler, die von den Server Actions an die Formulare gereicht werden.
- Mock-Daten leben isoliert unter `mocks/data.ts` und werden später entfernt, sobald Auth und RLS-Registrierung vollständig in der UI verankert sind.

## Druck

- **Print zunächst über HTML/CSS und Browser-Druck** (`window.print()`).
- A4 Querformat via `@page { size: A4 landscape; margin: 0 }` und `@media print`.
- Eigene Route-Group `app/print/` mit eigenem Layout — kein Topbar, kein
  Theme-Switch, immer hell (`color-scheme: light`).
- Mehrfachdruck Palette: `idx von total` (z. B. 1/5 … 5/5), eine Seite pro Aufruf;
  Batch-Druck später durch parallele Renderings + `page-break-after: always`.
- **PDF-Archivierung kommt später** über Supabase Storage. Server-seitiges
  Rendering dann via Headless Chromium (Playwright) auf einem separaten Worker —
  Vercel-Functions kommen dafür nicht in Frage (binäre Abhängigkeiten,
  Laufzeitlimits).
- Kein QR-Code im MVP.

## Drucklayout-Regeln (verbindlich)

- Drucklayouts bleiben immer hell. Dark-Mode existiert nur in der App-UI.
- Kommissionsnummer ist visuell dominant (200 px Display, light weight).
- Brass-Akzent `#A6824A` nur für Eyebrows / Index, nie für Flächen.
- Hairlines statt Schatten. Scharfe Ecken.

## Supabase-Schema (Produktiv)

Die Tabellen wurden verifiziert und die Data-Schicht auf das reale Schema angepasst:

- `commissions`
  - `id` (uuid, Primary Key)
  - `commission_number` (text, 6 Ziffern)
  - `customer_name` (text)
  - `project_name` (text, optional)
  - `notes` (text, optional)
  - `created_by_initials` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
- `documents`
  - `id` (uuid, Primary Key)
  - `commission_id` (uuid references commissions)
  - `document_type` (text: 'laufzettel' | 'palette')
  - `title` (text, z.B. "Laufzettel")
  - `form_data` (jsonb, strukturiert nach `LaufzettelFormData` / `PaletteFormData`)
  - `created_by_initials` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
- `document_prints`
  - `id` (uuid, Primary Key)
  - `document_id` (uuid references documents)
  - `print_label` (text, z.B. "Palette 1 / 5")
  - `pdf_url` (text, optional)
  - `created_by_initials` (text)
  - `created_at` (timestamptz)
- `employees`
  - `id` (uuid, Primary Key)
  - `initials` (text)
  - `name` (text)
  - `is_admin` (boolean)
  - `is_active` (boolean)
  - `created_at` (timestamptz)

- **Druck-Protokollierung:** Jeder Druckauftrag (Einzelseite oder Bereich) wird in der Tabelle `document_prints` protokolliert (sofern Berechtigungen dies zulassen).
- **RLS aktiv:** MVP-Policies verlangen für Schreiboperationen einen angemeldeten Benutzer (authenticated). RLS-Fehlermeldungen werden an den Client als nutzerfreundliche Fehlermeldungen durchgereicht.
- **Dokumenten-Speicherung:** Dokumente (Laufzettel und Palettenbeschriftungen) werden live in der Tabelle `documents` in Supabase gespeichert.
- **Formulardaten (form_data):** Alle dokumentenspezifischen Felder werden als JSONB im Feld `form_data` abgelegt:
  - *Laufzettel:* `area`, `componentName`, `material`, `surface`, `note`, `employeeInitials`, `categories`
  - *Palette:* `objectName`, `dimensions`, `positionNumber`, `packageCount`, `shippingNote`, `employeeInitials`
- **Kommissionsdetailseite:** Die Detailseite (`/kommissionen/[nr]`) lädt alle zugehörigen Dokumente aus Supabase und stellt sie in den jeweiligen Tabellen bzw. Rastern dar.

## Authentifizierung & Berechtigungen

- **Supabase Auth** ist als MVP-Voraussetzung integriert, um die Authentifizierung auf Datenbank-Ebene für RLS (Row Level Security) bereitzustellen.
- **Rollen und Rechte im MVP:** Alle angemeldeten Benutzer (authenticated) besitzen die gleichen Rechte und können Kommissionen und Dokumente erstellen, bearbeiten und drucken.
- **Zukünftige Erweiterung:** Feingranulare Rollenrechte, Admin-Rechte (z. B. für das Verwalten von Vorlagen) sowie die Kopplung an das `employees`-Schema sind für spätere Versionen vorgesehen.

## Offen

- Format/Sequenz der Kommissionsnummer (aktuell 6-stellig `260050`; Jahres-Präfix?).
- Bucket-Namen für Supabase Storage (`documents`, ggf. `templates`).

## Meilenstein: Formulare & Print-Finalisierung (2026-05-26)

- **Printlayouts für Laufzettel und Palettenbeschriftung** sind voll funktionsfähig und als MVP-Kern im A4-Querformat implementiert.
- **Formulare zur Dokumenterstellung** (neue Kommission, Laufzettel und Paletten) sind als clientseitige Formulare mit Server-Actions (für Kommission) / Client-Zustand (für Dokumente) vorbereitet, um die spätere Supabase-Anbindung minimalinvasiv zu gestalten.
- **Dauerhafte Speicherung** und Authentifizierung erfolgen im nächsten Schritt über Supabase.
- **HTML/CSS-Browserdruck** bleibt der primäre MVP-Druckweg, da er sich nahtlos über `@media print` und `break-after` konfigurieren lässt.
- **PDF-Archivierung** wird nachgelagert über einen separaten Worker mit Supabase Storage angebunden.

