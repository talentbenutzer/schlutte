"use server";

import { revalidatePath } from "next/cache";
import { requireFinance } from "@/lib/auth/roles";
import { createCompany, updateCompany } from "@/lib/data/auslagen-settings";
import { AuslagenError, errorMessage } from "@/lib/auslagen/errors";
import type { Company } from "@/lib/auslagen/types";

export type CompanyActionResult = {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  company?: Company;
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Firma speichern — nur CEO/Admin (serverseitig geprüft, zusätzlich per RLS). */
export async function updateCompanyAction(
  companyId: string,
  formData: FormData
): Promise<CompanyActionResult> {
  try {
    await requireFinance();
    const company = await updateCompany(companyId, {
      name: text(formData, "name"),
      address: text(formData, "address"),
      recipient_email: text(formData, "recipient_email"),
    });
    revalidatePath("/auslagen/einstellungen");
    return { ok: true, message: `„${company.name}“ gespeichert.`, company };
  } catch (e) {
    if (e instanceof AuslagenError && e.fieldErrors) {
      return { ok: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { ok: false, error: errorMessage(e) };
  }
}

/** Neue Firma anlegen — nur CEO/Admin (serverseitig geprüft, zusätzlich per RLS). */
export async function createCompanyAction(formData: FormData): Promise<CompanyActionResult> {
  try {
    await requireFinance();
    const company = await createCompany({
      name: text(formData, "name"),
      address: text(formData, "address"),
      recipient_email: text(formData, "recipient_email"),
    });
    revalidatePath("/auslagen/einstellungen");
    return { ok: true, message: `„${company.name}“ angelegt.`, company };
  } catch (e) {
    if (e instanceof AuslagenError && e.fieldErrors) {
      return { ok: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { ok: false, error: errorMessage(e) };
  }
}
