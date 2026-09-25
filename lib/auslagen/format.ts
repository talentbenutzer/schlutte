/**
 * Formatierung & Parsing für Auslagen (Beträge, IBAN, Datum).
 * Rein funktional, ohne Abhängigkeiten — nutzbar in Server, Client und PDF-Erzeugung.
 */

// ─── Beträge ─────────────────────────────────────────────────────────────────

/**
 * Rundet kaufmännisch auf 2 Nachkommastellen (halbe Cents von der Null weg).
 * Umgeht Binärfehler wie 1.005 * 100 = 100.49999… über die Exponentenschreibweise.
 */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return n;
  const sign = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  const shifted = Number(`${abs}e2`);
  const cents = Number.isFinite(shifted) ? Math.round(shifted) : Math.round(abs * 100);
  const result = (sign * cents) / 100;
  return result === 0 ? 0 : result; // kein -0
}

const currencyFormatters = new Map<string, Intl.NumberFormat>();
const amountFormatter = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ISO-4217-Code normalisieren ("eur " → "EUR"); ungültig → fallback. */
export function normalizeCurrency(code: string | null | undefined, fallback = "EUR"): string {
  const c = (code ?? "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(c) ? c : fallback;
}

/**
 * Betrag im deutschen Format: formatEUR(1234.56) → "1.234,56 €".
 * Zwischen Zahl und Währung steht ein geschütztes Leerzeichen (U+00A0).
 * Andere Währungen: formatEUR(12.5, "USD") → "12,50 $". null/NaN → "—".
 */
export function formatEUR(n: number | null | undefined, currency = "EUR"): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const value = round2(n);
  const code = (currency || "EUR").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    return `${amountFormatter.format(value)} ${currency.trim()}`.trim();
  }
  let formatter = currencyFormatters.get(code);
  if (!formatter) {
    formatter = new Intl.NumberFormat("de-DE", { style: "currency", currency: code });
    currencyFormatters.set(code, formatter);
  }
  return formatter.format(value);
}

/** Betrag ohne Währung: 1234.5 → "1.234,50". null → "". */
export function formatAmount(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "";
  return amountFormatter.format(round2(n));
}

/** Betrag als Vorbelegung für Eingabefelder: 1234.5 → "1234,50" (ohne Tausenderpunkte). */
export function formatAmountInput(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "";
  return round2(n).toFixed(2).replace(".", ",");
}

/** Prüft die Tausendergruppierung, z. B. "1.234.567" mit sep ".". */
function isValidGrouping(intPart: string, sep: string): boolean {
  if (!intPart.includes(sep)) return /^\d*$/.test(intPart);
  const groups = intPart.split(sep);
  return /^\d{1,3}$/.test(groups[0]) && groups.slice(1).every((g) => /^\d{3}$/.test(g));
}

/**
 * Robuster Betrags-Parser für Eingaben: "1.234,56", "1234,56", "12.5", "1,234.56",
 * "€ 12,50", "12,50 EUR", "-12,50", "12,50-" und "(12,50)" (negativ), "1'234.50".
 * Ein einzelnes Komma ist immer Dezimaltrenner; ein einzelner Punkt vor genau drei
 * Ziffern ("1.234") gilt als Tausenderpunkt. Ungültig → null. Keine Rundung (→ round2).
 */
export function parseAmount(input: string | number | null | undefined): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (typeof input !== "string") return null;

  let s = input.trim();
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }

  s = s
    .replace(/[\s  ]/g, "")
    .replace(/[€$£¥]/g, "")
    .replace(/^[A-Za-z]{1,4}\.?/, "") // "EUR 12,50"
    .replace(/[A-Za-z]{1,4}\.?$/, "") // "12,50 EUR"
    .replace(/[−–]/g, "-")
    .replace(/['’]/g, "");

  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }
  if (s.endsWith("-")) {
    negative = !negative;
    s = s.slice(0, -1);
  } else if (s.endsWith("+")) {
    s = s.slice(0, -1);
  }

  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let intPart: string;
  let fracPart = "";

  if (lastComma >= 0 && lastDot >= 0) {
    // Beide vorhanden: das hintere Zeichen trennt die Dezimalstellen.
    const decimalSep = lastComma > lastDot ? "," : ".";
    const thousandsSep = decimalSep === "," ? "." : ",";
    const parts = s.split(decimalSep);
    if (parts.length !== 2 || !isValidGrouping(parts[0], thousandsSep)) return null;
    intPart = parts[0].split(thousandsSep).join("");
    fracPart = parts[1];
  } else if (lastComma >= 0 || lastDot >= 0) {
    const sep = lastComma >= 0 ? "," : ".";
    const parts = s.split(sep);
    if (parts.length > 2) {
      if (!isValidGrouping(s, sep)) return null;
      intPart = parts.join("");
    } else if (sep === "." && parts[1].length === 3 && /^[1-9]\d{0,2}$/.test(parts[0])) {
      intPart = parts[0] + parts[1];
    } else {
      intPart = parts[0];
      fracPart = parts[1];
    }
  } else {
    intPart = s;
  }

  const normalized = `${intPart || "0"}${fracPart ? `.${fracPart}` : ""}`;
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return negative && value !== 0 ? -value : value;
}

// ─── IBAN ────────────────────────────────────────────────────────────────────

/** IBAN-Längen gängiger (SEPA-)Länder; unbekannte Länder nur generisch geprüft. */
const IBAN_LENGTHS: Record<string, number> = {
  AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20, ES: 24,
  FI: 18, FR: 27, GB: 22, GR: 27, HR: 21, HU: 28, IE: 22, IS: 26, IT: 27, LI: 21,
  LT: 20, LU: 20, LV: 21, MC: 27, MT: 31, NL: 18, NO: 15, PL: 28, PT: 25, RO: 24,
  SE: 24, SI: 19, SK: 24, SM: 27,
};

/** "de89 3704 0044-0532 0130 00" → "DE89370400440532013000" (auch "IBAN:"-Präfix wird entfernt). */
export function normalizeIban(input: string | null | undefined): string {
  return (input ?? "")
    .toUpperCase()
    .replace(/[\s  .\-]/g, "")
    .replace(/^IBAN:?/, "");
}

/** IBAN-Prüfung: Format, Länderlänge und Prüfsumme (ISO 13616, Mod 97). */
export function isValidIban(input: string | null | undefined): boolean {
  const iban = normalizeIban(input);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const expected = IBAN_LENGTHS[iban.slice(0, 2)];
  if (expected && iban.length !== expected) return false;

  // Ländercode + Prüfziffern ans Ende, Buchstaben → Zahlen (A = 10 … Z = 35), dann Mod 97 stückweise.
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const digits = ch >= "A" && ch <= "Z" ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of digits) {
      remainder = (remainder * 10 + Number(d)) % 97;
    }
  }
  return remainder === 1;
}

/** Anzeige in 4er-Gruppen: "DE89 3704 0044 0532 0130 00". */
export function formatIban(input: string | null | undefined): string {
  return normalizeIban(input).replace(/(.{4})(?=.)/g, "$1 ");
}

// ─── Datum ───────────────────────────────────────────────────────────────────

/**
 * Heutiges Datum als "YYYY-MM-DD" in deutscher Zeit (Server laufen in UTC —
 * so stimmt das Datum auch kurz nach Mitternacht).
 */
export function todayISO(timeZone = "Europe/Berlin"): string {
  const now = new Date();
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }
}

/** true für ein gültiges Kalenderdatum im Format "YYYY-MM-DD". */
export function isISODate(value: string | null | undefined): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}
