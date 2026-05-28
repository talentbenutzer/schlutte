import type {
  FeedbackEntry,
  FeedbackStatus,
  CreateFeedbackInput,
  UpdateFeedbackInput,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getFeedbackList(): Promise<FeedbackEntry[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("feedback")
      .select(
        "id, message, category, status, response_text, response_by_initials, response_at, created_by_user_id, created_by_email, created_by_initials, current_path, created_at, updated_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching feedback:", error.message);
      return [];
    }
    return (data ?? []) as FeedbackEntry[];
  } catch (e) {
    console.error("Failed to fetch feedback:", e);
    return [];
  }
}

// ─── Writes ───────────────────────────────────────────────────────────────────

export async function createFeedback(
  input: CreateFeedbackInput,
  userId?: string,
  userEmail?: string,
  userInitials?: string
): Promise<void> {
  const supabase = await createClient();

  if (!input.message.trim()) {
    throw new Error("Nachricht darf nicht leer sein.");
  }

  const { error } = await supabase.from("feedback").insert({
    message: input.message.trim(),
    category: input.category || null,
    current_path: input.current_path || null,
    created_by_user_id: userId || null,
    created_by_email: userEmail || null,
    created_by_initials: userInitials || null,
    status: "offen" as FeedbackStatus,
  });

  if (error) {
    throw new Error(`Fehler beim Speichern: ${error.message}`);
  }
}

export async function updateFeedbackStatus(
  id: string,
  status: FeedbackStatus
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("feedback")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(`Fehler beim Statuswechsel: ${error.message}`);
}

export async function saveFeedbackResponse(
  id: string,
  update: UpdateFeedbackInput
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("feedback")
    .update({
      response_text: update.response_text,
      response_by_initials: update.response_by_initials,
      response_at: update.response_text ? new Date().toISOString() : null,
      status: update.status ?? "beantwortet",
    })
    .eq("id", id);
  if (error) throw new Error(`Fehler beim Speichern der Antwort: ${error.message}`);
}
