/**
 * Auslagen & Belege — Typen für alle Phasen (Belege, Anträge, Kreditkarten).
 * Die Row-Typen spiegeln die Tabellen aus supabase/migrations/20260925_auslagen.sql
 * (snake_case, wie Supabase sie liefert). Geldbeträge: number mit 2 Nachkommastellen
 * (DB numeric), Datumswerte ohne Uhrzeit: "YYYY-MM-DD", Zeitstempel: ISO-String.
 */

// ─── Firmen ──────────────────────────────────────────────────────────────────

export type CompanyId = "grabner" | "hoellental";

export const COMPANY_IDS: readonly CompanyId[] = ["grabner", "hoellental"];

/** Tabelle expense_companies. Adresse/E-Mail pflegt die Finanz-Rolle in den Einstellungen. */
export type Company = {
  id: CompanyId;
  name: string;
  /** Mehrzeilig (Zeilenumbrüche \n). */
  address: string | null;
  /** Empfänger der Anträge auf Auslagenerstattung. */
  recipient_email: string | null;
  sort: number;
  updated_at: string;
};

export type UpdateCompanyInput = {
  name: string;
  address?: string | null;
  recipient_email?: string | null;
};

// ─── Persönliches Profil (Antragsteller) ─────────────────────────────────────

/** Persönliche Angaben, die in jeden Antrag übernommen werden. */
export type ProfileFields = {
  first_name: string | null;
  last_name: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  personnel_no: string | null;
  cost_center: string | null;
  account_holder: string | null;
  /** Kompakt gespeichert (ohne Leerzeichen, Großbuchstaben). */
  iban: string | null;
  bic: string | null;
  bank_name: string | null;
};

export type ProfileFieldKey = keyof ProfileFields;

/** Tabelle expense_profiles (eine Zeile pro Nutzer). */
export type ExpenseProfile = ProfileFields & {
  user_id: string;
  updated_at: string | null;
};

/** Eingabe für upsertOwnProfile — leere Strings werden als null gespeichert. */
export type ExpenseProfileInput = { [K in ProfileFieldKey]?: string | null };

/** Feld-Metadaten für Formulare (Profil, Antragsteller im Antrag). */
export const PROFILE_FIELDS: readonly {
  key: ProfileFieldKey;
  label: string;
  /** Für einen Antrag erforderlich. */
  required: boolean;
  autoComplete?: string;
}[] = [
  { key: "last_name", label: "Name", required: true, autoComplete: "family-name" },
  { key: "first_name", label: "Vorname", required: true, autoComplete: "given-name" },
  { key: "street", label: "Straße und Hausnummer", required: true, autoComplete: "street-address" },
  { key: "postal_code", label: "PLZ", required: true, autoComplete: "postal-code" },
  { key: "city", label: "Ort", required: true, autoComplete: "address-level2" },
  { key: "personnel_no", label: "Personalnummer", required: false },
  { key: "cost_center", label: "Kostenstelle", required: false },
  { key: "account_holder", label: "Kontoinhaber", required: true, autoComplete: "name" },
  { key: "iban", label: "IBAN", required: true, autoComplete: "off" },
  { key: "bic", label: "BIC", required: false, autoComplete: "off" },
  { key: "bank_name", label: "Name der Bank", required: false, autoComplete: "off" },
];

/**
 * Snapshot der Antragsteller-Daten in expense_claims.applicant (jsonb).
 * Alle Felder als String ("" = nicht angegeben), IBAN kompakt.
 */
export type ApplicantSnapshot = { [K in ProfileFieldKey]: string };

// ─── Belege ──────────────────────────────────────────────────────────────────

export type ReceiptStatus = "entwurf" | "erfasst";

export type PaymentMethod = "privat" | "kreditkarte";

