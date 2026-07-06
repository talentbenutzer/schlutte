"use server";

import { revalidatePath } from "next/cache";
import { deleteDocument } from "@/lib/data/documents";
import { deleteCommission } from "@/lib/data/commissions";

export async function deleteCommissionAction(
  commissionNo: string
): Promise<{ error?: string; success?: boolean }> {
  try {
    await deleteCommission(commissionNo);
    revalidatePath("/kommissionen");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Ein unbekannter Fehler ist aufgetreten.",
    };
  }
}

export async function deleteDocumentAction(
  commissionNo: string,
  documentId: string
): Promise<{ error?: string; success?: boolean }> {
  try {
    await deleteDocument(documentId);
    revalidatePath(`/kommissionen/${commissionNo}`);
    revalidatePath("/kommissionen");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Ein unbekannter Fehler ist aufgetreten.",
    };
  }
}
