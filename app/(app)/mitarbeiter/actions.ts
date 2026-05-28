"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createEmployee,
  updateEmployee,
  setEmployeeActive,
  deleteEmployee,
} from "@/lib/data/employees";
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

  try {
    await createEmployee(input);
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
    await updateEmployee(id, input);
  } catch (e) {
    return { error: (e as Error).message };
  }

  revalidatePath("/mitarbeiter");
  redirect("/mitarbeiter");
}

export async function toggleActiveAction(
  id: string,
  active: boolean
): Promise<void> {
  await setEmployeeActive(id, active);
  revalidatePath("/mitarbeiter");
}

export async function deleteEmployeeAction(
  id: string
): Promise<{ softOnly: boolean; error?: string }> {
  try {
    const result = await deleteEmployee(id);
    revalidatePath("/mitarbeiter");
    return { softOnly: result.softOnly };
  } catch (e) {
    return { softOnly: false, error: (e as Error).message };
  }
}
