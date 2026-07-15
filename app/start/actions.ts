"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin-guard";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  createBirthday,
  updateBirthday,
  deleteBirthday,
} from "@/lib/data/hub";

type Result = { error?: string; success?: boolean };

async function run(fn: (initials?: string) => Promise<void>): Promise<Result> {
  try {
    const me = await requireAdmin();
    await fn(me.initials);
    revalidatePath("/start");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ein unbekannter Fehler ist aufgetreten." };
  }
}

// ── Events ──
export async function createEventAction(text: string, date: string): Promise<Result> {
  return run((initials) => createEvent(text, date, initials));
}
export async function updateEventAction(id: string, text: string, date: string): Promise<Result> {
  return run(() => updateEvent(id, text, date));
}
export async function deleteEventAction(id: string): Promise<Result> {
  return run(() => deleteEvent(id));
}

// ── Geburtstage ──
export async function createBirthdayAction(text: string, date: string): Promise<Result> {
  return run((initials) => createBirthday(text, date, initials));
}
export async function updateBirthdayAction(id: string, text: string, date: string): Promise<Result> {
  return run(() => updateBirthday(id, text, date));
}
export async function deleteBirthdayAction(id: string): Promise<Result> {
  return run(() => deleteBirthday(id));
}
