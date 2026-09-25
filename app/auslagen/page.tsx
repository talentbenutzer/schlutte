import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { OriginalHint } from "@/components/auslagen/OriginalHint";
import { listOwnReceipts } from "@/lib/data/auslagen-receipts";
import { formatEUR } from "@/lib/auslagen/format";
import { formatDate } from "@/lib/utils";
import { errorMessage } from "@/lib/auslagen/errors";
import { PAYMENT_CHANNEL_LABEL } from "@/lib/auslagen/types";

export default async function AuslagenPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const filter = (await searchParams).filter || "offen";
  let receipts = [] as Awaited<ReturnType<typeof listOwnReceipts>>;
  let error: string | null = null;
  try { receipts = await listOwnReceipts(); } catch (cause) { error = errorMessage(cause); }
  const filtered = receipts.filter((r) => filter === "entwurf" ? r.status === "entwurf" : filter === "antrag" ? !!r.claim_id : r.status === "erfasst" && !r.claim_id);
  const tabs = [{ key: "offen", label: "Offen" }, { key: "entwurf", label: "Entwürfe" }, { key: "antrag", label: "Im Antrag" }];
  return (
    <>
      <header className="aus-head">
        <span className="aus-eyebrow">Auslagen &amp; Belege</span>
        <h1 className="aus-h1">Belege</h1>
        <p className="aus-lede">
          Quittungen und Rechnungen fotografieren oder hochladen. Aus offenen, privat bezahlten Belegen entsteht der
          Antrag auf Auslagenerstattung.
        </p>
        <div className="aus-actions aus-head-actions">
          <Link href="/auslagen/erfassen" className="aus-btn aus-btn-primary">
            <Icon name="camera" size={16} />
            Beleg erfassen
          </Link>
          <Link href="/auslagen/antrag/neu" className="aus-btn aus-btn-secondary">
            <Icon name="doc-stripe" size={16} />
            Antrag erstellen
          </Link>
        </div>
      </header>

      {error && <div className="aus-note is-danger" role="alert"><div className="aus-note-body"><p>{error}</p></div></div>}
      <section className="aus-section" aria-labelledby="aus-belege-titel">
        <div className="aus-section-head">
          <h2 id="aus-belege-titel" className="aus-h2">
            Meine Belege
          </h2>
        </div>
        <div className="aus-filters" aria-label="Belegstatus">
          {tabs.map((tab) => <Link key={tab.key} href={`/auslagen?filter=${tab.key}`} className={`aus-filter${filter === tab.key ? " is-active" : ""}`} aria-current={filter === tab.key ? "page" : undefined}>{tab.label} <span className="aus-filter-count">{receipts.filter((r) => tab.key === "entwurf" ? r.status === "entwurf" : tab.key === "antrag" ? !!r.claim_id : r.status === "erfasst" && !r.claim_id).length}</span></Link>)}
        </div>
        {filtered.length ? <div className="aus-list">{filtered.map((r) => <Link key={r.id} href={`/auslagen/belege/${r.id}`} className="aus-item">
          <span className="aus-item-thumb"><Icon name="receipt" size={24} /></span>
          <span className="aus-item-main"><strong className="aus-item-title">{r.merchant || r.file_name || "Beleg ohne Händler"}</strong><span className="aus-item-meta">{formatDate(r.receipt_date)} · {r.payment_channel ? PAYMENT_CHANNEL_LABEL[r.payment_channel] : "Zahlungsweg offen"} · {r.payment_method === "kreditkarte" ? "Firma bezahlt" : "Privat bezahlt"}</span></span>
          <span className="aus-item-side"><strong className="aus-amount">{formatEUR(r.gross_amount, r.currency)}</strong><span className={`aus-chip ${r.status === "entwurf" ? "is-draft" : r.claim_id ? "is-claim" : "is-done"}`}>{r.claim_id ? "Im Antrag" : r.status === "entwurf" ? "Entwurf" : "Erfasst"}</span></span>
        </Link>)}</div> : <div className="aus-empty"><Icon name="receipt" size={28} stroke={1.3} /><p className="aus-empty-title">Keine Belege in dieser Ansicht</p><p className="aus-help">Mit „Beleg erfassen“ kannst du eine Quittung fotografieren.</p></div>}
      </section>

      <section className="aus-section">
        <OriginalHint />
      </section>
    </>
  );
}
