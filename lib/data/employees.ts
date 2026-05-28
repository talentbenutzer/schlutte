import type {
  Employee,
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

// ─── DB-Row → Employee ────────────────────────────────────────────────────────

interface DBEmployee {
  id: string;
  initials: string;
  name: string;
  email?: string | null;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

function toEmployee(row: DBEmployee): Employee {
  return {
    id: row.id,
    initials: row.initials,
    kuerzel: row.initials, // UI compatibility
    name: row.name,
    email: row.email ?? undefined,
    role: row.is_admin ? "Admin" : "Mitarbeiter", // UI compatibility
    is_admin: row.is_admin,
    is_active: row.is_active,
    created_at: formatDate(row.created_at),
    updated_at: row.updated_at ? formatDate(row.updated_at) : undefined,
  };
}

// ─── Reads ────────────────────────────────────────────────────────────────────

/** Alle Mitarbeiter (inkl. inaktiver) — für die Verwaltungsseite. */
export async function getEmployees(): Promise<Employee[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("employees")
      .select("id, initials, name, email, is_admin, is_active, created_at, updated_at")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching employees:", error.message);
      return [];
    }
    return (data ?? []).map((r) => toEmployee(r as DBEmployee));
  } catch (e) {
    console.error("Failed to fetch employees:", e);
    return [];
  }
}

/** Nur aktive Mitarbeiter — für Auswahlfelder in Formularen. */
export async function getActiveEmployees(): Promise<Employee[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("employees")
      .select("id, initials, name, email, is_admin, is_active, created_at, updated_at")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching active employees:", error.message);
      return [];
    }
    return (data ?? []).map((r) => toEmployee(r as DBEmployee));
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
    const { data, error } = await supabase
      .from("employees")
      .select("id, initials, name, email, is_admin, is_active, created_at, updated_at")
      .ilike("email", user.email)
      .maybeSingle();
    if (error || !data) return null;
    return toEmployee(data as DBEmployee);
  } catch {
    return null;
  }
}

/** Einzelner Mitarbeiter per UUID. */
export async function getEmployeeById(id: string): Promise<Employee | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("employees")
      .select("id, initials, name, email, is_admin, is_active, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();

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

  const { error } = await supabase.from("employees").insert({
    initials,
    name: input.name.trim(),
    email: input.email?.trim() || null,
    is_admin: input.is_admin ?? false,
    is_active: input.is_active ?? true,
  });

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
  if (input.is_admin !== undefined) updates.is_admin = input.is_admin;
  if (input.is_active !== undefined) updates.is_active = input.is_active;

  const { error } = await supabase
    .from("employees")
    .update(updates)
    .eq("id", id);

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
