import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth/roles";
import { listCards, listStatements, listUnmatchedCompanyPayments } from "@/lib/data/auslagen-cards";
import { getCompanies } from "@/lib/data/auslagen-settings";
import { errorMessage } from "@/lib/auslagen/errors";
import { AbgleichHome } from "./AbgleichHome";

export const maxDuration = 60;

export default async function AbgleichPage() {
  const ctx = await getCurrentUserContext();
  if (!ctx?.isFinance) redirect("/auslagen");
  let cards = [] as Awaited<ReturnType<typeof listCards>>;
  let statements = [] as Awaited<ReturnType<typeof listStatements>>;
  let companies = [] as Awaited<ReturnType<typeof getCompanies>>;
  let payments = [] as Awaited<ReturnType<typeof listUnmatchedCompanyPayments>>;
  let error: string | null = null;
  try {
    [cards, statements, companies, payments] = await Promise.all([listCards(), listStatements(), getCompanies(), listUnmatchedCompanyPayments()]);
  } catch (e) { error = errorMessage(e); }
  if (error) return <div className="aus-note is-danger" role="alert"><div className="aus-note-body"><p>{error}</p></div></div>;
  return <><header className="aus-head"><span className="aus-eyebrow">Auslagen &amp; Belege · Finanzen</span><h1 className="aus-h1">Zahlungsabgleich</h1><p className="aus-lede">AMEX, Bar, EC, Kreditkarten und Tank- &amp; Raststätten-Zahlungen prüfen. Kartenabrechnungen können automatisch oder manuell mit Belegen verbunden werden.</p></header><AbgleichHome cards={cards} statements={statements} companies={companies} payments={payments} /></>;
}
