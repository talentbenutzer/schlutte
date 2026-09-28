import Link from "next/link";
import { listOwnClaimReceiptSummaries, listOwnClaims } from "@/lib/data/auslagen-claims";
import { getCompanies } from "@/lib/data/auslagen-settings";
import { formatEUR } from "@/lib/auslagen/format";
import { formatDate } from "@/lib/utils";
import { errorMessage } from "@/lib/auslagen/errors";
import { getCurrentUserContext } from "@/lib/auth/roles";

export default async function AntraegePage() {
  const ctx = await getCurrentUserContext();
  let claims = [] as Awaited<ReturnType<typeof listOwnClaims>>;
  let receipts = [] as Awaited<ReturnType<typeof listOwnClaimReceiptSummaries>>;
  let names: Record<string, string> = {};
  let error: string | null = null;
  try { [claims, receipts, names] = await Promise.all([listOwnClaims(), listOwnClaimReceiptSummaries(), getCompanies().then((all) => Object.fromEntries(all.map((c) => [c.id, c.name])))]); }
  catch (cause) { error = errorMessage(cause); }
  return <>
    <header className="aus-head"><span className="aus-eyebrow">Auslagen &amp; Belege</span><h1 className="aus-h1">Anträge</h1><p className="aus-lede">Erstellte und eingereichte Anträge auf Auslagenerstattung.</p><div className="aus-actions"><Link href="/auslagen/antrag/neu" className="aus-btn aus-btn-primary">Neuen Antrag erstellen</Link>{ctx?.isFinance && <Link href="/auslagen/eingang" className="aus-btn aus-btn-secondary">Eingereichte Anträge ansehen</Link>}</div></header>
    {error && <div className="aus-note is-danger" role="alert"><div className="aus-note-body"><p>{error}</p></div></div>}
    <section className="aus-section">{claims.length ? <div className="aus-claim-grid">{claims.map((claim) => {
      const included = receipts.filter((receipt) => receipt.claim_id === claim.id);
      return <article className="aus-claim-card" key={claim.id}>
        <div className="aus-card-head"><div><span className="aus-eyebrow">{formatDate(claim.claim_date)}</span><h2 className="aus-card-title">{names[claim.company_id] || claim.company_id}</h2></div><strong className="aus-amount">{formatEUR(claim.total_gross)}</strong></div>
        <div className="aus-row"><span className={`aus-chip ${claim.status === "versendet" ? "is-done" : "is-draft"}`}>{claim.status === "versendet" ? "Eingereicht" : "Erstellt"}</span><span className="aus-chip is-plain">{claim.receipt_count} {claim.receipt_count === 1 ? "Beleg" : "Belege"}</span></div>
        <ul className="aus-claim-receipts">{included.map((receipt) => <li key={receipt.id}><span><strong>{receipt.merchant || "Beleg"}</strong><small>{formatDate(receipt.receipt_date)}</small></span><span className="aus-num">{formatEUR(receipt.currency === "EUR" ? receipt.gross_amount : receipt.gross_amount_eur)}</span></li>)}</ul>
        <Link className="aus-btn aus-btn-secondary" href={`/auslagen/antraege/${claim.id}`}>Antrag öffnen</Link>
      </article>;
    })}</div> : <div className="aus-empty"><p className="aus-empty-title">Noch keine Anträge</p></div>}</section>
  </>;
}
