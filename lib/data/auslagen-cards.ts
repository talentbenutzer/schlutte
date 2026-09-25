import { createClient } from "@/lib/supabase/server";
import { requireFinance } from "@/lib/auth/roles";
import { extractStatement } from "@/lib/auslagen/extract";
import { AuslagenError, toAuslagenError } from "@/lib/auslagen/errors";
import { autoMatches, matchScore } from "@/lib/auslagen/matching";
import type { PaymentReceipt } from "@/lib/auslagen/reconciliation";
import { AUSLAGEN_BUCKET, isOwnStoragePath, SIGNED_URL_TTL_SECONDS } from "@/lib/auslagen/paths";
import { isISODate, round2 } from "@/lib/auslagen/format";
import { isCompanyId } from "@/lib/data/auslagen-settings";
import { isPaymentChannel, type CardStatement, type CardTransaction, type CreditCard, type PaymentChannel, type Receipt } from "@/lib/auslagen/types";

const CARD_COLS = "id, owner_id, company_id, label, payment_channel, last4, holder_name, is_active, created_at, updated_at";
const STATEMENT_COLS = "id, uploaded_by, credit_card_id, period_start, period_end, statement_date, total_amount, currency, file_path, file_name, extraction, extraction_error, status, created_at, updated_at";
const TX_COLS = "id, statement_id, credit_card_id, transaction_date, booking_date, merchant, description, amount, original_amount, original_currency, receipt_id, match_status, match_score, note, sort, created_at, updated_at";
const RECEIPT_COLS = "id, user_id, status, receipt_date, merchant, description, currency, gross_amount, net_amount, vat_amount, vat_rate, gross_amount_eur, payment_method, payment_channel, payment_reviewed_at, payment_reviewed_by, credit_card_id, file_path, file_mime, file_name, extraction, extraction_error, claim_id, created_at, updated_at";
const RECONCILIATION_COLS = "id, status, receipt_date, merchant, currency, gross_amount, gross_amount_eur, payment_method, payment_channel, reconciliation_channel, credit_card_id, payment_reviewed_at, file_path, file_mime, file_name, claim_id";

function validCardChannel(value: unknown): value is Exclude<PaymentChannel, "bar"> {
  return isPaymentChannel(value) && value !== "bar";
}

export async function listCards(): Promise<CreditCard[]> {
  await requireFinance(); const db = await createClient();
  const { data, error } = await db.from("credit_cards").select(CARD_COLS).order("label");
  if (error) throw toAuslagenError(error, "Kreditkarten konnten nicht geladen werden");
  return (data ?? []) as CreditCard[];
}

export async function createCard(input: { label: string; last4: string; companyId: string; holderName: string; paymentChannel: string }): Promise<CreditCard> {
  const { userId } = await requireFinance();
  const label = input.label.trim(), last4 = input.last4.trim();
  if (!label || label.length > 100 || !/^\d{4}$/.test(last4)) throw new AuslagenError("validation", "Bitte Kartenname und die letzten 4 Ziffern angeben.");
  if (!validCardChannel(input.paymentChannel)) throw new AuslagenError("validation", "Bitte eine Kartenart wählen.");
  if (input.companyId && !isCompanyId(input.companyId)) throw new AuslagenError("validation", "Unbekannte Firma.");
  const db = await createClient();
  const { data, error } = await db.from("credit_cards").insert({ owner_id: userId, label, payment_channel: input.paymentChannel, last4, company_id: input.companyId || null, holder_name: input.holderName.trim().slice(0, 120) || null }).select(CARD_COLS).single();
  if (error) throw toAuslagenError(error, "Kreditkarte konnte nicht gespeichert werden");
  return data as CreditCard;
}