/** Tabelle receipts. */
export type Receipt = {
  id: string;
  user_id: string;
  status: ReceiptStatus;
  receipt_date: string | null;
  merchant: string | null;
  /** Beschreibung / Zweck. */
  description: string | null;
  /** ISO-4217, Standard "EUR". */
  currency: string;
  gross_amount: number | null;
  net_amount: number | null;
  vat_amount: number | null;
  /** Prozent, z. B. 19; null = gemischt/unbekannt. */
  vat_rate: number | null;
  /** Nur bei Fremdwährung: Bruttobetrag in EUR. */
  gross_amount_eur: number | null;
  payment_method: PaymentMethod;
  credit_card_id: string | null;
  /** Storage-Pfad im Bucket "auslagen": {uid}/belege/{uuid}.jpg|pdf */
  file_path: string;
  file_mime: string;
  file_name: string | null;
  extraction: ReceiptExtraction | null;
  extraction_error: string | null;
  claim_id: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Anträge auf Auslagenerstattung ──────────────────────────────────────────

export type ClaimStatus = "erstellt" | "versendet";

/** Tabelle expense_claims. */
export type ExpenseClaim = {
  id: string;
  user_id: string;
  company_id: CompanyId;
  /** Snapshot der Empfänger-E-Mail zum Zeitpunkt der Erstellung. */
  recipient_email: string | null;
  applicant: ApplicantSnapshot;
  place: string | null;
  claim_date: string;
  /** Unterschrift als PNG-Data-URL. */
  signature_png: string | null;
  total_gross: number;
  receipt_count: number;
  /** Storage-Pfad: {uid}/antraege/{claimId}.pdf (leer = PDF noch nicht erzeugt). */
  pdf_path: string | null;
  status: ClaimStatus;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Kreditkarten & Abrechnungen (Finanz-Rolle) ──────────────────────────────

/** Tabelle credit_cards. */
export type CreditCard = {
  id: string;
  owner_id: string | null;
  company_id: CompanyId | null;
  label: string;
  /** Letzte 4 Ziffern. */
  last4: string | null;
  holder_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type StatementStatus = "neu" | "verarbeitet" | "fehler";

/** Tabelle card_statements. */
export type CardStatement = {
  id: string;
  uploaded_by: string | null;
  credit_card_id: string | null;
  period_start: string | null;
  period_end: string | null;
  statement_date: string | null;
  total_amount: number | null;
  currency: string | null;
  /** Storage-Pfad: {uid}/abrechnungen/{uuid}.pdf */
  file_path: string;
  file_name: string | null;
  extraction: StatementExtraction | null;
  extraction_error: string | null;
  status: StatementStatus;
  created_at: string;
  updated_at: string;
};

export type MatchStatus = "offen" | "auto" | "manuell" | "ohne_beleg";

/** Tabelle card_transactions. */
export type CardTransaction = {
  id: string;
  statement_id: string;
  credit_card_id: string | null;
  transaction_date: string | null;
  booking_date: string | null;
  merchant: string | null;
  description: string | null;
  /** EUR; positiv = Belastung, negativ = Gutschrift. */
  amount: number;
  original_amount: number | null;
  original_currency: string | null;
  receipt_id: string | null;
  match_status: MatchStatus;
  match_score: number | null;
  note: string | null;
  sort: number | null;
  created_at: string;
  updated_at: string;
};

// ─── KI-Extraktion ───────────────────────────────────────────────────────────

export type VatLine = {
  /** Prozent, z. B. 19. */
  rate: number | null;
  net: number | null;
  vat: number | null;
  gross: number | null;
};

export type PaymentHint = "karte" | "bar" | "unbekannt";

/** Ergebnis von extractReceipt() — wird roh in receipts.extraction gespeichert. */
export type ReceiptExtraction = {
  /** "YYYY-MM-DD" */
  date: string | null;
  merchant: string | null;
  description_suggestion: string | null;
  currency: string | null;
  gross: number | null;
  net: number | null;
  vat_total: number | null;
  vat_lines: VatLine[];
  card_last4: string | null;
  payment_hint: PaymentHint;
};

export type StatementTransactionExtraction = {
  transaction_date: string | null;
  booking_date: string | null;
  merchant: string | null;
  description: string | null;
  /** EUR; positiv = Belastung, negativ = Gutschrift. */
  amount: number;
  original_amount: number | null;
  original_currency: string | null;
};

/** Ergebnis von extractStatement() — wird roh in card_statements.extraction gespeichert. */
export type StatementExtraction = {
  card_last4: string | null;
  holder: string | null;
  period_start: string | null;
  period_end: string | null;
  statement_date: string | null;
  total: number | null;
  currency: string | null;
  transactions: StatementTransactionExtraction[];
};

// ─── Anzeige-Labels ──────────────────────────────────────────────────────────

export const RECEIPT_STATUS_LABEL: Record<ReceiptStatus, string> = {
  entwurf: "Entwurf",
  erfasst: "Erfasst",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  privat: "Privat bezahlt",
  kreditkarte: "Firmen-Kreditkarte",
};

export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  erstellt: "Erstellt",
  versendet: "Versendet",
};

export const STATEMENT_STATUS_LABEL: Record<StatementStatus, string> = {
  neu: "Neu",
  verarbeitet: "Verarbeitet",
  fehler: "Fehler",
};

export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  offen: "Offen",
  auto: "Automatisch zugeordnet",
  manuell: "Manuell zugeordnet",
  ohne_beleg: "Ohne Beleg",
};
