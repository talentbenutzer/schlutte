import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth/roles";
import { getReceipt, signedReceiptUrl } from "@/lib/data/auslagen-receipts";
import { createClient } from "@/lib/supabase/server";
import { OriginalHint } from "@/components/auslagen/OriginalHint";
import type { CreditCard } from "@/lib/auslagen/types";
import { formatDate } from "@/lib/utils";
import { ReceiptForm } from "./ReceiptForm";

export default async function BelegPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ transactionId?: string; statementId?: string; batch?: string }> }) {
  const { id } = await params;
  const { transactionId, statementId, batch } = await searchParams;
  const batchIds = [...new Set((batch ?? "").split(","))].filter((value) => /^[0-9a-f-]{36}$/i.test(value)).slice(0, 50);
  const batchUrl = batchIds.includes(id) ? `/auslagen/erfassen?batch=${batchIds.join(",")}` : null;
  const ctx = await getCurrentUserContext();
  if (!ctx) notFound();
  let receipt;
  try { receipt = await getReceipt(id); } catch { notFound(); }
  const previewUrl = await signedReceiptUrl(receipt);
  let cards: Pick<CreditCard, "id" | "label" | "last4">[] = [];
  if (ctx.isFinance) {
    const db = await createClient();
    const { data } = await db.from("credit_cards").select("id, label, last4").eq("is_active", true).order("label");
    cards = data ?? [];
  }
  // Endziffern vom Beleg (falls die KI sie erkannt hat) gegen die hinterlegten
  // Karten abgleichen — nur als Hinweis, unabhängig von der gewählten Zahlart.
  const cardLast4 = receipt.extraction?.card_last4 ?? null;
  const cardHint = cardLast4 ? { last4: cardLast4, candidates: cards.filter((c) => c.last4 === cardLast4) } : null;
  return <>
    <header className="aus-head">
      <Link href={batchUrl ?? "/auslagen"} className="aus-back">← {batchUrl ? "Upload-Liste" : "Belege"}</Link>
      <span className="aus-eyebrow">Auslagen &amp; Belege</span>
      <h1 className="aus-h1">Beleg prüfen</h1>
      <p className="aus-lede">Prüfe die erkannten Angaben und ergänze den Ausgabengrund.</p>
    </header>
    {receipt.extraction_error && <div className="aus-note is-warn"><div className="aus-note-body"><p className="aus-note-title">Automatisches Auslesen nicht verfügbar</p><p>{receipt.extraction_error}</p></div></div>}
    {receipt.storage_delete_after && !receipt.file_deleted_at && <div className="aus-note"><div className="aus-note-body"><p className="aus-note-title">Originaldatei noch 30 Tage verfügbar</p><p>Nach der Zuordnung zur Monatsabrechnung wird die Datei am {formatDate(receipt.storage_delete_after)} automatisch gelöscht. Die erfassten Daten und die Zuordnung bleiben erhalten.</p></div></div>}
    {receipt.file_deleted_at && <div className="aus-note"><div className="aus-note-body"><p className="aus-note-title">Originaldatei automatisch gelöscht</p><p>Die 30-tägige Aufbewahrungsfrist ist abgelaufen. Die erfassten Daten und die Zuordnung zur Monatsabrechnung bleiben erhalten.</p></div></div>}
    <section className="aus-section">
      <div className="aus-preview">
        {!previewUrl ? <div className="aus-empty"><p className="aus-empty-title">Originaldatei nicht mehr verfügbar</p><p className="aus-help">Die Belegdaten bleiben als Nachweis gespeichert.</p></div> : receipt.file_mime === "application/pdf" ? <iframe src={previewUrl} title="Beleg-PDF" style={{ width: "100%", height: 480, border: 0 }} /> :
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Hochgeladener Beleg" style={{ display: "block", maxWidth: "100%", maxHeight: 520, margin: "auto" }} />}
      </div>
    </section>
    <ReceiptForm receipt={receipt} cards={cards} cardHint={cardHint} finance={ctx.isFinance} editable={!receipt.claim_id && (receipt.user_id === ctx.userId || (ctx.isFinance && receipt.payment_method === "kreditkarte"))} deletable={receipt.user_id === ctx.userId && !receipt.claim_id} transactionId={transactionId} statementId={statementId} batchUrl={batchUrl} />
    <section className="aus-section"><OriginalHint /></section>
  </>;
}
