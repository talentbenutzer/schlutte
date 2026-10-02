"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatAmountInput, formatEUR } from "@/lib/auslagen/format";
import { matchScore } from "@/lib/auslagen/matching";
import { buildBookletPdf } from "@/lib/auslagen/pdf/booklet";
import { PAYMENT_CHANNEL_LABEL, type CardStatement, type CardTransaction, type Company, type CreditCard, type Receipt } from "@/lib/auslagen/types";
import { formatDate } from "@/lib/utils";
import { assignReceiptAction, autoMatchAction, clearMatchAction, deleteStatementAction, markWithoutReceiptAction, retryStatementAction, updateTransactionAction } from "../actions";

export function StatementDetail({ statement, card, company, transactions, candidates, linked, receiptUrls, statementUrl }: {
  statement: CardStatement; card: CreditCard; company: Company | null; transactions: CardTransaction[]; candidates: Receipt[]; linked: Receipt[]; receiptUrls: Record<string, string | null>; statementUrl: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("alle");
  const [exporting, setExporting] = useState(false);
  const linkedCount = transactions.filter((tx) => tx.receipt_id).length;
  const used = new Set(transactions.map((tx) => tx.receipt_id).filter(Boolean));
  const visible = transactions.filter((tx) => filter === "offen" ? tx.match_status === "offen" : filter === "belegt" ? !!tx.receipt_id : filter === "ohne" ? tx.match_status === "ohne_beleg" : true);

  function mutate(action: () => Promise<{ ok: boolean; error?: string; count?: number; warning?: string }>, success: string) {
    setError(""); setMessage("");
    start(async () => { const result = await action(); if (result.ok) { setMessage(result.warning || (result.count !== undefined ? `${result.count} Belege zugeordnet.` : success)); router.refresh(); } else setError(result.error || "Aktion fehlgeschlagen."); });
  }

  async function exportBooklet() {
    setError(""); setExporting(true);
    try {
      const bytes = await buildBookletPdf({ statement, card, company, transactions, receipts: linked, receiptUrls, statementUrl });
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `Belegnachweis_${card.label.replace(/[^a-z0-9-]/gi, "_")}_${statement.statement_date || "Abrechnung"}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setMessage("Belegmappe erstellt.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Belegmappe konnte nicht erstellt werden."); }
    finally { setExporting(false); }
  }

  function remove() {
    if (!confirm("Abrechnung und alle zugehörigen Buchungen löschen? Die Belege bleiben erhalten.")) return;
    start(async () => { const result = await deleteStatementAction(statement.id); if (result.ok) { router.push("/auslagen/abgleich"); router.refresh(); } else setError(result.error || "Löschen fehlgeschlagen."); });
  }

  return <div className="aus-stack">
    {statement.extraction_error && <div className={`aus-note ${statement.status === "fehler" ? "is-danger" : "is-warn"}`} role="alert"><div className="aus-note-body"><p>{statement.extraction_error}</p></div></div>}
    <section className="aus-section"><div className="aus-stats"><div className="aus-stat"><span className="aus-stat-label">Buchungen</span><strong className="aus-stat-value">{transactions.length}</strong></div><div className="aus-stat"><span className="aus-stat-label">Mit Beleg</span><strong className="aus-stat-value">{linkedCount}</strong></div><div className="aus-stat"><span className="aus-stat-label">Offen</span><strong className="aus-stat-value">{transactions.filter((tx) => tx.match_status === "offen").length}</strong></div></div><div className="aus-actions"><a href={statementUrl} target="_blank" rel="noreferrer" className="aus-btn aus-btn-secondary">Original-PDF ansehen</a><button type="button" className="aus-btn aus-btn-secondary" onClick={() => mutate(() => autoMatchAction(statement.id), "Abgleich abgeschlossen.")} disabled={pending || !transactions.length}>Erneut abgleichen</button><button type="button" className="aus-btn aus-btn-primary" onClick={exportBooklet} disabled={exporting || !transactions.length}>{exporting ? "Belegmappe wird erstellt …" : "Belegmappe als PDF"}</button></div>{statement.status === "fehler" && !transactions.length && <button type="button" className="aus-btn aus-btn-primary" onClick={() => mutate(() => retryStatementAction(statement.id), "Abrechnung ausgelesen.")} disabled={pending}>PDF erneut auslesen</button>}</section>
    <section className="aus-section"><h2 className="aus-h2">Buchungen</h2><div className="aus-filters"><button className={`aus-filter${filter === "alle" ? " is-active" : ""}`} onClick={() => setFilter("alle")}>Alle</button><button className={`aus-filter${filter === "offen" ? " is-active" : ""}`} onClick={() => setFilter("offen")}>Offen</button><button className={`aus-filter${filter === "belegt" ? " is-active" : ""}`} onClick={() => setFilter("belegt")}>Belegt</button><button className={`aus-filter${filter === "ohne" ? " is-active" : ""}`} onClick={() => setFilter("ohne")}>Ohne Beleg</button></div>
      {visible.length ? <div className="aus-stack">{visible.map((tx) => {
        const receipt = linked.find((r) => r.id === tx.receipt_id);
        const options = candidates.filter((r) => (!used.has(r.id) || r.id === tx.receipt_id) && (!r.credit_card_id || r.credit_card_id === card.id)).map((r) => ({ receipt: r, score: matchScore(tx, r) })).sort((a, b) => b.score - a.score).slice(0, 100);
        return <article className="aus-card aus-stack" key={tx.id}>
          <div className="aus-card-head"><div><span className="aus-eyebrow">{formatDate(tx.transaction_date || tx.booking_date)}</span><h3 className="aus-card-title">{tx.merchant || tx.description || "Buchung"}</h3></div><strong className="aus-amount">{formatEUR(tx.amount)}</strong></div>
          <p className="aus-help">{tx.match_status === "auto" ? "Automatisch zugeordnet" : tx.match_status === "manuell" ? "Manuell zugeordnet" : tx.match_status === "ohne_beleg" ? `Ohne Beleg: ${tx.note || ""}` : "Beleg fehlt"}</p>
          {receipt && <><Link href={`/auslagen/belege/${receipt.id}`} className="aus-btn aus-btn-link">Beleg: {receipt.merchant || "öffnen"} · {receipt.payment_channel ? PAYMENT_CHANNEL_LABEL[receipt.payment_channel] : "Zahlungsweg offen"} · {formatEUR(receipt.gross_amount, receipt.currency)}</Link>{receipt.file_deleted_at ? <p className="aus-help">Originaldatei nach 30 Tagen gelöscht.</p> : receipt.storage_delete_after ? <p className="aus-help">Originaldatei verfügbar bis {formatDate(receipt.storage_delete_after)}.</p> : null}</>}
          <div className="aus-actions">
            <select className="aus-select" aria-label={`Beleg für ${tx.merchant || "Buchung"} wählen`} value={chosen[tx.id] || ""} onChange={(e) => setChosen((prev) => ({ ...prev, [tx.id]: e.target.value }))} disabled={pending}><option value="">Beleg wählen …</option>{options.map(({ receipt: r, score }) => <option value={r.id} key={r.id}>{formatDate(r.receipt_date)} · {r.merchant || "Beleg"} · {r.payment_channel ? PAYMENT_CHANNEL_LABEL[r.payment_channel] : "unbekannt"} · {formatEUR(r.currency === "EUR" ? r.gross_amount : r.gross_amount_eur)}{score ? ` · Treffer ${score}` : ""}</option>)}</select>
            <button type="button" className="aus-btn aus-btn-secondary" disabled={pending || !chosen[tx.id]} onClick={() => mutate(() => assignReceiptAction(tx.id, chosen[tx.id], statement.id), "Beleg zugeordnet.")}>Zuordnen</button>
            <Link className="aus-btn aus-btn-secondary" href={`/auslagen/erfassen?cardId=${card.id}&transactionId=${tx.id}&statementId=${statement.id}`}>Beleg fotografieren</Link>
            {tx.match_status !== "offen" && <button type="button" className="aus-btn aus-btn-quiet" disabled={pending} onClick={() => mutate(() => clearMatchAction(tx.id, statement.id), "Zuordnung gelöst.")}>Zuordnung lösen</button>}
          </div>
          {!tx.receipt_id && <div className="aus-actions"><input className="aus-input" value={notes[tx.id] || ""} onChange={(e) => setNotes((prev) => ({ ...prev, [tx.id]: e.target.value }))} placeholder="Begründung, falls kein Beleg nötig" maxLength={500} /><button type="button" className="aus-btn aus-btn-quiet" disabled={pending || !notes[tx.id]?.trim()} onClick={() => mutate(() => markWithoutReceiptAction(tx.id, statement.id, notes[tx.id]), "Als ohne Beleg markiert.")}>Kein Beleg nötig</button></div>}
          {!tx.receipt_id && <details><summary className="aus-help" style={{ cursor: "pointer" }}>Erkannte Buchung korrigieren</summary><form className="aus-form" onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); mutate(() => updateTransactionAction(tx.id, statement.id, data), "Buchung korrigiert."); }}><div className="aus-grid aus-grid-2"><label className="aus-field"><span className="aus-label">Datum</span><input className="aus-input" name="date" type="date" defaultValue={tx.transaction_date || tx.booking_date || ""} required /></label><label className="aus-field"><span className="aus-label">Betrag in EUR</span><input className="aus-input is-amount" name="amount" defaultValue={formatAmountInput(tx.amount)} inputMode="decimal" required /></label><label className="aus-field aus-span-2"><span className="aus-label">Händler</span><input className="aus-input" name="merchant" defaultValue={tx.merchant || tx.description || ""} required maxLength={200} /></label></div><button type="submit" className="aus-btn aus-btn-secondary" disabled={pending}>Korrektur speichern</button></form></details>}
        </article>;
      })}</div> : <div className="aus-empty"><p className="aus-empty-title">Keine Buchungen in dieser Ansicht</p></div>}
    </section>
    <section className="aus-section"><button type="button" className="aus-btn aus-btn-danger" onClick={remove} disabled={pending}>Abrechnung löschen</button></section>
    {error && <div className="aus-note is-danger" role="alert"><div className="aus-note-body"><p>{error}</p></div></div>}{message && <p role="status" className="aus-field-ok">{message}</p>}
  </div>;
}
