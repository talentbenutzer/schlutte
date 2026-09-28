"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AUSLAGEN_BUCKET, claimPdfPath } from "@/lib/auslagen/paths";
import { buildClaimPdf } from "@/lib/auslagen/pdf/claim";
import type { Company, ExpenseClaim, Receipt } from "@/lib/auslagen/types";
import { formatDate } from "@/lib/utils";
import { deleteClaimAction, markClaimSentAction, setClaimPdfPathAction } from "../actions";

export function ClaimControls({ claim, company, receipts, urls, existingPdfUrl }: { claim: ExpenseClaim; company: Company; receipts: Receipt[]; urls: Record<string, string>; existingPdfUrl: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pdfUrl, setPdfUrl] = useState(existingPdfUrl);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const fileName = `Auslagenerstattung_${claim.claim_date}_${company.id}.pdf`;
  const recipient = claim.recipient_email || company.recipient_email;

  function generate() {
    setError(""); setMessage("");
    start(async () => {
      try {
        if (receipts.length !== claim.receipt_count) throw new Error("Die Beleganzahl stimmt nicht mehr. Bitte den Antrag prüfen.");
        const bytes = await buildClaimPdf(claim, company, receipts, urls);
        const generated = new File([new Uint8Array(bytes)], fileName, { type: "application/pdf" });
        const db = createClient();
        const path = claimPdfPath(claim.user_id, claim.id);
        const { error: uploadError } = await db.storage.from(AUSLAGEN_BUCKET).upload(path, generated, { upsert: true, contentType: "application/pdf" });
        if (uploadError) throw new Error(uploadError.message);
        const result = await setClaimPdfPathAction(claim.id, path);
        if (!result.ok) throw new Error(result.error || "PDF konnte nicht registriert werden.");
        setPdfUrl(URL.createObjectURL(generated)); setMessage("PDF mit Belegen erstellt und gespeichert."); router.refresh();
      } catch (cause) { setError(cause instanceof Error ? cause.message : "PDF konnte nicht erzeugt werden."); }
    });
  }

  function markSent() {
    setError(""); setMessage("");
    start(async () => { const result = await markClaimSentAction(claim.id); if (result.ok) { setMessage(`Antrag eingereicht und per E-Mail an ${result.recipient || recipient} versendet.`); router.refresh(); } else setError(result.error || "Antrag konnte nicht eingereicht werden."); });
  }

  function remove() {
    if (!confirm("Diesen Antrag löschen? Die Belege werden wieder freigegeben.")) return;
    start(async () => { const result = await deleteClaimAction(claim.id); if (result.ok) { router.push("/auslagen/antraege"); router.refresh(); } else setError(result.error || "Löschen fehlgeschlagen."); });
  }

  return <section className="aus-section aus-stack">
    <div className="aus-card"><h2 className="aus-h2">PDF und Einreichung</h2><p>Empfänger: {recipient || "Noch keine Empfänger-E-Mail hinterlegt"}</p>
      <p className="aus-help">Beim Einreichen wird das PDF mit Antrag und Belegen automatisch an diese Adresse gesendet.</p>
      <div className="aus-actions">
        {claim.status === "erstellt" && <button type="button" className="aus-btn aus-btn-primary" onClick={generate} disabled={pending}>{pending ? "PDF wird erstellt …" : pdfUrl ? "PDF neu erzeugen" : "PDF erzeugen"}</button>}
        {pdfUrl && <a className="aus-btn aus-btn-secondary" href={pdfUrl} download={fileName}>PDF herunterladen</a>}
      </div>
      {claim.status === "erstellt" && pdfUrl && <button type="button" className="aus-btn aus-btn-primary" onClick={markSent} disabled={pending || !recipient}>{pending ? "Wird eingereicht …" : "Einreichen & per E-Mail senden"}</button>}
      {claim.email_sent_at && <p className="aus-field-ok">Per E-Mail versendet am {formatDate(claim.email_sent_at)}.</p>}
      {claim.status === "erstellt" && <button type="button" className="aus-btn aus-btn-danger" onClick={remove} disabled={pending}>Antrag löschen</button>}
      {error && <div className="aus-note is-danger" role="alert"><div className="aus-note-body"><p>{error}</p></div></div>}
      {message && <p role="status" className="aus-field-ok">{message}</p>}
    </div>
  </section>;
}
