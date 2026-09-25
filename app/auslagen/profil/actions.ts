"use server";

import { revalidatePath } from "next/cache";
import { upsertOwnProfile } from "@/lib/data/auslagen-profile";
import { AuslagenError, errorMessage } from "@/lib/auslagen/errors";
import {
  PROFILE_FIELDS,
  type ExpenseProfileInput,
  type ProfileFieldKey,
} from "@/lib/auslagen/types";

export type ProfileActionResult = {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Partial<Record<ProfileFieldKey, string>>;
  /** Gespeicherte (normalisierte) Werte, z. B. IBAN kompakt. */
  values?: Record<ProfileFieldKey, string>;
};

/** Eigenes Profil speichern. user_id kommt aus der Sitzung (requireUser im Data-Layer). */
export async function saveProfileAction(formData: FormData): Promise<ProfileActionResult> {
  const input: ExpenseProfileInput = {};
  for (const { key } of PROFILE_FIELDS) {
    const value = formData.get(key);
    if (typeof value === "string") input[key] = value;
  }

  try {
    const saved = await upsertOwnProfile(input);
    const values = {} as Record<ProfileFieldKey, string>;
    for (const { key } of PROFILE_FIELDS) values[key] = saved[key] ?? "";
    revalidatePath("/auslagen/profil");
    return { ok: true, message: "Profil gespeichert.", values };
  } catch (e) {
    if (e instanceof AuslagenError && e.fieldErrors) {
      return { ok: false, error: e.message, fieldErrors: e.fieldErrors };
    }
    return { ok: false, error: errorMessage(e) };
  }
}
