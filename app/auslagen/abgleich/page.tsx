import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth/roles";
import { listCards, listStatements } from "@/lib/data/auslagen-cards";
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
  let error: string | null = null;
  try {
    [cards, statements, companies] = await Promise.all([listCards(), listStatements(), getCompanies()]);
  } catch (e) { error = errorMessage(e); }
  if (error) return <div className="aus-note is-danger" role="alert"><div className="aus-note-body"><p>{error}</p></div></div>;
  return <><header className="aus-head"><span className="aus-eyebrow">Auslagen &amp; Belege · Finanzen</span><h1 className="aus-h1">Kreditkartenabgleich</h1><p className="aus-lede">Mehrere Karten verwalten, PDF-Abrechnungen auslesen und Belege zuordnen.</p></header><AbgleichHome cards={cards} statements={statements} companies={companies} /></>;
}
