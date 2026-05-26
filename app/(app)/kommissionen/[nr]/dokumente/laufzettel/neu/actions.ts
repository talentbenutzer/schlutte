"use server";

import { revalidatePath } from "next/cache";
import { createLaufzettelDocument, updateLaufzettelDocument } from "@/lib/data/documents";
import type { LaufzettelFormData } from "@/lib/types";

export async function saveLaufzettelAction(
  commissionNo: string,
  formData: LaufzettelFormData,
  documentId?: string
): Promise<{ error?: string; success?: boolean; documentId?: string }> {
  try {
    let finalDocId = documentId;
    if (documentId) {
      await updateLaufzettelDocument(documentId, formData);
    } else {
      finalDocId = await createLaufzettelDocument(commissionNo, formData);
    }
    revalidatePath(`/kommissionen/${commissionNo}`);
    revalidatePath("/");
    return { success: true, documentId: finalDocId };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Ein unbekannter Fehler ist aufgetreten."
    };
  }
}

