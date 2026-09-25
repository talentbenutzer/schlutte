"use server";

import { revalidatePath } from "next/cache";
import { errorMessage } from "@/lib/auslagen/errors";
import { parseAmount } from "@/lib/auslagen/format";
import { deleteReceipt, registerReceipt, saveReceipt } from "@/lib/data/auslagen-receipts";
import { isPaymentChannel } from "@/lib/auslagen/types";
import type { Receipt } from "@/lib/auslagen/types";

export type UploadReceiptSummary = Pick<Receipt, "id" | "status" | "file_name" | "merchant" | "receipt_date" | "gross_amount" | "currency" | "payment_channel" | "payment_method" | "extraction_error">;
export type ReceiptActionResult = { ok: boolean; id?: string; receipt?: UploadReceiptSummary; error?: string; warning?: string };

export async function registerReceiptAction(input: { path: string; mime: string; fileName: string; cardId?: string | null }): Promise<ReceiptActionResult> {
  try {
    const receipt = await registerReceipt(input);
    revalidatePath("/auslagen");
    revalidatePath("/auslagen/abgleich");
    const { id, status, file_name, merchant, receipt_date, gross_amount, currency, payment_channel, payment_method, extraction_error } = receipt;
    return { ok: true, id, receipt: { id, status, file_name, merchant, receipt_date, gross_amount, currency, payment_channel, payment_method, extraction_error }, warning: extraction_error ?? undefined };
  } catch (e) { return { ok: false, error: errorMessage(e) }; }
}

export async function saveReceiptAction(id: string, formData: FormData): Promise<ReceiptActionResult> {
  const get = (key: string) => String(formData.get(key) ?? "");
  try {
    const paymentChannel = get("payment_channel");
    await saveReceipt(id, {
      receipt_date: get("receipt_date"), merchant: get("merchant"), description: get("description"), currency: get("currency"),
      gross_amount: parseAmount(get("gross_amount")), net_amount: parseAmount(get("net_amount")),
      vat_amount: parseAmount(get("vat_amount")), vat_rate: parseAmount(get("vat_rate")),
      gross_amount_eur: parseAmount(get("gross_amount_eur")), payment_method: get("payment_method") === "kreditkarte" ? "kreditkarte" : "privat",
      payment_channel: isPaymentChannel(paymentChannel) ? paymentChannel : null,
      credit_card_id: get("credit_card_id") || null,
    });
    revalidatePath("/auslagen");
    revalidatePath(`/auslagen/belege/${id}`);
    revalidatePath("/auslagen/erfassen");
    revalidatePath("/auslagen/abgleich");
    return { ok: true, id };
  } catch (e) { return { ok: false, error: errorMessage(e) }; }
}

export async function deleteReceiptAction(id: string): Promise<ReceiptActionResult> {
  try {
    await deleteReceipt(id);
    revalidatePath("/auslagen");
    revalidatePath("/auslagen/abgleich");
    return { ok: true };
  } catch (e) { return { ok: false, error: errorMessage(e) }; }
}
