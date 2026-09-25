import type { CardTransaction, Receipt } from "./types";

const STOP = new Set(["gmbh", "ag", "kg", "co", "www", "com", "de", "the", "und"]);

function tokens(value: string | null) {
  return (value ?? "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter((part) => part.length >= 3 && !STOP.has(part));
}

function days(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const x = Date.parse(`${a}T00:00:00Z`), y = Date.parse(`${b}T00:00:00Z`);
  return Number.isFinite(x) && Number.isFinite(y) ? Math.round(Math.abs(x - y) / 86_400_000) : null;
}

export function matchScore(transaction: CardTransaction, receipt: Receipt): number {
  if (transaction.amount <= 0 || receipt.payment_method !== "kreditkarte" || receipt.claim_id) return 0;
  if (receipt.credit_card_id && receipt.credit_card_id !== transaction.credit_card_id) return 0;
  const amount = receipt.currency === "EUR" ? receipt.gross_amount : receipt.gross_amount_eur;
  const originalExact = transaction.original_amount !== null && receipt.gross_amount !== null && transaction.original_currency === receipt.currency && Math.abs(transaction.original_amount - receipt.gross_amount) < 0.005;
  if (amount === null && !originalExact) return 0;
  const delta = amount === null ? Infinity : Math.abs(transaction.amount - amount);
  let score = delta < 0.005 || originalExact ? 60 : delta <= Math.max(transaction.amount * 0.01, 0.5) ? 25 : 0;
  if (!score) return 0;
  const distance = days(receipt.receipt_date, transaction.transaction_date || transaction.booking_date);
  if (distance === null || distance > 30) return 0;
  score += distance === 0 ? 25 : distance <= 2 ? 20 : distance <= 5 ? 12 : distance <= 10 ? 5 : 0;
  const a = tokens(transaction.merchant || transaction.description);
  const b = tokens(receipt.merchant);
  if (a.some((word) => b.some((other) => word === other || word.includes(other) || other.includes(word)))) score += 15;
  if (receipt.credit_card_id === transaction.credit_card_id) score += 5;
  return score;
}

export function autoMatches(transactions: CardTransaction[], receipts: Receipt[]) {
  const candidates = transactions.flatMap((transaction) => receipts.map((receipt) => ({ transaction, receipt, score: matchScore(transaction, receipt) })).filter((candidate) => candidate.score >= 70));
  candidates.sort((a, b) => b.score - a.score || (a.transaction.sort ?? 0) - (b.transaction.sort ?? 0));
  const usedTransactions = new Set<string>(), usedReceipts = new Set<string>();
  const matches: { transactionId: string; receiptId: string; score: number }[] = [];
  for (const candidate of candidates) {
    if (usedTransactions.has(candidate.transaction.id) || usedReceipts.has(candidate.receipt.id)) continue;
    usedTransactions.add(candidate.transaction.id); usedReceipts.add(candidate.receipt.id);
    matches.push({ transactionId: candidate.transaction.id, receiptId: candidate.receipt.id, score: candidate.score });
  }
  return matches;
}
