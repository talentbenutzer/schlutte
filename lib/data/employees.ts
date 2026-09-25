import type { PostgrestError } from "@supabase/supabase-js";
import type {
  Employee,
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import {
  isMissingRoleColumnError,
  resolveAppRole,
  roleLabel,
  type AppRole,
} from "@/lib/auth/app-role";

// ─── DB-Row → Employee ────────────────────────────────────────────────────────

interface DBEmployee {
  id: string;
  initials: string;
  name: string;
  email?: string | null;
  /** Fehlt, solange die Migration 20260925_auslagen.sql nicht gelaufen ist. */
  role?: string | null;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

function toEmployee(row: DBEmployee): Employee {
  const appRole = resolveAppRole(row.role, row.is_admin);
  return {
    id: row.id,
    initials: row.initials,
    kuerzel: row.initials, // UI compatibility
    name: row.name,
    email: row.email ?? undefined,
    role: roleLabel(appRole), // UI compatibility
    app_role: appRole,
    is_admin: row.is_admin,
    is_active: row.is_active,
    created_at: formatDate(row.created_at),
    updated_at: row.updated_at ? formatDate(row.updated_at) : undefined,
  };
}

// ─── Robustheit: Spalte employees.role ist optional ──────────────────────────
// Die Migration läuft manuell (ggf. erst nach dem Deploy). Bis dahin wird ohne
// role gelesen/geschrieben; die Rolle ergibt sich dann aus is_admin.

const BASE_COLUMNS = "id, initials, name, email, is_admin, is_active, created_at, updated_at";
const ROLE_COLUMNS = `${BASE_COLUMNS}, role`;

type QueryResult = { data: unknown; error: PostgrestError | null };

async function selectWithRoleFallback(
  run: (columns: string) => PromiseLike<QueryResult>
): Promise<QueryResult> {
  const result = await run(ROLE_COLUMNS);
  if (result.error && isMissingRoleColumnError(result.error)) {
    return run(BASE_COLUMNS);
  }
  return result;
}

const CEO_NEEDS_MIGRATION =
  "Die Rolle „CEO“ ist erst verfügbar, wenn die Datenbank-Migration 20260925_auslagen.sql ausgeführt wurde.";

async function writeWithRoleFallback(
  payload: Record<string, unknown>,
  run: (payload: Record<string, unknown>) => PromiseLike<{ error: PostgrestError | null }>
): Promise<{ error: PostgrestError | null }> {
  const result = await run(payload);
  if (result.error && "role" in payload && isMissingRoleColumnError(result.error)) {
    // Ohne Spalte lässt sich "ceo" nicht abbilden — lieber klar melden als still verlieren.
    if (payload.role === "ceo") throw new Error(CEO_NEEDS_MIGRATION);
    const withoutRole = { ...payload };
    delete withoutRole.role;
    return run(withoutRole);
  }
  return result;
}

// ─── Reads ────────────────────────────────────────────────────────────────────

/** Alle Mitarbeiter (inkl. inaktiver) — für die Verwaltungsseite. */
export async function getEmployees(): Promise<Employee[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await selectWithRoleFallback((columns) =>
      supabase.from("employees").select(columns).order("name", { ascending: true })
    );

    if (error) {
      console.error("Error fetching employees:", error.message);
      return [];
    }
    return ((data as DBEmployee[] | null) ?? []).map(toEmployee);
  } catch (e) {
    console.error("Failed to fetch employees:", e);
    return [];
  }
}

/** Nur aktive Mitarbeiter — für Auswahlfelder in Formularen. */
export async function getActiveEmployees(): Promise<Employee[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await selectWithRoleFallback((columns) =>
      supabase
        .from("employees")
        .select(columns)
        .eq("is_active", true)
        .order("name", { ascending: true })
    );

    if (error) {
      console.error("Error fetching active employees:", error.message);
      return [];
    }
    return ((data as DBEmployee[] | null) ?? []).map(toEmployee);
  } catch (e) {
    console.error("Failed to fetch active employees:", e);
    return [];
  }
}

/** Der aktuell eingeloggte Mitarbeiter (per E-Mail-Abgleich auth.user ↔ employees). */
export async function getCurrentEmployee(): Promise<Employee | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return null;
    const email = user.email;
    const { data, error } = await selectWithRoleFallback((columns) =>
      supabase.from("employees").select(columns).ilike("email", email).maybeSingle()
    );
    if (error || !data) return null;
    return toEmployee(data as DBEmployee);
  } catch {
    return null;
  }
}

/**
 * Mitarbeiter-Datensatz und effektive App-Rolle zu einem Auth-User.
 * Abgleich wie in public.app_role(): id = auth.uid() oder E-Mail (ohne Groß-/
 * Kleinschreibung), Treffer per id bevorzugt. Inaktive Mitarbeiter erhalten
 * keine erweiterte Rolle ("mitarbeiter").
 */
