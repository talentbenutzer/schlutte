/**
 * Rücksprungziel nach dem Login (?next=…) — Schutz gegen Open Redirects.
 * Erlaubt nur relative Pfade derselben Origin ("/…", nicht "//…" oder "/\…"),
 * nicht /login selbst. Wird von proxy.ts und der Login-Seite genutzt.
 */

const FALLBACK = "/start";

export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 2000) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
  // Steuerzeichen (Tab/Zeilenumbruch) würden vom URL-Parser entfernt → "/\t/evil.com".
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return null;
  }

  try {
    const base = "http://schlutte.invalid";
    const url = new URL(raw, base);
    if (url.origin !== base) return null;
    if (url.pathname === "/login" || url.pathname.startsWith("/login/")) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/** Ziel nach erfolgreichem Login: geprüftes next oder /start. */
export function loginRedirectTarget(raw: string | null | undefined): string {
  return safeNextPath(raw) ?? FALLBACK;
}
