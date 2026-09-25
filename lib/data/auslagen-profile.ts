import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/roles";
import type {
  ExpenseProfile,
  ExpenseProfileInput,
  ProfileFieldKey,
} from "@/lib/auslagen/types";
import { PROFILE_FIELDS } from "@/lib/auslagen/types";
import { isValidIban, normalizeIban } from "@/lib/auslagen/format";
import { AuslagenError, toAuslagenError } from "@/lib/auslagen/errors";

/**
 * Persönliches Profil (expense_profiles) — genau eine Zeile pro Nutzer.
 * RLS erlaubt nur die eigene Zeile; user_id kommt immer aus der Sitzung.
 */

const PROFILE_COLUMNS =
  "user_id, first_name, last_name, street, postal_code, city, personnel_no, cost_center, account_holder, iban, bic, bank_name, updated_at";

const BIC_RE = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
const POSTAL_CODE_RE = /^[A-Za-z0-9][A-Za-z0-9 -]{2,9}$/;

/** Eigenes Profil oder null, wenn noch keines gespeichert wurde. */
export async function getOwnProfile(): Promise<ExpenseProfile | null> {
  const ctx = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expense_profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (error) throw toAuslagenError(error, "Profil konnte nicht geladen werden");
  return (data as ExpenseProfile | null) ?? null;
}

/**
 * Prüft und normalisiert Profilangaben. Nur übergebene Felder landen im Ergebnis
 * (leere Strings → null). IBAN wird kompakt gespeichert und per Mod 97 geprüft.
 */
export function validateProfileInput(input: ExpenseProfileInput): {
  values: Partial<Record<ProfileFieldKey, string | null>>;
  fieldErrors: Partial<Record<ProfileFieldKey, string>>;
} {
  const values: Partial<Record<ProfileFieldKey, string | null>> = {};
  const fieldErrors: Partial<Record<ProfileFieldKey, string>> = {};

  for (const { key, label } of PROFILE_FIELDS) {
    const raw = input[key];
    if (raw === undefined) continue;
    let value = (raw ?? "").replace(/\s+/g, " ").trim();

    if (key === "iban") {
      value = normalizeIban(value);
      if (value && !isValidIban(value)) {
        fieldErrors.iban = "IBAN ungültig — bitte Länge und Prüfziffern kontrollieren.";
      }
    } else if (key === "bic") {
      value = value.replace(/\s/g, "").toUpperCase();
      if (value && !BIC_RE.test(value)) {
        fieldErrors.bic = "BIC muss 8 oder 11 Zeichen haben (z. B. COBADEFFXXX).";
      }
    } else if (key === "postal_code" && value && !POSTAL_CODE_RE.test(value)) {
      fieldErrors.postal_code = "PLZ ungültig.";
    }

    if (value.length > 200 && !fieldErrors[key]) {
      fieldErrors[key] = `${label}: max. 200 Zeichen.`;
    }
    values[key] = value || null;
  }

  return { values, fieldErrors };
}

/** Eigenes Profil anlegen oder aktualisieren. Nicht übergebene Felder bleiben unverändert. */
export async function upsertOwnProfile(input: ExpenseProfileInput): Promise<ExpenseProfile> {
  const ctx = await requireUser();
  const { values, fieldErrors } = validateProfileInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    throw new AuslagenError(
      "validation",
      "Bitte die markierten Felder prüfen.",
      fieldErrors as Record<string, string>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expense_profiles")
    .upsert({ user_id: ctx.userId, ...values }, { onConflict: "user_id" })
    .select(PROFILE_COLUMNS)
    .single();
  if (error) throw toAuslagenError(error, "Profil konnte nicht gespeichert werden");
  return data as ExpenseProfile;
}
