import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/roles";
import { extractReceipt } from "@/lib/auslagen/extract";
import { AuslagenError, toAuslagenError } from "@/lib/auslagen/errors";
import { isISODate, normalizeCurrency, round2 } from "@/lib/auslagen/format";
import { AUSLAGEN_BUCKET, isAllowedReceiptMime, isOwnStoragePath, SIGNED_URL_TTL_SECONDS } from "@/lib/auslagen/paths";
import { isPaymentChannel, type PaymentChannel, type PaymentMethod, type Receipt } from "@/lib/auslagen/types";

const COLUMNS = "id, user_id, status, receipt_date, merchant, description, currency, gross_amount, net_amount, vat_amount, vat_rate, gross_amount_eur, payment_method, payment_channel, payment_reviewed_at, payment_reviewed_by, credit_card_id, file_path, file_mime, file_name, storage_delete_after, storage_purge_claimed_at, file_deleted_at, extraction, extraction_error, claim_id, created_at, updated_at";

export async function listOwnReceipts(): Promise<Receipt[]> {
  const { userId } = await requireUser();
  const db = await createClient();
  const { data, error } = await db.from("receipts").select(COLUMNS).eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw toAuslagenError(error, "Belege konnten nicht geladen werden");
  return (data ?? []) as Receipt[];
}

export async function listOwnReceiptsByIds(ids: string[]): Promise<Receipt[]> {
  if (!ids.length) return [];
  const { userId } = await requireUser();
  const db = await createClient();
  const { data, error } = await db.from("receipts").select(COLUMNS).eq("user_id", userId).in("id", ids.slice(0, 50));
  if (error) throw toAuslagenError(error, "Upload-Liste konnte nicht geladen werden");
  return (data ?? []) as Receipt[];
}

export async function getReceipt(id: string): Promise<Receipt> {
  const { userId, isFinance } = await requireUser();
  const db = await createClient();
  const { data, error } = await db.from("receipts").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw toAuslagenError(error, "Beleg konnte nicht geladen werden");
  if (!data || (data.user_id !== userId && !(isFinance && (data.payment_method === "kreditkarte" || data.claim_id)))) {
    throw new AuslagenError("not_found", "Beleg nicht gefunden.");
  }
  return data as Receipt;
}

export async function signedReceiptUrl(receipt: Receipt): Promise<string | null> {
  if (receipt.file_deleted_at) return null;
  const db = await createClient();
  const { data, error } = await db.storage.from(AUSLAGEN_BUCKET).createSignedUrl(receipt.file_path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) throw toAuslagenError(error, "Belegdatei konnte nicht geladen werden");
  return data.signedUrl;
}

