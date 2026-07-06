"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createEmployee,
  updateEmployee,
  setEmployeeActive,
  deleteEmployee,
  getEmployeeById,
} from "@/lib/data/employees";
import {
  setPasswordForEmail,
  deleteAuthUserByEmail,
  MIN_PASSWORD_LENGTH,
} from "@/lib/data/auth-admin";
import { requireAdmin } from "@/lib/auth/admin-guard";
import type { CreateEmployeeInput, UpdateEmployeeInput } from "@/lib/types";

export async function createEmployeeAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const input: CreateEmployeeInput = {
    initials: (formData.get("initials") as string) ?? "",
    name: (formData.get("name") as string) ?? "",
    email: (formData.get("email") as string) || undefined,
    is_admin: formData.get("is_admin") === "true",
    is_active: formData.get("is_active") !== "false",
  };
  const password = ((formData.get("password") as string) ?? "").trim();

  try {
    await requireAdmin();

    // Optionales Login: nur wenn ein Passwort gesetzt wurde.
    if (password) {
      if (!input.email?.trim()) {
        return { error: "Für ein Login wird eine E-Mail-Adresse benötigt." };
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        return { error: `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben.` };
      }
    }

    await createEmployee(input);

    // Login erst nach erfolgreichem Anlegen des Datensatzes erzeugen.
    if (password && input.email) {
      await setPasswordForEmail(input.email, password);
    }
  } catch (e) {
    return { error: (e as Error).message };
  }

  revalidatePath("/mitarbeiter");
  redirect("/mitarbeiter");
}

export async function updateEmployeeAction(
  id: string,
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const input: UpdateEmployeeInput = {
    initials: (formData.get("initials") as string) ?? undefined,
    name: (formData.get("name") as string) ?? undefined,
    email: (formData.get("email") as string) || undefined,
    is_admin: formData.get("is_admin") === "true",
    is_active: formData.get("is_active") !== "false",
  };

  try {
    await requireAdmin();
    await updateEmployee(id, input);
  } catch (e) {
    return { error: (e as Error).message };
  }

  revalidatePath("/mitarbeiter");
  redirect("/mitarbeiter");
}

/**
 * Passwort setzen bzw. zurücksetzen. Existiert noch kein Login zur E-Mail des
 * Mitarbeiters, wird es angelegt. Wird vom Bearbeiten-Formular aufgerufen.
 */
export async function setPasswordAction(
  employeeId: string,
  _prev: { error?: string; success?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const password = ((formData.get("password") as string) ?? "").trim();

  try {
    await requireAdmin();

    const employee = await getEmployeeById(employeeId);
    if (!employee) return { error: "Mitarbeiter nicht gefunden." };
    if (!employee.email?.trim()) {
      return { error: "Der Mitarbeiter hat keine E-Mail-Adresse — bitte zuerst hinterlegen." };
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return { error: `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben.` };
    }

    const result = await setPasswordForEmail(employee.email, password);
    return {
      success:
        result === "created"
          ? `Login für ${employee.email} angelegt.`
          : `Passwort für ${employee.email} aktualisiert.`,
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function toggleActiveAction(
  id: string,
  active: boolean
): Promise<void> {
  await requireAdmin();
  await setEmployeeActive(id, active);
  revalidatePath("/mitarbeiter");
}

export async function deleteEmployeeAction(
  id: string
): Promise<{ softOnly: boolean; error?: string }> {
  try {
    await requireAdmin();

    // E-Mail vor dem Löschen merken, um den zugehörigen Login zu entfernen.
    const employee = await getEmployeeById(id);
    const result = await deleteEmployee(id);

    // Login nur bei echtem Löschen (nicht bei Soft-Delete) entfernen.
    if (!result.softOnly && employee?.email) {
      try {
        await deleteAuthUserByEmail(employee.email);
      } catch (e) {
        console.warn("Login konnte nicht entfernt werden:", (e as Error).message);
      }
    }

    revalidatePath("/mitarbeiter");
    return { softOnly: result.softOnly };
  } catch (e) {
    return { softOnly: false, error: (e as Error).message };
  }
}
