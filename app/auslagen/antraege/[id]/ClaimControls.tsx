"use client";

import { useEffect, useState, useTransition } from "react";
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
  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState(existingPdfUrl);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const fileName = `Auslagenerstattung_${claim.claim_date}_${company.id}.pdf`;
  const recipient = claim.recipient_email || company.recipient_email;
  const subject = `Antrag auf Auslagenerstattung – ${claim.applicant.first_name} ${claim.applicant.last_name} – ${formatDate(claim.claim_date)}`;

  useEffect(() => {
    if (!existingPdfUrl) return;
    let active = true;
    fetch(existingPdfUrl).then((response) => { if (!response.ok) throw new Error("PDF nicht erreichbar"); return response.blob(); }).then((blob) => { if (active) setFile(new File([blob], fileName, { type: "application/pdf" })); }).catch(() => {});
    return () => { active = false; };
  }, [existingPdfUrl, fileName]);

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
        setFile(generated); setPdfUrl(URL.createObjectURL(generated)); setMessage("PDF mit Belegen erstellt und gespeichert."); router.refresh();
      } catch (cause) { setError(cause instanceof Error ? cause.message : "PDF konnte nicht erzeugt werden."); }
    });
  }

  async function share() {
    if (!file) return;
    setError("");
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: fileName }); setMessage("PDF wurde an die Teilen-Funktion übergeben. Bitte den Versand anschließend bestätigen."); }
      catch (cause) { if ((cause as Error).name !== "AbortError") setError("Teilen fehlgeschlagen. Bitte PDF herunterladen."); }
    } else {
      setError("Dateien teilen ist hier nicht verfügbar. Bitte PDF herunterladen und an die angezeigte Adresse senden.");
    }
  }

  async function copyEmail() {
    if (!recipient) return;
    try { await navigator.clipboard.writeText(recipient); setMessage("Empfängeradresse kopiert."); }
    catch { setError("Kopieren fehlgeschlagen."); }
  }

  function markSent() {
    start(async () => { const result = await markClaimSentAction(claim.id); if (result.ok) { setMessage("Als versendet markiert."); router.refresh(); } else setError(result.error || "Status konnte nicht gespeichert werden."); });
  }

  function remove() {
    if (!confirm("Diesen Antrag löschen? Die Belege werden wieder freigegeben.")) return;
    start(async () => { const result = await deleteClaimAction(claim.id); if (result.ok) { router.push("/auslagen/antraege"); router.refresh(); } else setError(result.error || "Löschen fehlgeschlagen."); });
  }

  return <section className="aus-section aus-stack">
    <div className="aus-card"><h2 className="aus-h2">PDF und Versand</h2><p>Empfänger: {recipient || "Noch keine Empfänger-E-Mail hinterlegt"}</p>
      {recipient && <button type="button" className="aus-btn aus-btn-quiet" onClick={copyEmail}>E-Mail-Adresse kopieren</button>}
      <p className="aus-help">Das PDF enthält den Antrag und alle Belege. Es wird über die Teilen-Funktion deines Geräts versendet.</p>
      <div className="aus-actions">
        {claim.status === "erstellt" && <button type="button" className="aus-btn aus-btn-primary" onClick={generate} disabled={pending}>{pending ? "PDF wird erstellt …" : pdfUrl ? "PDF neu erzeugen" : "PDF erzeugen"}</button>}
        {pdfUrl && <a className="aus-btn aus-btn-secondary" href={pdfUrl} download={fileName}>PDF herunterladen</a>}
        {file && <button type="button" className="aus-btn aus-btn-secondary" onClick={share}>Per E-Mail teilen</button>}
        {recipient && pdfUrl && <a className="aus-btn aus-btn-quiet" href={`mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}`}>E-Mail öffnen</a>}
      </div>
      {recipient && <p className="aus-help">Betreff: {subject}. Beim Öffnen der E-Mail das heruntergeladene PDF anhängen.</p>}
      {claim.status === "erstellt" && pdfUrl && <button type="button" className="aus-btn aus-btn-quiet" onClick={markSent} disabled={pending}>Als versendet markieren</button>}
      {claim.status === "erstellt" && <button type="button" className="aus-btn aus-btn-danger" onClick={remove} disabled={pending}>Antrag löschen</button>}
      {error && <div className="aus-note is-danger" role="alert"><div className="aus-note-body"><p>{error}</p></div></div>}
      {message && <p role="status" className="aus-field-ok">{message}</p>}
    </div>
  </section>;
}
