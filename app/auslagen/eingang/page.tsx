import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth/roles";
import { getCompanies } from "@/lib/data/auslagen-settings";
import { listSubmittedClaims } from "@/lib/data/auslagen-inbox";
import { errorMessage } from "@/lib/auslagen/errors";
import type { InboxClaim } from "@/lib/data/auslagen-inbox";
import { InboxList } from "./InboxList";

export default async function EingereichteAntraegePage() {
  const ctx = await getCurrentUserContext();
  if (!ctx?.isFinance) redirect("/auslagen");
  let claims: InboxClaim[] = [];
  let companyNames: Record<string, string> = {};
  let error: string | null = null;
  try {
    const [items, companies] = await Promise.all([listSubmittedClaims(), getCompanies()]);
    claims = items;
    companyNames = Object.fromEntries(companies.map((company) => [company.id, company.name]));
  } catch (cause) { error = errorMessage(cause); }
  if (error) return <div className="aus-note is-danger" role="alert"><div className="aus-note-body"><p>{error}</p></div></div>;
  return <>
    <header className="aus-head"><Link className="aus-back" href="/auslagen/antraege">← Anträge</Link><span className="aus-eyebrow">Auslagen &amp; Belege · Finanzen</span><h1 className="aus-h1">Antragseingang</h1><p className="aus-lede">Eingereichte Anträge von Mitarbeitern. Neue PDFs kannst du einzeln oder gesammelt herunterladen.</p></header>
    <InboxList key={claims.map((claim) => `${claim.id}:${claim.unread}`).join("|")} initialClaims={claims} companyNames={companyNames} />
  </>;
}
