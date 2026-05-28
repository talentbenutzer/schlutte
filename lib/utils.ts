/**
 * lib/utils.ts
 * Zentrale Hilfs-Utilities für Datumsformatierung und Begrüßungslogik.
 */

/**
 * Formatiert ein Datum als "TT.MM.JJJJ" (deutsches Format).
 * Akzeptiert ISO-Strings, Date-Objekte oder timestamptz-Strings aus Supabase.
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

/**
 * Formatiert ein Datum als "TT.MM.JJJJ, HH:mm" (deutsches Format mit Uhrzeit).
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

/**
 * Gibt eine tageszeit-abhängige Begrüßung zurück.
 *   05:00 – 10:59 → "Guten Morgen, Name."
 *   11:00 – 17:59 → "Guten Tag, Name."
 *   18:00 – 04:59 → "Guten Abend, Name."
 *
 * @param name Anzeigename (kann leer sein → Fallback auf neutralen Text)
 */
export function getGreeting(name?: string | null): string {
  const hour = new Date().getHours();
  let salutation: string;
  if (hour >= 5 && hour < 11) {
    salutation = "Guten Morgen";
  } else if (hour >= 11 && hour < 18) {
    salutation = "Guten Tag";
  } else {
    salutation = "Guten Abend";
  }
  if (name && name.trim().length > 0) {
    return `${salutation}, ${name.trim()}.`;
  }
  return "Willkommen in Schlutte.";
}