export async function updateCard(id: string, input: { label: string; last4: string; companyId: string; holderName: string; active: boolean; paymentChannel: string }): Promise<CreditCard> {
  await requireFinance();
  const label = input.label.trim(), last4 = input.last4.trim();
  if (!label || label.length > 100 || !/^\d{4}$/.test(last4)) throw new AuslagenError("validation", "Bitte Kartenname und die letzten 4 Ziffern angeben.");
  if (input.paymentChannel && !validCardChannel(input.paymentChannel)) throw new AuslagenError("validation", "Bitte eine gültige Kartenart wählen.");
  if (input.companyId && !isCompanyId(input.companyId)) throw new AuslagenError("validation", "Unbekannte Firma.");
  const db = await createClient();
  const { data, error } = await db.from("credit_cards").update({ label, payment_channel: input.paymentChannel || null, last4, company_id: input.companyId || null, holder_name: input.holderName.trim().slice(0, 120) || null, is_active: input.active }).eq("id", id).select(CARD_COLS).maybeSingle();
  if (error || !data) throw toAuslagenError(error, "Kreditkarte konnte nicht gespeichert werden");
  return data as CreditCard;
}

export async function listStatements(): Promise<CardStatement[]> {
  await requireFinance(); const db = await createClient();
  const { data, error } = await db.from("card_statements").select(STATEMENT_COLS).order("created_at", { ascending: false });
  if (error) throw toAuslagenError(error, "Abrechnungen konnten nicht geladen werden");
  return (data ?? []) as CardStatement[];
}

export async function getStatement(id: string): Promise<CardStatement> {
  await requireFinance(); const db = await createClient();
  const { data, error } = await db.from("card_statements").select(STATEMENT_COLS).eq("id", id).maybeSingle();
  if (error) throw toAuslagenError(error, "Abrechnung konnte nicht geladen werden");
  if (!data) throw new AuslagenError("not_found", "Abrechnung nicht gefunden.");
  return data as CardStatement;
}

export async function listTransactions(statementId: string): Promise<CardTransaction[]> {
  await getStatement(statementId); const db = await createClient();
  const { data, error } = await db.from("card_transactions").select(TX_COLS).eq("statement_id", statementId).order("sort");
  if (error) throw toAuslagenError(error, "Buchungen konnten nicht geladen werden");
  return (data ?? []) as CardTransaction[];
}

export async function listCardReceipts(): Promise<Receipt[]> {
  await requireFinance(); const db = await createClient();
  const { data, error } = await db.from("receipts").select(RECEIPT_COLS).eq("payment_method", "kreditkarte").is("claim_id", null).eq("status", "erfasst");
  if (error) throw toAuslagenError(error, "Kartenbelege konnten nicht geladen werden");
  return (data ?? []) as Receipt[];
}

/** Erfasste Firmenbelege und Belege aus versendeten Mitarbeiteranträgen. */
export async function listReconciliationReceipts(): Promise<PaymentReceipt[]> {
  await requireFinance();
  const db = await createClient();
  const submitted = new Set<string>();
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from("expense_claims").select("id").eq("status", "versendet").order("id").range(offset, offset + 499);
    if (error) throw toAuslagenError(error, "Eingereichte Anträge konnten nicht geladen werden");
    for (const row of data ?? []) submitted.add(row.id);
    if ((data ?? []).length < 500) break;
  }
  const receipts: PaymentReceipt[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from("receipts").select(RECONCILIATION_COLS).eq("status", "erfasst")
      .order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
    if (error) throw toAuslagenError(error, "Belege für den Zahlungsabgleich konnten nicht geladen werden");
    receipts.push(...((data ?? []) as PaymentReceipt[]));
    if ((data ?? []).length < 500) break;
  }
  return receipts.filter((receipt) => receipt.payment_method === "kreditkarte" || (receipt.claim_id && submitted.has(receipt.claim_id)));
}

/** Nur eindeutig erkennbare Firmenkarten werden automatisch zugeordnet. */
export async function autoAssignPaymentCards(): Promise<number> {
  await requireFinance();
  const [cards, receipts] = await Promise.all([listCards(), listCardReceipts()]);
  const db = await createClient();
  let count = 0;
  for (const receipt of receipts) {
    if (receipt.credit_card_id || !receipt.payment_channel || receipt.payment_channel === "bar") continue;
    const matching = cards.filter((card) => card.is_active && card.payment_channel === receipt.payment_channel);
    if (matching.length !== 1) continue;
    const { data, error } = await db.from("receipts").update({ credit_card_id: matching[0].id })
      .eq("id", receipt.id).is("credit_card_id", null).select("id").maybeSingle();
    if (error) throw toAuslagenError(error, "Karte konnte nicht zugeordnet werden");
    if (data) count++;
  }
  return count;
}

