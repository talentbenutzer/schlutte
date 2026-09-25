/**
 * lib/auslagen/changelog.ts
 * Statisch gepflegter Changelog für die Info-Seite des Auslagen-Bereichs.
 * Neue Einträge oben einfügen (neueste zuerst).
 */

export type AuslagenChangelogEntry = {
  version: string;
  date: string; // "TT.MM.JJJJ"
  changes: string[];
};

export const AUSLAGEN_CHANGELOG: AuslagenChangelogEntry[] = [
  {
    version: "1.1.0",
    date: "25.09.2026",
    changes: [
      "Antragsstatus heißt jetzt „Eingereicht“ statt „Versendet“",
      "Original-Belegfotos werden 30 Tage nach Zuordnung zu einer Kartenbuchung automatisch gelöscht (erfasste Daten bleiben erhalten)",
      "MwSt-Satz wird im Antrag mit ausgewiesen",
      "Info-Seite mit Funktionsübersicht und Versionsstand",
    ],
  },
  {
    version: "1.0.0",
    date: "25.09.2026",
    changes: [
      "Belege per Foto oder Datei-Upload erfassen, KI liest Datum, Händler, Beträge und MwSt aus",
      "Zahlungswege: privat bezahlt oder Firmenkarte (AMEX, Kreditkarte, EC, Bar, Tank- & Raststätten)",
      "Antrag auf Auslagenerstattung mit Firmenwahl (Grabner Design oder höllental), Unterschrift und PDF-Export mit Belegen",
      "Antrags-PDF per iPhone-Teilen-Funktion an die hinterlegte Empfänger-E-Mail übergeben",
      "Antragseingang für CEO/Admin mit Ungelesen-Markierung und PDF-Sammeldownload",
      "Kreditkarten anlegen, PDF-Abrechnungen hochladen, Buchungen automatisch mit Belegen abgleichen",
      "Belegmappe als PDF exportieren",
      "Rollen Mitarbeiter, CEO und Admin; CEO und Admin mit denselben Verwaltungsrechten",
      "Installation als eigene App auf dem iPhone-Home-Bildschirm, ohne App Store",
    ],
  },
];
