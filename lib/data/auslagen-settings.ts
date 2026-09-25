import { createClient } from "@/lib/supabase/server";
import type { Company, CompanyId, UpdateCompanyInput } from "@/lib/auslagen/types";
import { AuslagenError, toAuslagenError } from "@/lib/auslagen/errors";

/**
 * Firmen (expense_companies): Name, Adresse und Empfänger-E-Mail für Anträge.
 * Lesen dürfen alle angemeldeten Nutzer, Anlegen/Ändern nur die Finanz-Rolle (RLS).
 * Aufrufer prüfen die Rolle zusätzlich serverseitig (requireFinance).
 */

const COMPANY_COLUMNS = "id, name, address, recipient_email, sort, updated_at";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Formatprüfung des Slugs (Primary Key), keine Prüfung gegen eine feste Liste mehr. */
export function isCompanyId(value: unknown): value is CompanyId {
  return typeof value === "string" && /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(value);
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return base || "firma";
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

function validateCompanyFields(input: UpdateCompanyInput): { name: string; address: string | null; recipientEmail: string | null } {
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
  return { name, address, recipientEmail };
}

/**
 * Neue Firma anlegen (nur Finanz-Rolle). Die Kennung (Primary Key) wird aus
 * dem Namen abgeleitet und bei Kollision mit einer Zahl eindeutig gemacht;
 * der Name selbst darf sich später jederzeit ändern.
 */
export async function createCompany(input: UpdateCompanyInput): Promise<Company> {
  const { name, address, recipientEmail } = validateCompanyFields(input);
  const supabase = await createClient();

  const { data: existing, error: listError } = await supabase.from("expense_companies").select("id, sort");
  if (listError) throw toAuslagenError(listError, "Firmen konnten nicht geladen werden");
  const existingIds = new Set((existing ?? []).map((row) => row.id as string));
  const base = slugify(name);
  let id = base;
  for (let n = 2; existingIds.has(id); n++) id = `${base}-${n}`;
  const nextSort = (existing ?? []).reduce((max, row) => Math.max(max, row.sort ?? 0), 0) + 1;

  const { data, error } = await supabase
    .from("expense_companies")
    .insert({ id, name, address, recipient_email: recipientEmail, sort: nextSort })
    .select(COMPANY_COLUMNS)
    .maybeSingle();
  if (error) throw toAuslagenError(error, "Firma konnte nicht angelegt werden");
  if (!data) {
    throw new AuslagenError("forbidden", "Firma konnte nicht angelegt werden: keine Berechtigung.");
  }
  return data as Company;
}

/** Firma aktualisieren (nur Finanz-Rolle). Gibt die gespeicherte Zeile zurück. */
export async function updateCompany(id: string, input: UpdateCompanyInput): Promise<Company> {
  if (!isCompanyId(id)) throw new AuslagenError("not_found", "Unbekannte Firma.");
  const { name, address, recipientEmail } = validateCompanyFields(input);

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

/**
 * Firma löschen (nur Finanz-Rolle). Scheitert, solange noch Kreditkarten
 * oder Anträge auf die Firma verweisen (FK-Schutz in der Datenbank).
 */
export async function deleteCompany(id: string): Promise<void> {
  if (!isCompanyId(id)) throw new AuslagenError("not_found", "Unbekannte Firma.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("expense_companies").delete().eq("id", id).select("id").maybeSingle();
  if (error) {
    if (error.code === "23503") {
      throw new AuslagenError(
        "conflict",
        "Diese Firma wird noch von Kreditkarten oder Anträgen verwendet und kann deshalb nicht gelöscht werden."
      );
    }
    throw toAuslagenError(error, "Firma konnte nicht gelöscht werden");
  }
  // RLS filtert fremde Löschungen stillschweigend → keine Zeile zurück.
  if (!data) {
    throw new AuslagenError(
      "forbidden",
      "Firma konnte nicht gelöscht werden: keine Berechtigung oder Firma nicht gefunden."
    );
  }
}