export async function getEmployeeRoleForUser(
  userId: string,
  email: string | null | undefined
): Promise<{ employee: Employee | null; role: AppRole }> {
  const supabase = await createClient();
  const mail = email?.trim().toLowerCase() ?? "";
  // Sonderzeichen würden die or()-Filtersyntax brechen → dann nur per id suchen.
  const orFilter = mail && /^[^\s,()"\\]+$/.test(mail) ? `id.eq.${userId},email.ilike.${mail}` : null;

  const { data, error } = await selectWithRoleFallback((columns) => {
    const query = supabase.from("employees").select(columns);
    return orFilter ? query.or(orFilter) : query.eq("id", userId);
  });
  if (error) {
    console.error("Error fetching employee role:", error.message);
    return { employee: null, role: "mitarbeiter" };
  }

  // ilike kennt Platzhalter (_ und %) → exakten Abgleich hier nachziehen.
  const matches = ((data as DBEmployee[] | null) ?? []).filter(
    (row) => row.id === userId || (!!mail && row.email?.toLowerCase() === mail)
  );
  const pick = (rows: DBEmployee[]) => rows.find((row) => row.id === userId) ?? rows[0] ?? null;

  const row = pick(matches);
  const activeRow = pick(matches.filter((r) => r.is_active !== false));
  return {
    employee: row ? toEmployee(row) : null,
    role: activeRow ? resolveAppRole(activeRow.role, activeRow.is_admin) : "mitarbeiter",
  };
}

/** Einzelner Mitarbeiter per UUID. */
export async function getEmployeeById(id: string): Promise<Employee | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await selectWithRoleFallback((columns) =>
      supabase.from("employees").select(columns).eq("id", id).maybeSingle()
    );

    if (error || !data) return null;
    return toEmployee(data as DBEmployee);
  } catch {
    return null;
  }
}

// ─── Writes ───────────────────────────────────────────────────────────────────

/** Mitarbeiter anlegen. Kürzel wird uppercase gespeichert. */
export async function createEmployee(input: CreateEmployeeInput): Promise<void> {
  const supabase = await createClient();

  const initials = input.initials.toUpperCase().replace(/\s/g, "");
  if (initials.length === 0 || initials.length > 3) {
    throw new Error("Kürzel muss 1–3 Buchstaben haben (ohne Leerzeichen).");
  }
  if (!input.name.trim()) {
    throw new Error("Name darf nicht leer sein.");
  }

  // Eindeutigkeit prüfen
  const { data: existing } = await supabase
    .from("employees")
    .select("id")
    .eq("initials", initials)
    .maybeSingle();
  if (existing) {
    throw new Error(`Kürzel „${initials}" ist bereits vergeben.`);
  }

  const role: AppRole = input.role ?? (input.is_admin ? "admin" : "mitarbeiter");
  const { error } = await writeWithRoleFallback(
    {
      initials,
      name: input.name.trim(),
      email: input.email?.trim() || null,
      role,
      is_admin: role === "admin",
      is_active: input.is_active ?? true,
    },
    (row) => supabase.from("employees").insert(row)
  );

  if (error) {
    throw new Error(`Fehler beim Anlegen: ${error.message}`);
  }
}

/** Mitarbeiter bearbeiten (kein Duplikat). */
export async function updateEmployee(
  id: string,
  input: UpdateEmployeeInput
): Promise<void> {
  const supabase = await createClient();

  const updates: Record<string, unknown> = {};

  if (input.initials !== undefined) {
    const initials = input.initials.toUpperCase().replace(/\s/g, "");
    if (initials.length === 0 || initials.length > 3) {
      throw new Error("Kürzel muss 1–3 Buchstaben haben (ohne Leerzeichen).");
    }
    // Eindeutigkeit prüfen (außer eigene Zeile)
    const { data: existing } = await supabase
      .from("employees")
      .select("id")
      .eq("initials", initials)
      .neq("id", id)
      .maybeSingle();
    if (existing) {
      throw new Error(`Kürzel „${initials}" ist bereits vergeben.`);
    }
    updates.initials = initials;
  }
  if (input.name !== undefined) {
    if (!input.name.trim()) throw new Error("Name darf nicht leer sein.");
    updates.name = input.name.trim();
  }
  if (input.email !== undefined) updates.email = input.email?.trim() || null;
  if (input.role !== undefined) {
    updates.role = input.role;
    updates.is_admin = input.role === "admin";
  } else if (input.is_admin !== undefined) {
    updates.is_admin = input.is_admin;
  }
  if (input.is_active !== undefined) updates.is_active = input.is_active;

  const { error } = await writeWithRoleFallback(updates, (row) =>
    supabase.from("employees").update(row).eq("id", id)
  );

  if (error) {
    throw new Error(`Fehler beim Bearbeiten: ${error.message}`);
  }
}

/** Mitarbeiter aktiv/inaktiv schalten (Soft-Delete bevorzugt). */
export async function setEmployeeActive(
  id: string,
  active: boolean
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("employees")
    .update({ is_active: active })
    .eq("id", id);
  if (error) {
    throw new Error(`Fehler beim Status-Wechsel: ${error.message}`);
  }
}

/**
 * Mitarbeiter löschen.
 * Prüft zuerst, ob das Kürzel in Dokumenten/Drucken vorkommt.
 * Falls ja: nur Soft-Delete (is_active = false).
 * Falls nein: echter DELETE.
 */
export async function deleteEmployee(id: string): Promise<{ deleted: boolean; softOnly: boolean }> {
  const supabase = await createClient();

  // Kürzel des Mitarbeiters ermitteln
  const { data: emp } = await supabase
    .from("employees")
    .select("initials")
    .eq("id", id)
    .maybeSingle();

  if (!emp) throw new Error("Mitarbeiter nicht gefunden.");

  // Prüfen ob Kürzel in Dokumenten oder Drucken vorkommt
  const [{ count: docCount }, { count: printCount }] = await Promise.all([
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("created_by_initials", emp.initials),
    supabase
      .from("document_prints")
      .select("id", { count: "exact", head: true })
      .eq("created_by_initials", emp.initials),
  ]);

  const hasRefs = (docCount ?? 0) > 0 || (printCount ?? 0) > 0;
  if (hasRefs) {
    // Soft-Delete — Kürzel bleibt in historischen Dokumenten erhalten
    await setEmployeeActive(id, false);
    return { deleted: false, softOnly: true };
  }

  // Echter DELETE
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) throw new Error(`Fehler beim Löschen: ${error.message}`);
  return { deleted: true, softOnly: false };
}
