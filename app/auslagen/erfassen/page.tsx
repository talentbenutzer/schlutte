import Link from "next/link";
import { OriginalHint } from "@/components/auslagen/OriginalHint";
import { UploadForm } from "./UploadForm";

export const maxDuration = 60;

export default async function ErfassenPage({ searchParams }: { searchParams: Promise<{ cardId?: string; transactionId?: string; statementId?: string }> }) {
  const { cardId, transactionId, statementId } = await searchParams;
  return <>
    <header className="aus-head">
      <Link className="aus-back" href="/auslagen">← Belege</Link>
      <span className="aus-eyebrow">Auslagen &amp; Belege</span>
      <h1 className="aus-h1">Beleg erfassen</h1>
      <p className="aus-lede">Fotografiere eine Quittung oder wähle ein Bild beziehungsweise PDF. Angaben werden nach Möglichkeit automatisch erkannt und können anschließend geprüft werden.</p>
    </header>
    <UploadForm cardId={cardId} transactionId={transactionId} statementId={statementId} />
    <section className="aus-section"><OriginalHint /></section>
  </>;
}
