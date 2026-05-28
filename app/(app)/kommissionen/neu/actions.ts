"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCommission,
  updateCommission,
  CommissionValidationError,
} from "@/lib/data/commissions";
import { getCurrentEmployee } from "@/lib/data/employees";

export type CreateCommissionState = {
  error?: string;
  fieldError?: { field: "no" | "client" | "owner"; message: string };
  values?: { no: string; client: string; project: string; owner: string; note: string };
};

export async function createCommissionAction(
  _prev: CreateCommissionState,
  formData: FormData
): Promise<CreateCommissionState> {
  const no = String(formData.get("no") ?? "");
  const client = String(formData.get("client") ?? "");
  const project = String(formData.get("project") ?? "");
  const note = String(formData.get("note") ?? "");

  // Kürzel automatisch vom eingeloggten Nutzer (Fallback: createCommission setzt "EDL").
  const me = await getCurrentEmployee();
  const owner = me?.initials ?? "";

  let created;
  try {
    created = await createCommission({ no, client, project, owner, note });
  } catch (e) {
    if (e instanceof CommissionValidationError) {
      return {
        fieldError: { field: e.field, message: e.message },
        values: { no, client, project, owner, note },
      };
    }
    return {
      error: e instanceof Error ? e.message : "Unbekannter Fehler.",
      values: { no, client, project, owner, note },
    };
  }

  revalidatePath("/");
  revalidatePath("/kommissionen");
  redirect(`/kommissionen/${created.no}`);
}

export async function updateCommissionAction(
  _prev: CreateCommissionState,
  formData: FormData
): Promise<CreateCommissionState> {
  const no = String(formData.get("no") ?? "");
  const client = String(formData.get("client") ?? "");
  const project = String(formData.get("project") ?? "");
  const owner = String(formData.get("owner") ?? "");
  const note = String(formData.get("note") ?? "");

  try {
    await updateCommission(no, { client, project, owner, note });
  } catch (e) {
    if (e instanceof CommissionValidationError) {
      return {
        fieldError: { field: e.field, message: e.message },
        values: { no, client, project, owner, note },
      };
    }
    return {
      error: e instanceof Error ? e.message : "Unbekannter Fehler.",
      values: { no, client, project, owner, note },
    };
  }

  revalidatePath("/");
  revalidatePath("/kommissionen");
  revalidatePath(`/kommissionen/${no}`);
  redirect(`/kommissionen/${no}`);
}


