"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatEUR } from "@/lib/auslagen/format";
import { buildPaymentOverviewPdf } from "@/lib/auslagen/pdf/payment-overview";
import { groupReceiptsByPayment } from "@/lib/auslagen/reconciliation";
import type { PaymentReceipt } from "@/lib/auslagen/reconciliation";
import { PAYMENT_CHANNEL_LABEL, PAYMENT_CHANNELS, type CreditCard } from "@/lib/auslagen/types";
import { formatDate } from "@/lib/utils";
import { autoAssignPaymentCardsAction, classifySubmittedReceiptAction } from "./actions";

export function PaymentOverview({ cards, receipts }: { cards: CreditCard[]; receipts: PaymentReceipt[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState<Record<string, string>>({});
  const groups = groupReceiptsByPayment(receipts, cards);
  const open = receipts.filter((receipt) => !(receipt.reconciliation_channel ?? receipt.payment_channel)).length;

  function assignCards() {
    setError(""); setMessage("");
    start(async () => {
      const result = await autoAssignPaymentCardsAction();
      if (!result.ok) setError(result.error || "Karten konnten nicht zugeordnet werden.");
      else { setMessage(`${result.count ?? 0} Belege eindeutig einer Firmenkarte zugeordnet.`); router.refresh(); }
    });
  }

  function classify(id: string, channel: string) {
    setError(""); setMessage("");
    start(async () => {
      const result = await classifySubmittedReceiptAction(id, channel);
      if (!result.ok) setError(result.error || "Zahlungsweg konnte nicht gespeichert werden.");
      else { setMessage("Zahlungsweg für den Abgleich gespeichert."); router.refresh(); }
    });
  }

  async function exportPdf() {
    setError(""); setMessage(""); setProgress(0); setExporting(true);
    try {
      const bytes = await buildPaymentOverviewPdf(groups, (done, total) => setProgress(total ? Math.round(done / total * 100) : 100));
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `Zahlungsmittel_und_Belege_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage("Gesamt-PDF mit Übersicht und Originalbelegen erstellt.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gesamt-PDF konnte nicht erstellt werden."); }
    finally { setExporting(false); }
  }

  return <section className="aus-section aus-stack">
    <div className="aus-section-head"><h2 className="aus-h2">Alle Zahlungsmittel und Belege</h2><span className="aus-chip is-plain">{receipts.length} Belege</span></div>
    <p className="aus-help">Erfasste Firmenbelege und Belege aus eingereichten Anträgen. Private Entwürfe erscheinen hier nicht.</p>
    {open > 0 && <p className="aus-field-error">Bei {open} Belegen ist der Zahlungsweg noch offen. Bitte im Beleg oder hier prüfen.</p>}
    <div className="aus-actions"><button type="button" className="aus-btn aus-btn-secondary" onClick={assignCards} disabled={pending || exporting || !receipts.length}>Firmenkarten automatisch zuordnen</button><button type="button" className="aus-btn aus-btn-primary" onClick={exportPdf} disabled={pending || exporting || !receipts.length}>{exporting ? `PDF wird erstellt · ${progress} %` : "Alle Zahlungsmittel als ein PDF"}</button></div>
    {exporting && <progress className="aus-progress" value={progress} max="100" aria-label="Fortschritt Gesamt-PDF" />}
    {groups.length ? groups.map((group) => <div className="aus-card aus-stack" key={group.key}>
      <div className="aus-card-head"><div><span className="aus-eyebrow">{group.payer} bezahlt</span><h3 className="aus-card-title">{group.title}</h3><p className="aus-help">{group.receipts.length} Belege</p></div><strong className="aus-amount">{formatEUR(group.totalEUR)}</strong></div>
      <div className="aus-list">{group.receipts.map((receipt) => {
        const effectiveChannel = receipt.reconciliation_channel ?? receipt.payment_channel;
        const selected = channels[receipt.id] ?? effectiveChannel ?? "";
        return <div key={receipt.id}>
          <Link href={`/auslagen/belege/${receipt.id}`} className="aus-item">
            <span className="aus-item-main"><strong className="aus-item-title">{receipt.merchant || receipt.file_name || "Beleg"}</strong><span className="aus-item-meta">{formatDate(receipt.receipt_date)} · {receipt.payment_method === "kreditkarte" ? receipt.credit_card_id ? "Firmenkarte zugeordnet" : "Firmenkarte offen" : "Eingereichter Antrag"}</span></span>
            <span className="aus-item-side"><strong className="aus-amount">{formatEUR(receipt.currency === "EUR" ? receipt.gross_amount : receipt.gross_amount_eur)}</strong><span className={`aus-chip ${effectiveChannel ? "is-done" : "is-draft"}`}>{effectiveChannel ? PAYMENT_CHANNEL_LABEL[effectiveChannel] : "Prüfen"}</span></span>
          </Link>
          {receipt.payment_method === "privat" && receipt.claim_id && <div className="aus-reconcile-controls">
            <select className="aus-select" aria-label={`Zahlungsweg für ${receipt.merchant || receipt.file_name || "Beleg"}`} value={selected} onChange={(event) => setChannels((previous) => ({ ...previous, [receipt.id]: event.target.value }))} disabled={pending}>
              <option value="">Zahlungsweg wählen</option>{PAYMENT_CHANNELS.map((channel) => <option key={channel} value={channel}>{PAYMENT_CHANNEL_LABEL[channel]}</option>)}
            </select>
            <button type="button" className="aus-btn aus-btn-sm aus-btn-secondary" onClick={() => classify(receipt.id, selected)} disabled={pending || !selected || selected === effectiveChannel}>Zuordnen</button>
          </div>}
        </div>;
      })}</div>
    </div>) : <div className="aus-empty"><p className="aus-empty-title">Noch keine erfassten Belege</p></div>}
    {error && <div className="aus-note is-danger" role="alert"><div className="aus-note-body"><p>{error}</p></div></div>}
    {message && <p className="aus-field-ok" role="status">{message}</p>}
  </section>;
}