export async function classifySubmittedReceipt(id: string, channel: string): Promise<void> {
  await requireFinance();
  if (!/^[0-9a-f-]{36}$/i.test(id) || !isPaymentChannel(channel)) throw new AuslagenError("validation", "Bitte einen gültigen Zahlungsweg wählen.");
  const db = await createClient();
  const { error } = await db.rpc("classify_submitted_receipt", { target_id: id, channel });
  if (error) throw toAuslagenError(error, "Zahlungsweg konnte nicht zugeordnet werden");
}

/** Firmenzahlungen ohne Kartenbuchung können manuell geprüft werden. */
export async function listUnmatchedCompanyPayments(): Promise<Receipt[]> {
  const receipts = await listCardReceipts();
  const db = await createClient();
  const { data, error } = await db.from("card_transactions").select("receipt_id").not("receipt_id", "is", null);
  if (error) throw toAuslagenError(error, "Abgleich konnte nicht geladen werden");
  const linked = new Set((data ?? []).map((row) => row.receipt_id));
  return receipts.filter((receipt) => !linked.has(receipt.id)).sort((a, b) => (b.receipt_date ?? "").localeCompare(a.receipt_date ?? ""));
}

export async function markCompanyPaymentReviewed(id: string, reviewed: boolean): Promise<void> {
  const { userId } = await requireFinance();
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AuslagenError("validation", "Ungültiger Beleg.");
  const db = await createClient();
  const { data: receipt, error: readError } = await db.from("receipts").select("id, payment_method, status, claim_id").eq("id", id).maybeSingle();
  if (readError || !receipt || receipt.payment_method !== "kreditkarte" || receipt.status !== "erfasst" || receipt.claim_id) {
    throw new AuslagenError("validation", "Nur erfasste Firmenzahlungen können geprüft werden.");
  }
  const { data: linked, error: linkedError } = await db.from("card_transactions").select("id").eq("receipt_id", id).maybeSingle();
  if (linkedError) throw toAuslagenError(linkedError, "Zuordnung konnte nicht geprüft werden");
  if (linked) throw new AuslagenError("conflict", "Der Beleg ist bereits mit einer Kartenbuchung abgeglichen.");
  const { data, error } = await db.from("receipts").update({ payment_reviewed_at: reviewed ? new Date().toISOString() : null, payment_reviewed_by: reviewed ? userId : null })
    .eq("id", id).eq("payment_method", "kreditkarte").eq("status", "erfasst").is("claim_id", null).select("id").maybeSingle();
  if (error || !data) throw toAuslagenError(error, "Prüfstatus konnte nicht gespeichert werden");
}

export async function signedStatementUrl(statement: CardStatement): Promise<string> {
  await requireFinance(); const db = await createClient();
  const { data, error } = await db.storage.from(AUSLAGEN_BUCKET).createSignedUrl(statement.file_path, SIGNED_URL_TTL_SECONDS);
  if (error) throw toAuslagenError(error, "Abrechnungsdatei konnte nicht geladen werden");
  return data.signedUrl;
}

