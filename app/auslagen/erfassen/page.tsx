import Link from "next/link";
import { OriginalHint } from "@/components/auslagen/OriginalHint";
import { listOwnReceiptsByIds } from "@/lib/data/auslagen-receipts";
import type { UploadReceiptSummary } from "../belege/actions";
import { UploadForm } from "./UploadForm";

export const maxDuration = 60;

export default async function ErfassenPage({ searchParams }: { searchParams: Promise<{ cardId?: string; transactionId?: string; statementId?: string; batch?: string }> }) {
  const { cardId, transactionId, statementId, batch } = await searchParams;
  const ids = [...new Set((batch ?? "").split(","))].filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 50);
  const initialBatch: UploadReceiptSummary[] = ids.length ? (await listOwnReceiptsByIds(ids))
    .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
    .map(({ id, status, file_name, merchant, receipt_date, gross_amount, currency, payment_channel, payment_method, extraction_error }) =>
      ({ id, status, file_name, merchant, receipt_date, gross_amount, currency, payment_channel, payment_method, extraction_error })) : [];
  return <>
    <header className="aus-head">
      <Link className="aus-back" href="/auslagen">← Belege</Link>
      <span className="aus-eyebrow">Auslagen &amp; Belege</span>
      <h1 className="aus-h1">Belege erfassen</h1>
      <p className="aus-lede">Fotografiere Belege oder wähle mehrere Bilder und PDFs auf einmal. Prüfe danach die automatisch erkannten Angaben jedes Belegs.</p>
    </header>
    <UploadForm cardId={cardId} transactionId={transactionId} statementId={statementId} initialBatch={initialBatch} />
    <section className="aus-section"><OriginalHint /></section>
  </>;
}
