import Link from "next/link";
import { notFound } from "next/navigation";
import { getClaim, getClaimReceipts, signedClaimUrl } from "@/lib/data/auslagen-claims";
import { getCompany } from "@/lib/data/auslagen-settings";
import { signedReceiptUrl } from "@/lib/data/auslagen-receipts";
import { formatEUR } from "@/lib/auslagen/format";
import { formatDate } from "@/lib/utils";
import { ClaimControls } from "./ClaimControls";

export default async function AntragPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let claim;
  try { claim = await getClaim(id); } catch { notFound(); }
  const [company, receipts, pdfUrl] = await Promise.all([getCompany(claim.company_id), getClaimReceipts(id), signedClaimUrl(claim)]);
  if (!company) notFound();
  const urlEntries = await Promise.all(receipts.map(async (r) => [r.id, await signedReceiptUrl(r)] as const));
  if (urlEntries.some(([, url]) => !url)) notFound();
  const urls = Object.fromEntries(urlEntries) as Record<string, string>;
  return <>
    <header className="aus-head"><Link className="aus-back" href="/auslagen/antraege">← Anträge</Link><span className="aus-eyebrow">Auslagen &amp; Belege</span><h1 className="aus-h1">Antrag</h1><p className="aus-lede">{company.name} · {formatDate(claim.claim_date)} · {claim.receipt_count} Belege</p></header>
    <section className="aus-section"><div className="aus-stats"><div className="aus-stat"><span className="aus-stat-label">Gesamtbetrag</span><strong className="aus-stat-value">{formatEUR(claim.total_gross)}</strong></div><div className="aus-stat"><span className="aus-stat-label">Status</span><strong className="aus-stat-value">{claim.status === "versendet" ? "Eingereicht" : "Erstellt"}</strong></div></div></section>
    <ClaimControls claim={claim} company={company} receipts={receipts} urls={urls} existingPdfUrl={pdfUrl} />
    <section className="aus-section"><h2 className="aus-h2">Belege</h2><div className="aus-list">{receipts.map((r) => <Link className="aus-item" href={`/auslagen/belege/${r.id}`} key={r.id}><span className="aus-item-main"><strong className="aus-item-title">{r.merchant ?? "Beleg"}</strong><span className="aus-item-meta">{formatDate(r.receipt_date)}</span></span><span className="aus-amount">{formatEUR(r.currency === "EUR" ? r.gross_amount : r.gross_amount_eur)}</span></Link>)}</div></section>
  </>;
}
