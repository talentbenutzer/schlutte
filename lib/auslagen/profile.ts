/**
 * Reine Helfer rund um das Antragsteller-Profil (Server und Client).
 */
import {
  PROFILE_FIELDS,
  type ApplicantSnapshot,
  type ProfileFieldKey,
} from "@/lib/auslagen/types";
import { normalizeIban } from "@/lib/auslagen/format";

type LooseFields = Partial<Record<ProfileFieldKey, string | null | undefined>> | null | undefined;

/** Snapshot für expense_claims.applicant: alle Felder als getrimmte Strings, IBAN kompakt. */
export function applicantFromProfile(fields: LooseFields): ApplicantSnapshot {
  const out = {} as ApplicantSnapshot;
  for (const { key } of PROFILE_FIELDS) {
    out[key] = (fields?.[key] ?? "").trim();
  }
  out.iban = normalizeIban(out.iban);
  return out;
}

/** Labels der Pflichtfelder, die für einen Antrag noch fehlen (leer = vollständig). */
export function getMissingProfileFields(fields: LooseFields): string[] {
  return PROFILE_FIELDS.filter((f) => f.required && !(fields?.[f.key] ?? "").trim()).map(
    (f) => f.label
  );
}

/** "Edmund Laabs" → Vorname "Edmund", Name "Laabs" (Vorbelegung aus employees.name). */
export function splitFullName(name: string | null | undefined): {
  first_name: string;
  last_name: string;
} {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "", last_name: "" };
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return { first_name: parts.slice(0, -1).join(" "), last_name: parts[parts.length - 1] };
}
