"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCommission,
  CommissionValidationError,
} from "@/lib/data/commissions";

export type CreateCommissionState = {
  error?: string;
  fieldError?: { field: "client"; message: string };
  values?: { client: string; project: string; owner: string };
};

export async function createCommissionAction(
  _prev: CreateCommissionState,
  formData: FormData
): Promise<CreateCommissionState> {
  const client = String(formData.get("client") ?? "");
  const project = String(formData.get("project") ?? "");
  const owner = String(formData.get("owner") ?? "");

  let created;
  try {
    created = await createCommission({ client, project, owner });
  } catch (e) {
    if (e instanceof CommissionValidationError) {
      return {
        fieldError: { field: e.field, message: e.message },
        values: { client, project, owner },
      };
    }
    return {
      error: e instanceof Error ? e.message : "Unbekannter Fehler.",
      values: { client, project, owner },
    };
  }

  revalidatePath("/");
  revalidatePath("/kommissionen");
  redirect(`/kommissionen/${created.no}`);
}
