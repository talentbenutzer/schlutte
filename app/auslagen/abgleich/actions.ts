"use server";

import { revalidatePath } from "next/cache";
import { errorMessage } from "@/lib/auslagen/errors";
import { assignReceipt, autoMatchStatement, clearMatch, createCard, deleteStatement, markCompanyPaymentReviewed, markWithoutReceipt, registerStatement, retryStatement, updateCard, updateTransaction } from "@/lib/data/auslagen-cards";
import { parseAmount } from "@/lib/auslagen/format";

type Result = { ok: boolean; id?: string; count?: number; error?: string; warning?: string };

export async function createCardAction(input: { label: string; last4: string; companyId: string; holderName: string; paymentChannel: string }): Promise<Result> {
  try { const card = await createCard(input); revalidatePath("/auslagen/abgleich"); return { ok: true, id: card.id }; }
  catch (e) { return { ok: false, error: errorMessage(e) }; }
}

export async function updateCardAction(id: string, input: { label: string; last4: string; companyId: string; holderName: string; active: boolean; paymentChannel: string }): Promise<Result> {
  try { await updateCard(id, input); revalidatePath("/auslagen/abgleich"); return { ok: true }; }
  catch (e) { return { ok: false, error: errorMessage(e) }; }
}

export async function registerStatementAction(input: { path: string; fileName: string; cardId: string }): Promise<Result> {
  try { const statement = await registerStatement(input); revalidatePath("/auslagen/abgleich"); return { ok: true, id: statement.id, warning: statement.extraction_error ?? undefined }; }
  catch (e) { return { ok: false, error: errorMessage(e) }; }
}

export async function retryStatementAction(id: string): Promise<Result> {
  try { const statement = await retryStatement(id); revalidatePath(`/auslagen/abgleich/${id}`); return { ok: true, id, warning: statement.extraction_error ?? undefined }; }
  catch (e) { return { ok: false, error: errorMessage(e) }; }
}

export async function autoMatchAction(id: string): Promise<Result> {
  try { const count = await autoMatchStatement(id); revalidatePath(`/auslagen/abgleich/${id}`); return { ok: true, count }; }
  catch (e) { return { ok: false, error: errorMessage(e) }; }
}

export async function assignReceiptAction(transactionId: string, receiptId: string, statementId: string): Promise<Result> {
  try { await assignReceipt(transactionId, receiptId); revalidatePath(`/auslagen/abgleich/${statementId}`); return { ok: true }; }
  catch (e) { return { ok: false, error: errorMessage(e) }; }
}

export async function clearMatchAction(transactionId: string, statementId: string): Promise<Result> {
  try { await clearMatch(transactionId); revalidatePath(`/auslagen/abgleich/${statementId}`); return { ok: true }; }
  catch (e) { return { ok: false, error: errorMessage(e) }; }
}

export async function markWithoutReceiptAction(transactionId: string, statementId: string, note: string): Promise<Result> {
  try { await markWithoutReceipt(transactionId, note); revalidatePath(`/auslagen/abgleich/${statementId}`); return { ok: true }; }
  catch (e) { return { ok: false, error: errorMessage(e) }; }
}

export async function deleteStatementAction(id: string): Promise<Result> {
  try { await deleteStatement(id); revalidatePath("/auslagen/abgleich"); return { ok: true }; }
  catch (e) { return { ok: false, error: errorMessage(e) }; }
}

export async function updateTransactionAction(id: string, statementId: string, data: FormData): Promise<Result> {
  try {
    const amount = parseAmount(String(data.get("amount") || ""));
    if (amount === null) return { ok: false, error: "Bitte einen gültigen Betrag angeben." };
    await updateTransaction(id, { date: String(data.get("date") || ""), merchant: String(data.get("merchant") || ""), amount });
    revalidatePath(`/auslagen/abgleich/${statementId}`);
    return { ok: true };
  } catch (e) { return { ok: false, error: errorMessage(e) }; }
}

export async function markCompanyPaymentReviewedAction(id: string, reviewed: boolean): Promise<Result> {
  try {
    await markCompanyPaymentReviewed(id, reviewed);
    revalidatePath("/auslagen/abgleich");
    return { ok: true };
  } catch (e) { return { ok: false, error: errorMessage(e) }; }
}
