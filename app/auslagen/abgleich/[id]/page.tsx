import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth/roles";
import { getStatement, listCards, listCardReceipts, listTransactions, signedStatementUrl } from "@/lib/data/auslagen-cards";
import { getCompany } from "@/lib/data/auslagen-settings";
import { signedReceiptUrl } from "@/lib/data/auslagen-receipts";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { Receipt } from "@/lib/auslagen/types";
import { StatementDetail } from "./StatementDetail";

export const maxDuration = 60;

export default async function StatementPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUserContext();
  if (!ctx?.isFinance) notFound();
  const { id } = await params;
  let statement;
  try { statement = await getStatement(id); } catch { notFound(); }
  const [cards, transactions, candidates, statementUrl] = await Promise.all([listCards(), listTransactions(id), listCardReceipts(), signedStatementUrl(statement)]);
  const card = cards.find((item) => item.id === statement.credit_card_id);
  if (!card) notFound();
  const company = card.company_id ? await getCompany(card.company_id) : null;
  const linkedIds = [...new Set(transactions.map((t) => t.receipt_id).filter((value): value is string => !!value))];
  const db = await createClient();
  const { data: linkedRows } = linkedIds.length ? await db.from("receipts").select("id, user_id, status, receipt_date, merchant, description, currency, gross_amount, net_amount, vat_amount, vat_rate, gross_amount_eur, payment_method, payment_channel, payment_reviewed_at, payment_reviewed_by, credit_card_id, file_path, file_mime, file_name, extraction, extraction_error, claim_id, created_at, updated_at").in("id", linkedIds) : { data: [] };
  const linked = (linkedRows ?? []) as Receipt[];
  const urls = Object.fromEntries(await Promise.all(linked.map(async (receipt) => [receipt.id, await signedReceiptUrl(receipt)])));
  return <>
    <header className="aus-head"><Link href="/auslagen/abgleich" className="aus-back">← Abgleich</Link><span className="aus-eyebrow">Auslagen &amp; Belege · Finanzen</span><h1 className="aus-h1">Abrechnung</h1><p className="aus-lede">{card.label} ·•••• {card.last4} · {formatDate(statement.period_start)} – {formatDate(statement.period_end)}</p></header>
    <StatementDetail statement={statement} card={card} company={company} transactions={transactions} candidates={candidates.filter((receipt) => !receipt.payment_reviewed_at && receipt.payment_channel !== "bar" && (!card.payment_channel || !receipt.payment_channel || receipt.payment_channel === card.payment_channel))} linked={linked} receiptUrls={urls} statementUrl={statementUrl} />
  </>;
}
