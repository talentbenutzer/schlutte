"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AUSLAGEN_BUCKET } from "@/lib/auslagen/paths";
import { PAYMENT_CHANNEL_LABEL, PAYMENT_CHANNELS, type CardStatement, type Company, type CreditCard, type Receipt } from "@/lib/auslagen/types";
import type { PaymentReceipt } from "@/lib/auslagen/reconciliation";
import { formatEUR } from "@/lib/auslagen/format";
import { formatDate } from "@/lib/utils";
import { createCardAction, markCompanyPaymentReviewedAction, registerStatementAction, updateCardAction } from "./actions";
import { PaymentOverview } from "./PaymentOverview";

const CARD_CHANNELS = PAYMENT_CHANNELS.filter((channel) => channel !== "bar");

export function AbgleichHome({ cards, statements, companies, payments, receipts }: { cards: CreditCard[]; statements: CardStatement[]; companies: Company[]; payments: Receipt[]; receipts: PaymentReceipt[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [cardId, setCardId] = useState(cards.find((c) => c.is_active)?.id || "");
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function addCard(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setMessage("");
    const form = e.currentTarget;
    const data = new FormData(form);
    start(async () => {
      const result = await createCardAction({ label: String(data.get("label") || ""), last4: String(data.get("last4") || ""), companyId: String(data.get("companyId") || ""), holderName: String(data.get("holderName") || ""), paymentChannel: String(data.get("paymentChannel") || "") });
      if (!result.ok) setError(result.error || "Karte konnte nicht gespeichert werden.");
      else { form.reset(); setMessage("Kreditkarte angelegt."); if (result.id) setCardId(result.id); router.refresh(); }
    });
  }

  async function upload(file: File | undefined) {
    if (!file || busy) return;
    setError(""); setMessage("");
    if (!cardId) { setError("Bitte zuerst eine Karte wählen."); return; }
    if (file.type !== "application/pdf" || file.size > 15 * 1024 * 1024) { setError("Bitte ein PDF bis 15 MB wählen."); return; }
    setBusy(true);
    try {
      const db = createClient();
      const { data: { user } } = await db.auth.getUser();
      if (!user) throw new Error("Bitte erneut anmelden.");
      const path = `${user.id}/abrechnungen/${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await db.storage.from(AUSLAGEN_BUCKET).upload(path, file, { contentType: "application/pdf", upsert: false });
      if (uploadError) throw new Error(uploadError.message);
      const result = await registerStatementAction({ path, fileName: file.name, cardId });
      if (!result.ok || !result.id) { await db.storage.from(AUSLAGEN_BUCKET).remove([path]); throw new Error(result.error || "Abrechnung konnte nicht gespeichert werden."); }
      router.push(`/auslagen/abgleich/${result.id}`); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Upload fehlgeschlagen."); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }

  function saveCard(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault(); setError(""); setMessage("");
    const data = new FormData(e.currentTarget);
    start(async () => {
      const result = await updateCardAction(id, { label: String(data.get("label") || ""), last4: String(data.get("last4") || ""), companyId: String(data.get("companyId") || ""), holderName: String(data.get("holderName") || ""), active: data.get("active") === "on", paymentChannel: String(data.get("paymentChannel") || "") });
      if (!result.ok) setError(result.error || "Karte konnte nicht gespeichert werden.");
      else { setMessage("Kreditkarte gespeichert."); router.refresh(); }
    });
  }

  function reviewPayment(id: string, reviewed: boolean) {
    setError(""); setMessage("");
    start(async () => {
      const result = await markCompanyPaymentReviewedAction(id, reviewed);
      if (!result.ok) setError(result.error || "Prüfstatus konnte nicht gespeichert werden.");
      else { setMessage(reviewed ? "Zahlung als geprüft markiert." : "Zahlung wieder geöffnet."); router.refresh(); }
    });
  }

  return <div className="aus-stack">
    <PaymentOverview cards={cards} receipts={receipts} />
    <section className="aus-section"><h2 className="aus-h2">Abrechnung hochladen</h2><div className="aus-card aus-stack"><label className="aus-field"><span className="aus-label">Kreditkarte</span><select className="aus-select" value={cardId} onChange={(e) => setCardId(e.target.value)} disabled={busy}>{cards.filter((c) => c.is_active).map((c) => <option key={c.id} value={c.id}>{c.label} ·•••• {c.last4}</option>)}</select></label><input ref={input} type="file" accept="application/pdf" className="aus-sr-only" onChange={(e) => upload(e.target.files?.[0])} disabled={busy} aria-label="Kreditkartenabrechnung auswählen" /><button type="button" className="aus-btn aus-btn-primary" disabled={busy || !cardId} onClick={() => input.current?.click()}>{busy ? "Abrechnung wird ausgelesen …" : "PDF-Abrechnung wählen"}</button><p className="aus-help">Die KI liest Buchungen aus. Prüfe Beträge, Datum und Kartenende anschließend in der Übersicht.</p></div></section>
    <section className="aus-section"><h2 className="aus-h2">Abrechnungen</h2>{statements.length ? <div className="aus-list">{statements.map((s) => { const card = cards.find((c) => c.id === s.credit_card_id); return <Link className="aus-item" href={`/auslagen/abgleich/${s.id}`} key={s.id}><span className="aus-item-main"><strong className="aus-item-title">{card?.label || "Karte"} ·•••• {card?.last4}</strong><span className="aus-item-meta">{card?.payment_channel ? `${PAYMENT_CHANNEL_LABEL[card.payment_channel]} · ` : ""}{s.period_start ? `${formatDate(s.period_start)} – ${formatDate(s.period_end)}` : s.file_name || formatDate(s.created_at)}</span></span><span className={`aus-chip ${s.status === "fehler" ? "is-danger" : s.status === "verarbeitet" ? "is-done" : "is-draft"}`}>{s.status === "fehler" ? "Prüfen" : s.status === "verarbeitet" ? "Verarbeitet" : "Neu"}</span></Link>; })}</div> : <div className="aus-empty"><p className="aus-empty-title">Noch keine Abrechnungen</p></div>}</section>
    <section className="aus-section">
      <h2 className="aus-h2">Weitere Firmenzahlungen</h2>
      <p className="aus-help">Firmenbelege ohne zugeordnete Kartenbuchung. Barzahlungen und Zahlungen ohne Abrechnung können hier manuell geprüft werden.</p>
      {payments.length ? <div className="aus-stack">{payments.map((receipt) => <article className="aus-card aus-stack" key={receipt.id}>
        <div className="aus-card-head"><div><h3 className="aus-card-title">{receipt.merchant || "Beleg"}</h3><p className="aus-help">{formatDate(receipt.receipt_date)} · {receipt.payment_channel ? PAYMENT_CHANNEL_LABEL[receipt.payment_channel] : "Zahlungsweg offen"}</p></div><strong className="aus-amount">{formatEUR(receipt.currency === "EUR" ? receipt.gross_amount : receipt.gross_amount_eur)}</strong></div>
        <div className="aus-actions"><span className={`aus-chip ${receipt.payment_reviewed_at ? "is-done" : "is-draft"}`}>{receipt.payment_reviewed_at ? "Geprüft" : "Offen"}</span><Link className="aus-btn aus-btn-quiet" href={`/auslagen/belege/${receipt.id}`}>Beleg</Link><button type="button" className="aus-btn aus-btn-secondary" disabled={pending} onClick={() => reviewPayment(receipt.id, !receipt.payment_reviewed_at)}>{receipt.payment_reviewed_at ? "Wieder öffnen" : "Als geprüft markieren"}</button></div>
      </article>)}</div> : <div className="aus-empty"><p className="aus-empty-title">Keine offenen Firmenzahlungen</p></div>}
    </section>
    <section className="aus-section"><h2 className="aus-h2">Zahlungskarten</h2><div className="aus-stack">{cards.map((c) => <form className="aus-card aus-form" onSubmit={(e) => saveCard(e, c.id)} key={c.id}><div className="aus-grid aus-grid-2"><label className="aus-field"><span className="aus-label">Bezeichnung</span><input className="aus-input" name="label" defaultValue={c.label} required maxLength={100} /></label><label className="aus-field"><span className="aus-label">Letzte 4 Ziffern</span><input className="aus-input is-mono" name="last4" defaultValue={c.last4 || ""} pattern="[0-9]{4}" maxLength={4} required /></label><label className="aus-field"><span className="aus-label">Kartenart</span><select className="aus-select" name="paymentChannel" defaultValue={c.payment_channel || ""}><option value="">Unbekannt</option>{CARD_CHANNELS.map((channel) => <option key={channel} value={channel}>{PAYMENT_CHANNEL_LABEL[channel]}</option>)}</select></label><label className="aus-field"><span className="aus-label">Firma</span><select className="aus-select" name="companyId" defaultValue={c.company_id || ""}><option value="">Keine</option>{companies.map((co) => <option key={co.id} value={co.id}>{co.name}</option>)}</select></label><label className="aus-field"><span className="aus-label">Karteninhaber</span><input className="aus-input" name="holderName" defaultValue={c.holder_name || ""} maxLength={120} /></label></div><label className="aus-check"><input type="checkbox" name="active" defaultChecked={c.is_active} /> Aktiv</label><button type="submit" className="aus-btn aus-btn-secondary" disabled={pending}>Karte speichern</button></form>)}</div><h3 className="aus-h2">Neue Karte</h3><form className="aus-form" onSubmit={addCard}><div className="aus-grid aus-grid-2"><label className="aus-field"><span className="aus-label">Bezeichnung</span><input className="aus-input" name="label" required maxLength={100} /></label><label className="aus-field"><span className="aus-label">Letzte 4 Ziffern</span><input className="aus-input is-mono" name="last4" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required /></label><label className="aus-field"><span className="aus-label">Kartenart</span><select className="aus-select" name="paymentChannel" defaultValue="kreditkarte" required>{CARD_CHANNELS.map((channel) => <option key={channel} value={channel}>{PAYMENT_CHANNEL_LABEL[channel]}</option>)}</select></label><label className="aus-field"><span className="aus-label">Firma</span><select className="aus-select" name="companyId"><option value="">Keine</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="aus-field"><span className="aus-label">Karteninhaber</span><input className="aus-input" name="holderName" maxLength={120} /></label></div><button type="submit" className="aus-btn aus-btn-secondary" disabled={pending}>Karte hinzufügen</button></form></section>
    {error && <div className="aus-note is-danger" role="alert"><div className="aus-note-body"><p>{error}</p></div></div>}{message && <p role="status" className="aus-field-ok">{message}</p>}
  </div>;
}
