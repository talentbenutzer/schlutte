"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createFeedback,
  updateFeedbackStatus,
  saveFeedbackResponse,
} from "@/lib/data/feedback";
import type { FeedbackStatus, UpdateFeedbackInput } from "@/lib/types";

export async function submitFeedbackAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const message = (formData.get("message") as string)?.trim();
  const category = (formData.get("category") as string) || undefined;
  const currentPath = (formData.get("current_path") as string) || undefined;

  if (!message) {
    return { error: "Bitte geben Sie eine Nachricht ein." };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let initials: string | undefined;
    if (user) {
      const { data: emp } = await supabase
        .from("employees")
        .select("initials")
        .eq("id", user.id)
        .maybeSingle();
      initials = emp?.initials;
    }

    await createFeedback(
      { message, category, current_path: currentPath },
      user?.id,
      user?.email,
      initials
    );

    revalidatePath("/feedback");
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function updateStatusAction(
  id: string,
  status: FeedbackStatus
): Promise<void> {
  await updateFeedbackStatus(id, status);
  revalidatePath("/feedback");
}

export async function saveResponseAction(
  id: string,
  update: UpdateFeedbackInput
): Promise<{ error?: string }> {
  try {
    await saveFeedbackResponse(id, update);
    revalidatePath("/feedback");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}
