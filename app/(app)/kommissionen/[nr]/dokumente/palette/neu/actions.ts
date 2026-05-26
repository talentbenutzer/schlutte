"use server";

import { revalidatePath } from "next/cache";
import { createPaletteDocument, updatePaletteDocument } from "@/lib/data/documents";
import type { PaletteFormData } from "@/lib/types";

export async function savePaletteAction(
  commissionNo: string,
  formData: PaletteFormData,
  documentId?: string
): Promise<{ error?: string; success?: boolean; documentId?: string }> {
  try {
    let finalDocId = documentId;
    if (documentId) {
      await updatePaletteDocument(documentId, formData);
    } else {
      finalDocId = await createPaletteDocument(commissionNo, formData);
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

