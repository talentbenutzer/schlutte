"use server";

import { revalidatePath } from "next/cache";
import { errorMessage } from "@/lib/auslagen/errors";
import { markSubmittedClaimsRead } from "@/lib/data/auslagen-inbox";

export async function markClaimsReadAction(ids: string[]): Promise<{ ok: boolean; error?: string }> {
  try {
    await markSubmittedClaimsRead(ids);
    revalidatePath("/start");
    revalidatePath("/auslagen/eingang");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
