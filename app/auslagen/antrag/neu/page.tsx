import Link from "next/link";
import { OriginalHint } from "@/components/auslagen/OriginalHint";
import { getCompanies } from "@/lib/data/auslagen-settings";
import { getOwnProfile } from "@/lib/data/auslagen-profile";
import { listOwnReceipts } from "@/lib/data/auslagen-receipts";
import { errorMessage } from "@/lib/auslagen/errors";
import { todayISO } from "@/lib/auslagen/format";
import { applicantFromProfile } from "@/lib/auslagen/profile";
import { ClaimForm } from "./ClaimForm";

export default async function NeuerAntragPage() {
  let companies = [] as Awaited<ReturnType<typeof getCompanies>>;
  let profile = null as Awaited<ReturnType<typeof getOwnProfile>>;
  let all = [] as Awaited<ReturnType<typeof listOwnReceipts>>;
  let error: string | null = null;
  try {
    [companies, profile, all] = await Promise.all([getCompanies(), getOwnProfile(), listOwnReceipts()]);
  } catch (cause) { error = errorMessage(cause); }
  if (error) return <div className="aus-note is-danger" role="alert"><div className="aus-note-body"><p>{error}</p></div></div>;
  const receipts = all.filter((r) => r.status === "erfasst" && !r.claim_id && r.payment_method === "privat").sort((a, b) => (a.receipt_date ?? "").localeCompare(b.receipt_date ?? ""));
  return <>
      <header className="aus-head"><Link className="aus-back" href="/auslagen">← Belege</Link><span className="aus-eyebrow">Auslagen &amp; Belege</span><h1 className="aus-h1">Antrag erstellen</h1><p className="aus-lede">Wähle Firma und Belege, prüfe deine Daten und unterschreibe auf dem Display.</p></header>
      <ClaimForm companies={companies} receipts={receipts} initial={applicantFromProfile(profile)} today={todayISO()} />
      <section className="aus-section"><OriginalHint /></section>
    </>;
}