function validBytes(bytes: Buffer, mime: string) {
  if (mime === "application/pdf") return bytes.subarray(0, 5).toString() === "%PDF-";
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8;
  if (mime === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/webp") return bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  return false;
}

export async function registerReceipt(input: { path: string; mime: string; fileName: string; cardId?: string | null }): Promise<Receipt> {
  const ctx = await requireUser();
  if (!isOwnStoragePath(input.path, ctx.userId, "belege") || !isAllowedReceiptMime(input.mime)) {
    throw new AuslagenError("validation", "Ungültige Belegdatei.");
  }
  const db = await createClient();
  const { data: file, error: downloadError } = await db.storage.from(AUSLAGEN_BUCKET).download(input.path);
  if (downloadError || !file) throw new AuslagenError("validation", "Die hochgeladene Datei wurde nicht gefunden.");
  if (file.size > 15 * 1024 * 1024) throw new AuslagenError("validation", "Die Datei darf höchstens 15 MB groß sein.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!validBytes(bytes, input.mime)) throw new AuslagenError("validation", "Dateityp und Dateiinhalt stimmen nicht überein.");

  let cardId: string | null = null;
  if (ctx.isFinance && input.cardId) {
    const { data: card } = await db.from("credit_cards").select("id").eq("id", input.cardId).maybeSingle();
    if (card) cardId = card.id;
  }
  const id = crypto.randomUUID();
  // Zahlart nach Kontext, nicht nach Rolle: ohne konkrete Karte (z. B. normales
  // "Beleg erfassen") ist auch für CEO/Admin "privat" der richtige Standard,
  // sonst tauchen eigene private Belege nie im Antrag auf. Nur wenn der Upload
  // aus dem Kartenabgleich kommt (cardId gesetzt und gültig), ist es ein Firmenbeleg.
  const { data, error } = await db.from("receipts").insert({
    id, user_id: ctx.userId, file_path: input.path, file_mime: input.mime, file_name: input.fileName.slice(0, 200),
    payment_method: cardId ? "kreditkarte" : "privat", credit_card_id: cardId,
  }).select(COLUMNS).single();
  if (error) throw toAuslagenError(error, "Beleg konnte nicht gespeichert werden");

  // KI ist optional: Die manuelle Erfassung funktioniert auch ohne Schlüssel oder bei einem Fehler.
  try {
    const extraction = await extractReceipt(bytes, input.mime);
    let matchedCard = cardId;
    if (ctx.isFinance && !matchedCard && extraction.card_last4) {
      const { data: cards } = await db.from("credit_cards").select("id").eq("last4", extraction.card_last4).limit(2);
      if (cards?.length === 1) matchedCard = cards[0].id;
    }
    const { data: updated, error: updateError } = await db.from("receipts").update({
      receipt_date: extraction.date, merchant: extraction.merchant, description: extraction.description_suggestion,
      currency: extraction.currency ?? "EUR", gross_amount: extraction.gross, net_amount: extraction.net,
      vat_amount: extraction.vat_total, vat_rate: extraction.vat_lines.length === 1 ? extraction.vat_lines[0].rate : null,
      credit_card_id: matchedCard, payment_channel: extraction.payment_channel, extraction, extraction_error: null,
    }).eq("id", id).eq("user_id", ctx.userId).select(COLUMNS).single();
    if (updateError) throw updateError;
    return updated as Receipt;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message.slice(0, 300) : "Automatisches Auslesen fehlgeschlagen.";
    await db.from("receipts").update({ extraction_error: message }).eq("id", id).eq("user_id", ctx.userId);
    return { ...(data as Receipt), extraction_error: message };
  }
}

export type ReceiptInput = {
  receipt_date: string; merchant: string; description: string; currency: string;
  gross_amount: number | null; net_amount: number | null; vat_amount: number | null;
  vat_rate: number | null; gross_amount_eur: number | null;
  payment_method: PaymentMethod; payment_channel: PaymentChannel | null; credit_card_id: string | null;
};

export async function saveReceipt(id: string, input: ReceiptInput): Promise<Receipt> {
  const ctx = await requireUser();
  const existing = await getReceipt(id);
  const own = existing.user_id === ctx.userId;
  if ((!own && !(ctx.isFinance && existing.payment_method === "kreditkarte")) || existing.claim_id) {
    throw new AuslagenError("forbidden", "Dieser Beleg kann nicht geändert werden.");
  }
  if (!own && input.payment_method !== "kreditkarte") {
    throw new AuslagenError("forbidden", "Ein fremder Firmenbeleg kann nicht in einen Privatbeleg geändert werden.");
  }
  const merchant = input.merchant.trim().slice(0, 200);
  const description = input.description.trim().slice(0, 500) || null;
  const currency = normalizeCurrency(input.currency);
  const gross = input.gross_amount;
  if (!isISODate(input.receipt_date) || !merchant || gross === null || gross < 0 || gross > 10_000_000) {
    throw new AuslagenError("validation", "Bitte Datum, Händler und einen gültigen Bruttobetrag angeben.");
  }
  if (currency !== "EUR" && (input.gross_amount_eur === null || input.gross_amount_eur < 0)) {
    throw new AuslagenError("validation", "Bei Fremdwährung bitte den EUR-Betrag angeben.");
  }
  for (const value of [input.net_amount, input.vat_amount, input.vat_rate, input.gross_amount_eur]) {
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > 10_000_000)) {
      throw new AuslagenError("validation", "Beträge und Steuersatz müssen gültige, nicht negative Zahlen sein.");
    }
  }
  if (input.vat_rate !== null && input.vat_rate > 100) throw new AuslagenError("validation", "Der MwSt-Satz darf höchstens 100 % betragen.");
  if (!isPaymentChannel(input.payment_channel)) throw new AuslagenError("validation", "Bitte einen Zahlungsweg wählen.");
  if (input.net_amount !== null && input.vat_amount !== null && Math.abs(input.net_amount + input.vat_amount - gross) > 0.03) {
    throw new AuslagenError("validation", "Netto und MwSt ergeben nicht den Bruttobetrag.");
  }
  if (input.payment_method === "kreditkarte" && !ctx.isFinance) {
    throw new AuslagenError("forbidden", "Nur CEO und Admin können Firmenzahlungen erfassen.");
  }
  const db = await createClient();
  let cardId: string | null = null;
  if (input.payment_method === "kreditkarte" && input.credit_card_id) {
    if (input.payment_channel === "bar") throw new AuslagenError("validation", "Eine Barzahlung kann keiner Karte zugeordnet werden.");
    const { data: card } = await db.from("credit_cards").select("id, payment_channel").eq("id", input.credit_card_id).maybeSingle();
    if (!card || (card.payment_channel && card.payment_channel !== input.payment_channel)) {
      throw new AuslagenError("validation", "Zahlungsweg und Firmenkarte passen nicht zusammen.");
    }
    cardId = card.id;
  }
  const { data, error } = await db.from("receipts").update({
    status: "erfasst", receipt_date: input.receipt_date, merchant, description, currency,
    gross_amount: round2(gross), net_amount: input.net_amount === null ? null : round2(input.net_amount),
    vat_amount: input.vat_amount === null ? null : round2(input.vat_amount), vat_rate: input.vat_rate,
    gross_amount_eur: currency === "EUR" ? null : round2(input.gross_amount_eur!),
    payment_method: input.payment_method, payment_channel: input.payment_channel, credit_card_id: cardId,
    payment_reviewed_at: null, payment_reviewed_by: null,
  }).eq("id", id).eq("user_id", existing.user_id).is("claim_id", null).select(COLUMNS).maybeSingle();
  if (error) throw toAuslagenError(error, "Beleg konnte nicht gespeichert werden");
  if (!data) throw new AuslagenError("conflict", "Der Beleg wurde zwischenzeitlich geändert.");
  return data as Receipt;
}

export async function deleteReceipt(id: string): Promise<void> {
  const ctx = await requireUser();
  const receipt = await getReceipt(id);
  if (receipt.user_id !== ctx.userId || receipt.claim_id) throw new AuslagenError("forbidden", "Dieser Beleg kann nicht gelöscht werden.");
  const db = await createClient();
  const { data, error } = await db.from("receipts").delete().eq("id", id).eq("user_id", ctx.userId).is("claim_id", null).select("id").maybeSingle();
  if (error) throw toAuslagenError(error, "Beleg konnte nicht gelöscht werden");
  if (!data) throw new AuslagenError("conflict", "Der Beleg wurde zwischenzeitlich geändert.");
  if (!receipt.file_deleted_at) await db.storage.from(AUSLAGEN_BUCKET).remove([receipt.file_path]);
}
