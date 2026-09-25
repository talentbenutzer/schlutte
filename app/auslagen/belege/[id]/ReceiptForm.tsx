"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { formatAmountInput, formatEUR, parseAmount, round2 } from "@/lib/auslagen/format";
import type { CreditCard, Receipt } from "@/lib/auslagen/types";
import { deleteReceiptAction, saveReceiptAction } from "../actions";
import { assignReceiptAction } from "../../abgleich/actions";

export function ReceiptForm({ receipt, cards, finance, editable, transactionId, statementId }: {
  receipt: Receipt; cards: Pick<CreditCard, "id" | "label" | "last4">[]; finance: boolean; editable: boolean; transactionId?: string; statementId?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [gross, setGross] = useState(formatAmountInput(receipt.gross_amount));
  const [net, setNet] = useState(formatAmountInput(receipt.net_amount));
  const [vat, setVat] = useState(formatAmountInput(receipt.vat_amount));
  const [rate, setRate] = useState(receipt.vat_rate === null ? "" : String(receipt.vat_rate).replace(".", ","));
  const [currency, setCurrency] = useState(receipt.currency);
  const [payment, setPayment] = useState(receipt.payment_method);
  const over250 = (parseAmount(gross) ?? 0) > 250;

  function calculate() {
    const amount = parseAmount(gross);
    const percentage = parseAmount(rate);
    if (amount === null || percentage === null || percentage < 0 || percentage > 100) return;
    const n = round2(amount / (1 + percentage / 100));
    setNet(formatAmountInput(n));
    setVat(formatAmountInput(round2(amount - n)));
  }

  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setSaved(false);
    const data = new FormData(e.currentTarget);
    start(async () => {
      const result = await saveReceiptAction(receipt.id, data);
      if (!result.ok) setError(result.error || "Speichern fehlgeschlagen.");
      else {
        if (finance && transactionId && statementId) {
          const match = await assignReceiptAction(transactionId, receipt.id, statementId);
          if (!match.ok) { setError(`Beleg gespeichert, Zuordnung fehlgeschlagen: ${match.error || "Bitte manuell zuordnen."}`); router.refresh(); return; }
          router.push(`/auslagen/abgleich/${statementId}`);
        }
        setSaved(true); router.refresh();
      }
    });
  }

  function remove() {
    if (!confirm("Diesen Beleg löschen?")) return;
    start(async () => {
      const result = await deleteReceiptAction(receipt.id);
      if (!result.ok) setError(result.error || "Löschen fehlgeschlagen.");
      else { router.push("/auslagen"); router.refresh(); }
    });
  }

  return <section className="aus-section">
    {receipt.claim_id && <div className="aus-note"><div className="aus-note-body"><p>Dieser Beleg gehört zu einem Antrag und ist gesperrt.</p></div></div>}
    {over250 && <div className="aus-note is-warn"><div className="aus-note-body"><p>Über 250 €: Bitte eine vollständige Rechnung mit Anschrift des Unternehmens aufbewahren.</p></div></div>}
    <form className="aus-form" onSubmit={save}>
      <div className="aus-grid aus-grid-2">
        <label className="aus-field"><span className="aus-label">Belegdatum *</span><input className="aus-input" type="date" name="receipt_date" defaultValue={receipt.receipt_date ?? ""} required disabled={!editable || pending} /></label>
        <label className="aus-field"><span className="aus-label">Händler *</span><input className="aus-input" name="merchant" defaultValue={receipt.merchant ?? ""} maxLength={200} required disabled={!editable || pending} /></label>
        <label className="aus-field aus-span-2"><span className="aus-label">Beschreibung / Zweck</span><input className="aus-input" name="description" defaultValue={receipt.description ?? ""} maxLength={500} disabled={!editable || pending} /></label>
        <label className="aus-field"><span className="aus-label">Währung</span><input className="aus-input is-mono" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} disabled={!editable || pending} /></label>
        <label className="aus-field"><span className="aus-label">Brutto *</span><input className="aus-input is-amount" name="gross_amount" value={gross} onChange={(e) => setGross(e.target.value)} inputMode="decimal" required disabled={!editable || pending} /></label>
        <label className="aus-field"><span className="aus-label">MwSt-Satz in %</span><input className="aus-input is-amount" name="vat_rate" value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" disabled={!editable || pending} /></label>
        <div className="aus-field"><span className="aus-label">Rechenhilfe</span><button className="aus-btn aus-btn-secondary" type="button" onClick={calculate} disabled={!editable || pending}>Netto und MwSt berechnen</button></div>
        <label className="aus-field"><span className="aus-label">Netto</span><input className="aus-input is-amount" name="net_amount" value={net} onChange={(e) => setNet(e.target.value)} inputMode="decimal" disabled={!editable || pending} /></label>
        <label className="aus-field"><span className="aus-label">MwSt</span><input className="aus-input is-amount" name="vat_amount" value={vat} onChange={(e) => setVat(e.target.value)} inputMode="decimal" disabled={!editable || pending} /></label>
        {currency !== "EUR" && <label className="aus-field"><span className="aus-label">Betrag in EUR *</span><input className="aus-input is-amount" name="gross_amount_eur" defaultValue={formatAmountInput(receipt.gross_amount_eur)} inputMode="decimal" required disabled={!editable || pending} /></label>}
        <label className="aus-field"><span className="aus-label">Zahlart</span><select className="aus-select" name="payment_method" value={payment} onChange={(e) => setPayment(e.target.value as Receipt["payment_method"])} disabled={!editable || pending}><option value="privat">Privat bezahlt</option>{finance && <option value="kreditkarte">Firmen-Kreditkarte</option>}</select></label>
        {finance && payment === "kreditkarte" && <label className="aus-field"><span className="aus-label">Kreditkarte</span><select className="aus-select" name="credit_card_id" defaultValue={receipt.credit_card_id ?? ""} disabled={!editable || pending}><option value="">Noch nicht zugeordnet</option>{cards.map((card) => <option key={card.id} value={card.id}>{card.label} ·•••• {card.last4 ?? ""}</option>)}</select></label>}
      </div>
      {error && <div className="aus-note is-danger" role="alert"><div className="aus-note-body"><p>{error}</p></div></div>}
      {saved && <p role="status" className="aus-field-ok">Beleg gespeichert.</p>}
      {editable && <div className="aus-actions"><button type="submit" className="aus-btn aus-btn-primary" disabled={pending}>Beleg speichern</button><button type="button" className="aus-btn aus-btn-danger" onClick={remove} disabled={pending}>Beleg löschen</button></div>}
      {!editable && <p className="aus-help">Brutto: {formatEUR(receipt.gross_amount, receipt.currency)}</p>}
    </form>
  </section>;
}
