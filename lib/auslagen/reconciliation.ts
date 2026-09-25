import { PAYMENT_CHANNEL_LABEL, PAYMENT_CHANNELS, type CreditCard, type PaymentChannel, type Receipt } from "./types";

export type PaymentReceipt = Pick<Receipt, "id" | "status" | "receipt_date" | "merchant" | "currency" | "gross_amount" | "gross_amount_eur" | "payment_method" | "payment_channel" | "credit_card_id" | "payment_reviewed_at" | "file_path" | "file_mime" | "file_name" | "storage_delete_after" | "file_deleted_at" | "claim_id"> & { reconciliation_channel: PaymentChannel | null };

export type PaymentGroup = {
  key: string;
  title: string;
  channel: PaymentChannel | null;
  payer: "Firma" | "Privat";
  receipts: PaymentReceipt[];
  totalEUR: number;
};

export function groupReceiptsByPayment(receipts: PaymentReceipt[], cards: CreditCard[]): PaymentGroup[] {
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const groups = new Map<string, PaymentGroup>();
  for (const receipt of receipts) {
    const payer = receipt.payment_method === "kreditkarte" ? "Firma" : "Privat";
    const card = receipt.credit_card_id ? cardById.get(receipt.credit_card_id) : null;
    const effectiveChannel = receipt.reconciliation_channel ?? receipt.payment_channel ?? card?.payment_channel ?? null;
    const channel = effectiveChannel ? PAYMENT_CHANNEL_LABEL[effectiveChannel] : "Zahlungsweg offen";
    const key = `${payer}:${card ? `card:${card.id}` : `channel:${effectiveChannel || "offen"}`}`;
    const title = card ? `${channel} · ${card.label}${card.last4 ? ` ·•••• ${card.last4}` : ""}` : channel;
    let group = groups.get(key);
    if (!group) {
      group = { key, title, channel: effectiveChannel, payer, receipts: [], totalEUR: 0 };
      groups.set(key, group);
    }
    group.receipts.push(receipt);
    group.totalEUR += Number(receipt.currency === "EUR" ? receipt.gross_amount : receipt.gross_amount_eur) || 0;
  }
  for (const group of groups.values()) {
    group.receipts.sort((a, b) =>
      (a.receipt_date ?? "9999-12-31").localeCompare(b.receipt_date ?? "9999-12-31")
      || (a.merchant ?? a.file_name ?? "").localeCompare(b.merchant ?? b.file_name ?? "", "de")
      || a.id.localeCompare(b.id));
  }
  const order = new Map(PAYMENT_CHANNELS.map((channel, index) => [channel, index]));
  return [...groups.values()].sort((a, b) => {
    const aChannel = a.channel;
    const bChannel = b.channel;
    return (order.get(aChannel!) ?? 99) - (order.get(bChannel!) ?? 99) || a.payer.localeCompare(b.payer) || a.title.localeCompare(b.title);
  });
}
