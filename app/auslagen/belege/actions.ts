"use server";

import { revalidatePath } from "next/cache";
import { errorMessage } from "@/lib/auslagen/errors";
import { parseAmount } from "@/lib/auslagen/format";
import { deleteReceipt, registerReceipt, saveReceipt } from "@/lib/data/auslagen-receipts";
import { isPaymentChannel } from "@/lib/auslagen/types";

export type ReceiptActionResult = { ok: boolean; id?: string; error?: string; warning?: string };

export async function registerReceiptAction(input: { path: string; mime: string; fileName: string; cardId?: string | null }): Promise<ReceiptActionResult> {
  try {
    const receipt = await registerReceipt(input);
    revalidatePath("/auslagen");
    return { ok: true, id: receipt.id, warning: receipt.extraction_error ?? undefined };
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
    return { ok: true, id };
  } catch (e) { return { ok: false, error: errorMessage(e) }; }
}

export async function deleteReceiptAction(id: string): Promise<ReceiptActionResult> {
  try {
    await deleteReceipt(id);
    revalidatePath("/auslagen");
    return { ok: true };
  } catch (e) { return { ok: false, error: errorMessage(e) }; }
}
