import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth/roles";
import { getCompanies } from "@/lib/data/auslagen-settings";
import { listSubmittedClaims } from "@/lib/data/auslagen-inbox";
import { formatEUR } from "@/lib/auslagen/format";
import { formatDate } from "@/lib/utils";
import { ReadMarker } from "./ReadMarker";

export default async function EingereichterAntragPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentUserContext();
  if (!ctx?.isFinance) notFound();
  const { id } = await params;
  const [claims, companies] = await Promise.all([listSubmittedClaims(), getCompanies()]);
  const claim = claims.find((item) => item.id === id);
  if (!claim) notFound();
  const company = companies.find((item) => item.id === claim.companyId);
  return <>
    <ReadMarker id={claim.id} unread={claim.unread} />
    <header className="aus-head"><Link className="aus-back" href="/auslagen/eingang">← Antragseingang</Link><span className="aus-eyebrow">Eingereichter Antrag</span><h1 className="aus-h1">{claim.applicantName}</h1><p className="aus-lede">{company?.name || claim.companyId} · eingereicht am {formatDate(claim.sentAt)}</p></header>
    <section className="aus-section aus-stack"><div className="aus-stats"><div className="aus-stat"><span className="aus-stat-label">Gesamtbetrag</span><strong className="aus-stat-value">{formatEUR(claim.totalGross)}</strong></div><div className="aus-stat"><span className="aus-stat-label">Belege</span><strong className="aus-stat-value">{claim.receiptCount}</strong></div></div><p>Der Antrag und alle zugehörigen Belege sind im PDF enthalten.</p><a className="aus-btn aus-btn-primary" href={`/api/auslagen/eingang/${claim.id}/pdf`}>Antrags-PDF herunterladen</a></section>
  </>;
}
