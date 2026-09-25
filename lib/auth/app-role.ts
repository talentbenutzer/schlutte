/**
 * App-Rollen — reine Hilfsfunktionen ohne Server-Abhängigkeiten.
 * Dürfen deshalb auch in Client-Komponenten importiert werden (Topbar etc.).
 * Serverseitige Prüfungen (requireUser/requireFinance) liegen in lib/auth/roles.ts.
 */

export type AppRole = "mitarbeiter" | "ceo" | "admin";

export const APP_ROLES: readonly AppRole[] = ["mitarbeiter", "ceo", "admin"];

/** Finanz-Rolle: Kreditkarten, Abrechnungen/Abgleich, Einstellungen im Bereich Auslagen. */
export const FINANCE_ROLES: readonly AppRole[] = ["ceo", "admin"];

const ROLE_LABEL: Record<AppRole, string> = {
  mitarbeiter: "Mitarbeiter",
  ceo: "CEO",
  admin: "Admin",
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

/** Formularwert → AppRole (unbekannt/leer = "mitarbeiter"). */
export function parseAppRole(value: unknown): AppRole {
  return isAppRole(value) ? value : "mitarbeiter";
}

/**
 * Effektive Rolle aus employees.role und employees.is_admin.
 * Fehlt die Spalte role (Migration noch nicht gelaufen) oder ist sie leer,
 * gilt der Fallback is_admin ? "admin" : "mitarbeiter". is_admin = true bleibt
 * immer Admin — so passen Rolle und die bestehenden Admin-Prüfungen zusammen.
 * Muss zur SQL-Funktion public.app_role() passen.
 */
export function resolveAppRole(role: unknown, isAdmin?: boolean | null): AppRole {
  if (role === "ceo") return "ceo";
  if (role === "admin" || isAdmin === true) return "admin";
  return "mitarbeiter";
}

export function isFinanceRole(role: AppRole | null | undefined): boolean {
  return role === "ceo" || role === "admin";
}

/** CEO und Admin haben dieselben Verwaltungsrechte; die Rollen bleiben getrennt. */
export function hasAdminRights(role: AppRole | null | undefined): boolean {
  return role === "ceo" || role === "admin";
}

/** Anzeige-Label: "Mitarbeiter" | "CEO" | "Admin". */
export function roleLabel(role: AppRole | null | undefined): string {
  return ROLE_LABEL[role ?? "mitarbeiter"] ?? ROLE_LABEL.mitarbeiter;
}

/**
 * true, wenn ein Supabase-/PostgREST-Fehler auf die (noch) fehlende Spalte
 * employees.role zurückgeht — Postgres 42703 (undefined_column) beim Lesen bzw.
 * PGRST204 ("Could not find the 'role' column … in the schema cache") beim Schreiben.
 */
export function isMissingRoleColumnError(
  error: { code?: string | null; message?: string | null } | null | undefined
): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  if (!message.includes("role")) return false;
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}
