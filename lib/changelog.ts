/**
 * lib/changelog.ts
 * Statisch gepflegter Changelog für die Update-Info auf der Feedback-Seite.
 * Neue Einträge oben einfügen (neueste zuerst).
 */

export type ChangelogEntry = {
  version: string;
  date: string; // "TT.MM.JJJJ"
  changes: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.1.0",
    date: "26.05.2026",
    changes: [
      "Supabase Login und Row Level Security aktiv",
      "Kommissionen können erstellt, bearbeitet und durchsucht werden",
      "Palettenlabel intern und Palettenversand-Labels können erstellt, bearbeitet und gedruckt werden",
      "Mehrere Palettenversand-Labels pro Kommission werden unterstützt",
      "Dokumente werden als Einträge in Supabase gespeichert",
      "Begrüßung nach Tageszeit auf dem Dashboard",
      "Mitarbeiterverwaltung unter /mitarbeiter",
      "Feedbackfunktion eingebaut",
    ],
  },
];
