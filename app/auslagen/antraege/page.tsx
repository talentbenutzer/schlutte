import Link from "next/link";
import { listOwnClaims } from "@/lib/data/auslagen-claims";
import { getCompanies } from "@/lib/data/auslagen-settings";
import { formatEUR } from "@/lib/auslagen/format";
import { formatDate } from "@/lib/utils";
import { errorMessage } from "@/lib/auslagen/errors";

export default async function AntraegePage() {
  let claims = [] as Awaited<ReturnType<typeof listOwnClaims>>;
  let names: Record<string, string> = {};
  let error: string | null = null;
  try { [claims, names] = await Promise.all([listOwnClaims(), getCompanies().then((all) => Object.fromEntries(all.map((c) => [c.id, c.name])))]); }
  catch (cause) { error = errorMessage(cause); }
  return <>
    <header className="aus-head"><span className="aus-eyebrow">Auslagen &amp; Belege</span><h1 className="aus-h1">Anträge</h1><p className="aus-lede">Erstellte und versendete Anträge auf Auslagenerstattung.</p><div className="aus-actions"><Link href="/auslagen/antrag/neu" className="aus-btn aus-btn-primary">Neuen Antrag erstellen</Link></div></header>
    {error && <div className="aus-note is-danger" role="alert"><div className="aus-note-body"><p>{error}</p></div></div>}
    <section className="aus-section">{claims.length ? <div className="aus-list">{claims.map((claim) => <Link className="aus-item" href={`/auslagen/antraege/${claim.id}`} key={claim.id}><span className="aus-item-main"><strong className="aus-item-title">{names[claim.company_id] || claim.company_id}</strong><span className="aus-item-meta">{formatDate(claim.claim_date)} · {claim.receipt_count} Belege</span></span><span className="aus-item-side"><strong className="aus-amount">{formatEUR(claim.total_gross)}</strong><span className={`aus-chip ${claim.status === "versendet" ? "is-done" : "is-draft"}`}>{claim.status === "versendet" ? "Versendet" : "Erstellt"}</span></span></Link>)}</div> : <div className="aus-empty"><p className="aus-empty-title">Noch keine Anträge</p></div>}</section>
  </>;
}
