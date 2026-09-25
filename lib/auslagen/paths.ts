/**
 * Storage-Konventionen für den privaten Bucket "auslagen".
 * Pfade: {uid}/belege/{uuid}.jpg|pdf · {uid}/antraege/{claimId}.pdf · {uid}/abrechnungen/{uuid}.pdf
 * Die Storage-Policies erlauben Schreiben nur im eigenen Ordner ({uid}/…).
 */

export const AUSLAGEN_BUCKET = "auslagen";

/** Gültigkeit von Signed URLs für Vorschauen/Downloads. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type StorageFolder = "belege" | "antraege" | "abrechnungen";

const FOLDERS: readonly StorageFolder[] = ["belege", "antraege", "abrechnungen"];

/** Erlaubte Dateitypen für Belege (Bilder werden clientseitig zu JPEG normalisiert). */
export const RECEIPT_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

export function isAllowedReceiptMime(mime: string | null | undefined): boolean {
  return !!mime && (RECEIPT_MIME_TYPES as readonly string[]).includes(mime);
}

export function receiptFilePath(userId: string, fileId: string, ext: "jpg" | "pdf"): string {
  return `${userId}/belege/${fileId}.${ext}`;
}

export function claimPdfPath(userId: string, claimId: string): string {
  return `${userId}/antraege/${claimId}.pdf`;
}

export function statementFilePath(userId: string, fileId: string): string {
  return `${userId}/abrechnungen/${fileId}.pdf`;
}

/**
 * Prüft einen vom Client gemeldeten Storage-Pfad, bevor eine Server Action ihn
 * speichert: genau {uid}/{ordner}/{datei}, eigener Ordner, kein "..", erlaubte Endung.
 */
export function isOwnStoragePath(
  path: unknown,
  userId: string,
  folder?: StorageFolder
): path is string {
  if (typeof path !== "string" || path.length > 300 || !userId) return false;
  const parts = path.split("/");
  if (parts.length !== 3) return false;
  const [uid, dir, file] = parts;
  if (uid !== userId) return false;
  if (folder ? dir !== folder : !(FOLDERS as readonly string[]).includes(dir)) return false;
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}\.(jpe?g|png|webp|pdf)$/i.test(file);
}
