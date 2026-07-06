import { getCurrentEmployee } from "@/lib/data/employees";
import type { Employee } from "@/lib/types";

/**
 * Stellt sicher, dass der aktuell eingeloggte Nutzer ein Administrator ist.
 * Wird serverseitig in allen Admin-Actions aufgerufen — dem Client darf nie
 * vertraut werden. Wirft bei fehlender Berechtigung.
 */
export async function requireAdmin(): Promise<Employee> {
  const me = await getCurrentEmployee();
  if (!me?.is_admin) {
    throw new Error("Nur Administratoren dürfen diese Aktion ausführen.");
  }
  return me;
}
