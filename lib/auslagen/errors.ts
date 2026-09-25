/**
 * Typisierte Fehler für den Auslagen-Data-Layer (lib/data/auslagen-*.ts).
 * Server Actions fangen sie ab und geben { error: e.message } an das Formular —
 * Fehler selbst nie an den Client werfen (Next.js schwärzt sie in Produktion).
 */

export type AuslagenErrorCode =
  | "auth" // nicht angemeldet
  | "forbidden" // keine Berechtigung (Rolle/RLS)
  | "not_found"
  | "validation" // ungültige Eingabe
  | "conflict" // Duplikat / Zustand passt nicht (z. B. Beleg steckt in einem Antrag)
  | "migration" // Tabelle/Spalte fehlt → 20260925_auslagen.sql ausführen
  | "db"; // sonstiger Datenbankfehler

export class AuslagenError extends Error {
  readonly code: AuslagenErrorCode;
  /** Optional: Fehler je Formularfeld (Feldname → Meldung). */
  readonly fieldErrors?: Record<string, string>;

  constructor(code: AuslagenErrorCode, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "AuslagenError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

type DbError = { code?: string | null; message?: string | null } | null | undefined;

export const MIGRATION_HINT =
  "Die Datenbank ist für Auslagen noch nicht eingerichtet (Migration 20260925_auslagen.sql ausführen).";

/** true, wenn Tabelle oder Spalte fehlt (Migration noch nicht ausgeführt). */
export function isMissingSchemaError(error: DbError): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  return (
    code === "42P01" || // undefined_table
    code === "42703" || // undefined_column
    code === "PGRST205" || // Tabelle nicht im Schema-Cache
    code === "PGRST204" || // Spalte nicht im Schema-Cache
    (message.includes("does not exist") && (message.includes("relation") || message.includes("column"))) ||
    message.includes("schema cache")
  );
}

/**
 * Supabase-/PostgREST-Fehler → AuslagenError mit deutscher Meldung.
 * context beschreibt die Aktion, z. B. "Firma konnte nicht gespeichert werden".
 */
export function toAuslagenError(error: DbError, context: string): AuslagenError {
  const code = error?.code ?? "";
  if (isMissingSchemaError(error)) {
    return new AuslagenError("migration", `${context}: ${MIGRATION_HINT}`);
  }
  if (code === "PGRST301" || code === "PGRST302" || code === "PGRST303") {
    return new AuslagenError("auth", `${context}: Sitzung abgelaufen. Bitte erneut anmelden.`);
  }
  if (code === "42501") {
    return new AuslagenError("forbidden", `${context}: Keine Berechtigung.`);
  }
  if (code === "23505") {
    return new AuslagenError("conflict", `${context}: Eintrag existiert bereits.`);
  }
  if (code === "23503") {
    return new AuslagenError("conflict", `${context}: Verknüpfter Eintrag fehlt oder wird noch verwendet.`);
  }
  if (code === "23514" || code === "23502" || code === "22P02" || code === "22007" || code === "22008") {
    return new AuslagenError("validation", `${context}: Ungültige Eingabe.`);
  }
  if (code === "PGRST116") {
    return new AuslagenError("not_found", `${context}: Eintrag nicht gefunden.`);
  }
  const detail = error?.message ? ` (${error.message})` : "";
  return new AuslagenError("db", `${context}.${detail}`);
}

/** Für Server Actions: beliebigen Fehler in eine anzeigbare deutsche Meldung wandeln. */
export function errorMessage(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  return "Ein unbekannter Fehler ist aufgetreten.";
}
