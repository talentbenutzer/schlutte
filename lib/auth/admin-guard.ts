import { hasAdminRights } from "@/lib/auth/app-role";
import { getCurrentUserContext } from "@/lib/auth/roles";
import type { Employee } from "@/lib/types";

/**
 * Stellt sicher, dass der aktuell eingeloggte Nutzer CEO oder Admin ist.
 * Wird serverseitig in allen Admin-Actions aufgerufen — dem Client darf nie
 * vertraut werden. Wirft bei fehlender Berechtigung.
 */
export async function requireAdmin(): Promise<Employee> {
  const ctx = await getCurrentUserContext();
  if (!ctx?.employee || !hasAdminRights(ctx.role)) {
    throw new Error("Nur CEO und Administratoren dürfen diese Aktion ausführen.");
  }
  return ctx.employee;
}
