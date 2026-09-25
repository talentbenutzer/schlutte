import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getEmployeeRoleForUser } from "@/lib/data/employees";
import type { Employee } from "@/lib/types";
import { isFinanceRole, type AppRole } from "@/lib/auth/app-role";

// Reine Helfer (auch clientseitig nutzbar) zusätzlich von hier erreichbar.
export {
  APP_ROLES,
  FINANCE_ROLES,
  isAppRole,
  isFinanceRole,
  parseAppRole,
  resolveAppRole,
  roleLabel,
} from "@/lib/auth/app-role";
export type { AppRole } from "@/lib/auth/app-role";

export type UserContext = {
  userId: string;
  email: string | null;
  /** Zugehöriger employees-Datensatz (falls vorhanden). */
  employee: Employee | null;
  role: AppRole;
  /** role ist "ceo" oder "admin". */
  isFinance: boolean;
};

/**
 * Angemeldeter Nutzer mit Mitarbeiter-Datensatz und App-Rolle — oder null.
 * Pro Request gecacht (Layout und Seite fragen nur einmal ab).
 * Die Rolle entspricht public.app_role(), auf die sich die RLS-Policies stützen.
 */
export const getCurrentUserContext = cache(async (): Promise<UserContext | null> => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { employee, role } = await getEmployeeRoleForUser(user.id, user.email);
    return {
      userId: user.id,
      email: user.email ?? null,
      employee,
      role,
      isFinance: isFinanceRole(role),
    };
  } catch (e) {
    console.error("Benutzerkontext konnte nicht geladen werden:", e);
    return null;
  }
});

/** Für Server Actions: wirft, wenn niemand angemeldet ist. */
export async function requireUser(): Promise<UserContext> {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    throw new Error("Nicht angemeldet. Bitte erneut anmelden.");
  }
  return ctx;
}

/** Für Server Actions: wirft, wenn der Nutzer nicht CEO oder Admin ist. */
export async function requireFinance(): Promise<UserContext> {
  const ctx = await requireUser();
  if (!ctx.isFinance) {
    throw new Error("Nur CEO und Administratoren dürfen diese Aktion ausführen.");
  }
  return ctx;
}
