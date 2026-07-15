import { createClient } from "@/lib/supabase/server";
import type { UpcomingItem } from "@/lib/types";

// ── Datums-Helfer ─────────────────────────────────────────────────────────────

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** yyyy-mm-dd → lokales Date (Mitternacht), ohne Zeitzonen-Verschiebung. */
function parseISO(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y: y || 2000, m: m || 1, d: d || 1 };
}

function daysLabel(n: number): string {
  if (n <= 0) return "heute";
  if (n === 1) return "morgen";
  return `in ${n} Tagen`;
}

// ── Events ──────────────────────────────────────────────────────────────────

export async function getUpcomingEvents(): Promise<UpcomingItem[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .select("id, title, event_date")
      .gte("event_date", todayISO())
      .order("event_date", { ascending: true });

    if (error || !data) return [];

    const today = startOfToday();
    return data.map((r) => {
      const { y, m, d } = parseISO(r.event_date);
      const target = new Date(y, m - 1, d);
      const n = Math.round((target.getTime() - today.getTime()) / 86400000);
      return {
        id: r.id,
        text: r.title,
        dateISO: r.event_date,
        dateLabel: `${pad2(d)}.${pad2(m)}.${y}`,
        daysLabel: daysLabel(n),
        daysUntil: n,
      };
    });
  } catch {
    return [];
  }
}

export async function createEvent(title: string, date: string, initials?: string): Promise<void> {
  if (!title.trim()) throw new Error("Bitte eine Bezeichnung angeben.");
  if (!date) throw new Error("Bitte ein Datum angeben.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .insert({ title: title.trim(), event_date: date, created_by_initials: initials ?? null });
  if (error) throw new Error(`Event konnte nicht angelegt werden: ${error.message}`);
}

export async function updateEvent(id: string, title: string, date: string): Promise<void> {
  if (!title.trim()) throw new Error("Bitte eine Bezeichnung angeben.");
  if (!date) throw new Error("Bitte ein Datum angeben.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ title: title.trim(), event_date: date, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Event konnte nicht gespeichert werden: ${error.message}`);
}

export async function deleteEvent(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw new Error(`Event konnte nicht gelöscht werden: ${error.message}`);
}

// ── Geburtstage ───────────────────────────────────────────────────────────────

export async function getUpcomingBirthdays(): Promise<UpcomingItem[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("birthdays")
      .select("id, name, birth_date");

    if (error || !data) return [];

    const today = startOfToday();
    const items = data.map((r) => {
      const { m, d } = parseISO(r.birth_date);
      // Nächstes Vorkommen (dieses oder nächstes Jahr).
      let next = new Date(today.getFullYear(), m - 1, d);
      if (next.getTime() < today.getTime()) {
        next = new Date(today.getFullYear() + 1, m - 1, d);
      }
      const n = Math.round((next.getTime() - today.getTime()) / 86400000);
      return {
        id: r.id,
        text: r.name,
        dateISO: r.birth_date,
        dateLabel: `${pad2(d)}.${pad2(m)}.`,
        daysLabel: daysLabel(n),
        daysUntil: n,
      };
    });
    items.sort((a, b) => a.daysUntil - b.daysUntil);
    return items;
  } catch {
    return [];
  }
}

export async function createBirthday(name: string, date: string, initials?: string): Promise<void> {
  if (!name.trim()) throw new Error("Bitte einen Namen angeben.");
  if (!date) throw new Error("Bitte ein Datum angeben.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("birthdays")
    .insert({ name: name.trim(), birth_date: date, created_by_initials: initials ?? null });
  if (error) throw new Error(`Geburtstag konnte nicht angelegt werden: ${error.message}`);
}

export async function updateBirthday(id: string, name: string, date: string): Promise<void> {
  if (!name.trim()) throw new Error("Bitte einen Namen angeben.");
  if (!date) throw new Error("Bitte ein Datum angeben.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("birthdays")
    .update({ name: name.trim(), birth_date: date, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Geburtstag konnte nicht gespeichert werden: ${error.message}`);
}

export async function deleteBirthday(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("birthdays").delete().eq("id", id);
  if (error) throw new Error(`Geburtstag konnte nicht gelöscht werden: ${error.message}`);
}
