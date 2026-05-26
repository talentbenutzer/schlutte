# Schlutte — Designentscheidungen

Stand: 2026-05-26.

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
- **Supabase** liefert später Datenbank, Auth und Storage. Aktuell keine Live-Anbindung.
- Keine Secrets im Repo. Konfiguration ausschließlich über Umgebungsvariablen
  (lokal `.env.local`, in Vercel über das Projekt-Setting).
- Keine lokalen Dateisystem-Abhängigkeiten — alles serverless-kompatibel.

## Daten

- **Mock-Daten werden über Data-Funktionen gekapselt.** Pages und Komponenten
  importieren ausschließlich aus `lib/data/*`, nie direkt aus `mocks/*`.
- **Supabase wird später hinter diese Data-Schicht gesetzt.** Funktionen wie
  `getCommissions()`, `getCommissionByNumber(nr)` etc. sind bereits `async` und
  geben `Promise` zurück; nur die Implementierung wird ausgetauscht.
- API-Vertrag der Data-Schicht:
  - `lib/data/commissions.ts`: `getCommissions`, `getCommissionByNumber`,
    `searchCommissions`, `createCommission`
  - `lib/data/documents.ts`: `getRecentDocuments`, `getDocumentsByCommissionNumber`,
    `getPalettePrintPage`, `getPalettePrintRange`, `getLaufzettelPrintData`,
    `getPalettesForCommission`
- **Write-Pfad-Konvention:** Mutationen laufen über Next.js Server Actions
  (`"use server"`) in Routen-nahen `actions.ts`-Dateien, niemals direkt aus
  Komponenten. Die Action ruft die Data-Schicht, ruft `revalidatePath` und
  ggf. `redirect`. Die Data-Schicht wirft typisierte Fehler (z. B.
  `CommissionValidationError`), die Action mappt sie auf den Form-State.
- Mocks sind im Speicher *mutable* (z. B. `COMMISSIONS.unshift(...)`); Restart
  setzt den Stand zurück. Das ist für MVP ok, Supabase übernimmt das später.
- Mock-Daten leben isoliert unter `mocks/data.ts` und werden später ersatzlos
  entfernt, wenn Supabase übernimmt.

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

## Supabase-Schema (Entwurf)

Eingecheckt unter `supabase/schema.sql` — noch nicht ausgerollt, dient als
Vertrag für die Data-Schicht:

- `commissions` — `nr` als 6-stelliger Text mit CHECK, `client`, optional
  `project` (Bauteil/Objekt), `status`, FK auf `profiles` als Owner.
- `palettes` — `idx`, `total`, `content`, `weight`, `dim`, `positions text[]`,
  FK auf Kommission, unique `(commission_id, idx)`.
- `documents` — Druckstände (`kind in ('laufzettel','palette')`), optionaler
  FK auf `palettes`, `storage_path` für später hochgeladene PDFs.
- `profiles` — spiegelt `auth.users`, trägt `kuerzel` und `role`.
- RLS aktiv, MVP-Policies: alle Authenticated dürfen lesen/schreiben; Vorlagen
  bekommen später eine Admin-only-Policy.

Sobald das Schema produktiv ist, wird `lib/data/*` umgestellt; Pages bleiben
unverändert.

## Offen

- Format/Sequenz der Kommissionsnummer (aktuell 6-stellig `260050`; Jahres-Präfix?).
- Bucket-Namen für Supabase Storage (`documents`, ggf. `templates`).
