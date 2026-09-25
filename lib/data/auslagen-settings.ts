import { createClient } from "@/lib/supabase/server";
import type { Company, CompanyId, UpdateCompanyInput } from "@/lib/auslagen/types";
import { COMPANY_IDS } from "@/lib/auslagen/types";
import { AuslagenError, toAuslagenError } from "@/lib/auslagen/errors";

/**
 * Firmen (expense_companies): Name, Adresse und Empfänger-E-Mail für Anträge.
 * Lesen dürfen alle angemeldeten Nutzer, Ändern nur die Finanz-Rolle (RLS).
 * Aufrufer prüfen die Rolle zusätzlich serverseitig (requireFinance).
 */

const COMPANY_COLUMNS = "id, name, address, recipient_email, sort, updated_at";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isCompanyId(value: unknown): value is CompanyId {
  return typeof value === "string" && (COMPANY_IDS as readonly string[]).includes(value);
}

/** Alle Firmen, sortiert. Wirft AuslagenError (z. B. code "migration", wenn die Tabelle fehlt). */
export async function getCompanies(): Promise<Company[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expense_companies")
    .select(COMPANY_COLUMNS)
    .order("sort", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw toAuslagenError(error, "Firmen konnten nicht geladen werden");
  return (data ?? []) as Company[];
}

/** Einzelne Firma oder null. */
export async function getCompany(id: string): Promise<Company | null> {
  if (!isCompanyId(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expense_companies")
    .select(COMPANY_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw toAuslagenError(error, "Firma konnte nicht geladen werden");
  return (data as Company | null) ?? null;
}

function normalizeMultiline(value: string | null | undefined): string | null {
  const text = (value ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || null;
}

/** Firma aktualisieren (nur Finanz-Rolle). Gibt die gespeicherte Zeile zurück. */
export async function updateCompany(id: string, input: UpdateCompanyInput): Promise<Company> {
  if (!isCompanyId(id)) throw new AuslagenError("not_found", "Unbekannte Firma.");

  const name = (input.name ?? "").trim();
  const address = normalizeMultiline(input.address);
  const recipientEmail = (input.recipient_email ?? "").trim() || null;

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Bitte einen Namen angeben.";
  else if (name.length > 120) fieldErrors.name = "Der Name ist zu lang (max. 120 Zeichen).";
  if (address && address.length > 500) fieldErrors.address = "Die Adresse ist zu lang (max. 500 Zeichen).";
  if (recipientEmail && (recipientEmail.length > 200 || !EMAIL_RE.test(recipientEmail))) {
    fieldErrors.recipient_email = "Bitte eine gültige E-Mail-Adresse angeben.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    throw new AuslagenError("validation", "Bitte die markierten Felder prüfen.", fieldErrors);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expense_companies")
    .update({ name, address, recipient_email: recipientEmail })
    .eq("id", id)
    .select(COMPANY_COLUMNS)
    .maybeSingle();
  if (error) throw toAuslagenError(error, "Firma konnte nicht gespeichert werden");
  // RLS filtert fremde Updates stillschweigend → keine Zeile zurück.
  if (!data) {
    throw new AuslagenError(
      "forbidden",
      "Firma konnte nicht gespeichert werden: keine Berechtigung oder Firma nicht gefunden."
    );
  }
  return data as Company;
}