export async function registerStatement(input: { path: string; fileName: string; cardId: string }): Promise<CardStatement> {
  const { userId } = await requireFinance();
  if (!isOwnStoragePath(input.path, userId, "abrechnungen") || !input.path.endsWith(".pdf")) throw new AuslagenError("validation", "Ungültiger PDF-Pfad.");
  const db = await createClient();
  const { data: card } = await db.from("credit_cards").select("id").eq("id", input.cardId).eq("is_active", true).maybeSingle();
  if (!card) throw new AuslagenError("validation", "Kreditkarte nicht gefunden.");
  const { data: file, error: downloadError } = await db.storage.from(AUSLAGEN_BUCKET).download(input.path);
  if (downloadError || !file || file.size > 15 * 1024 * 1024) throw new AuslagenError("validation", "Abrechnungs-PDF fehlt oder ist größer als 15 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString() !== "%PDF-") throw new AuslagenError("validation", "Die Datei ist kein PDF.");
  const { data: statement, error } = await db.from("card_statements").insert({ uploaded_by: userId, credit_card_id: card.id, file_path: input.path, file_name: input.fileName.slice(0, 200) }).select(STATEMENT_COLS).single();
  if (error) throw toAuslagenError(error, "Abrechnung konnte nicht gespeichert werden");
  return processStatement(statement as CardStatement, bytes);
}

export async function retryStatement(id: string): Promise<CardStatement> {
  const statement = await getStatement(id);
  const rows = await listTransactions(id);
  if (rows.length) throw new AuslagenError("conflict", "Die Abrechnung enthält bereits Buchungen.");
  const db = await createClient();
  const { data: file, error } = await db.storage.from(AUSLAGEN_BUCKET).download(statement.file_path);
  if (error || !file) throw new AuslagenError("not_found", "PDF-Datei fehlt.");
  return processStatement(statement, Buffer.from(await file.arrayBuffer()));
}

async function processStatement(statement: CardStatement, bytes: Buffer): Promise<CardStatement> {
  const db = await createClient();
  try {
    const extraction = await extractStatement(bytes);
    if (!extraction.transactions.length) throw new Error("Keine Buchungen erkannt. Bitte ein lesbares PDF hochladen.");
    const { data: card } = await db.from("credit_cards").select("last4").eq("id", statement.credit_card_id).maybeSingle();
    const warning = card?.last4 && extraction.card_last4 && card.last4 !== extraction.card_last4 ? `Kartennummer im PDF endet auf ${extraction.card_last4}, ausgewählte Karte auf ${card.last4}. Bitte prüfen.` : null;
    const rows = extraction.transactions.map((tx, index) => ({ statement_id: statement.id, credit_card_id: statement.credit_card_id, transaction_date: tx.transaction_date, booking_date: tx.booking_date, merchant: tx.merchant, description: tx.description, amount: tx.amount, original_amount: tx.original_amount, original_currency: tx.original_currency, sort: index }));
    const { error: insertError } = await db.from("card_transactions").insert(rows);
    if (insertError) throw insertError;
    const { data: saved, error: updateError } = await db.from("card_statements").update({
      period_start: extraction.period_start, period_end: extraction.period_end, statement_date: extraction.statement_date,
      total_amount: extraction.total, currency: extraction.currency || "EUR", extraction, extraction_error: warning, status: "verarbeitet",
    }).eq("id", statement.id).select(STATEMENT_COLS).single();
    if (updateError) throw updateError;
    try { await autoMatchStatement(statement.id); }
    catch (cause) { console.error("Automatischer Belegabgleich fehlgeschlagen:", cause); }
    return saved as CardStatement;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message.slice(0, 300) : "Auslesen fehlgeschlagen.";
    await db.from("card_statements").update({ status: "fehler", extraction_error: message }).eq("id", statement.id);
    return { ...statement, status: "fehler", extraction_error: message };
  }
}

export async function autoMatchStatement(id: string): Promise<number> {
  const statement = await getStatement(id);
  const [transactions, receipts] = await Promise.all([listTransactions(id), listCardReceipts()]);
  const db = await createClient();
  const { data: linked } = await db.from("card_transactions").select("receipt_id").not("receipt_id", "is", null);
  const linkedIds = new Set((linked ?? []).map((row) => row.receipt_id));
  const { data: card } = await db.from("credit_cards").select("payment_channel").eq("id", statement.credit_card_id).maybeSingle();
  const candidates = receipts.filter((r) => !linkedIds.has(r.id) && !r.payment_reviewed_at && r.payment_channel !== "bar" && (!card?.payment_channel || !r.payment_channel || r.payment_channel === card.payment_channel) && (!r.credit_card_id || r.credit_card_id === statement.credit_card_id));
  const matches = autoMatches(transactions.filter((t) => t.match_status === "offen" && !t.receipt_id), candidates);
  let count = 0;
  for (const match of matches) {
    const { data, error } = await db.from("card_transactions").update({ receipt_id: match.receiptId, match_status: "auto", match_score: match.score }).eq("id", match.transactionId).is("receipt_id", null).select("id").maybeSingle();
    if (error || !data) continue;
    const receipt = candidates.find((r) => r.id === match.receiptId);
    if (receipt && !receipt.credit_card_id) await db.from("receipts").update({ credit_card_id: statement.credit_card_id }).eq("id", receipt.id).is("credit_card_id", null);
    count++;
  }
  return count;
}

export async function assignReceipt(transactionId: string, receiptId: string): Promise<void> {
  await requireFinance(); const db = await createClient();
  const { data: tx, error: txError } = await db.from("card_transactions").select(TX_COLS).eq("id", transactionId).maybeSingle();
  if (txError || !tx) throw new AuslagenError("not_found", "Buchung nicht gefunden.");
  const { data: receipt, error: receiptError } = await db.from("receipts").select(RECEIPT_COLS).eq("id", receiptId).maybeSingle();
  const { data: card } = await db.from("credit_cards").select("payment_channel").eq("id", tx.credit_card_id).maybeSingle();
  if (receiptError || !receipt || receipt.payment_method !== "kreditkarte" || receipt.payment_channel === "bar" || receipt.payment_reviewed_at || (card?.payment_channel && receipt.payment_channel && card.payment_channel !== receipt.payment_channel) || receipt.claim_id || receipt.status !== "erfasst" || (receipt.credit_card_id && receipt.credit_card_id !== tx.credit_card_id)) throw new AuslagenError("validation", "Zahlungsweg oder Beleg passt nicht zu dieser Buchung. Manuell geprüfte Zahlungen zuerst wieder öffnen.");
  const { data: occupied } = await db.from("card_transactions").select("id").eq("receipt_id", receiptId).neq("id", transactionId).maybeSingle();
  if (occupied) throw new AuslagenError("conflict", "Der Beleg ist bereits einer Buchung zugeordnet.");
  const score = matchScore(tx as CardTransaction, receipt as Receipt);
  const { data, error } = await db.from("card_transactions").update({ receipt_id: receiptId, match_status: "manuell", match_score: score || null, note: null }).eq("id", transactionId).select("id").maybeSingle();
  if (error || !data) throw toAuslagenError(error, "Beleg konnte nicht zugeordnet werden");
  if (!receipt.credit_card_id) await db.from("receipts").update({ credit_card_id: tx.credit_card_id }).eq("id", receiptId).is("credit_card_id", null);
}

export async function clearMatch(transactionId: string): Promise<void> {
  await requireFinance(); const db = await createClient();
  const { data, error } = await db.from("card_transactions").update({ receipt_id: null, match_status: "offen", match_score: null, note: null }).eq("id", transactionId).select("id").maybeSingle();
  if (error || !data) throw toAuslagenError(error, "Zuordnung konnte nicht gelöst werden");
}

export async function markWithoutReceipt(transactionId: string, note: string): Promise<void> {
  await requireFinance();
  if (!note.trim()) throw new AuslagenError("validation", "Bitte eine Begründung angeben.");
  const db = await createClient();
  const { data, error } = await db.from("card_transactions").update({ receipt_id: null, match_status: "ohne_beleg", match_score: null, note: note.trim().slice(0, 500) }).eq("id", transactionId).select("id").maybeSingle();
  if (error || !data) throw toAuslagenError(error, "Status konnte nicht gespeichert werden");
}

export async function updateTransaction(id: string, input: { date: string; merchant: string; amount: number }): Promise<void> {
  await requireFinance();
  if (!isISODate(input.date) || !input.merchant.trim() || !Number.isFinite(input.amount) || Math.abs(input.amount) > 10_000_000) {
    throw new AuslagenError("validation", "Bitte Datum, Händler und Betrag prüfen.");
  }
  const db = await createClient();
  const { data, error } = await db.from("card_transactions").update({ transaction_date: input.date, merchant: input.merchant.trim().slice(0, 200), amount: round2(input.amount), match_status: "offen", match_score: null, note: null }).eq("id", id).is("receipt_id", null).select("id").maybeSingle();
  if (error || !data) throw toAuslagenError(error, "Buchung konnte nicht korrigiert werden");
}

export async function deleteStatement(id: string): Promise<void> {
  const statement = await getStatement(id); const db = await createClient();
  const { data, error } = await db.from("card_statements").delete().eq("id", id).select("id").maybeSingle();
  if (error || !data) throw toAuslagenError(error, "Abrechnung konnte nicht gelöscht werden");
  await db.storage.from(AUSLAGEN_BUCKET).remove([statement.file_path]);
}
