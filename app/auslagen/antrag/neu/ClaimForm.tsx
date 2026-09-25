"use client";

import { useRef, useState, useTransition, type FormEvent, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { formatEUR, isValidIban } from "@/lib/auslagen/format";
import { getMissingProfileFields } from "@/lib/auslagen/profile";
import { PROFILE_FIELDS, type ApplicantSnapshot, type Company, type Receipt } from "@/lib/auslagen/types";
import { formatDate } from "@/lib/utils";
import { saveProfileAction } from "../../profil/actions";
import { createClaimAction } from "../../antraege/actions";

export function ClaimForm({ companies, receipts, initial, today }: { companies: Company[]; receipts: Receipt[]; initial: ApplicantSnapshot; today: string }) {
  const router = useRouter();
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [applicant, setApplicant] = useState(initial);
  const [companyId, setCompanyId] = useState(companies[0]?.id || "");
  const [selected, setSelected] = useState<string[]>(receipts.map((r) => r.id));
  const [place, setPlace] = useState(initial.city || "");
  const [claimDate, setClaimDate] = useState(today);
  const [signature, setSignature] = useState<string | null>(null);
  const [saveStandard, setSaveStandard] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const total = receipts.filter((r) => selected.includes(r.id)).reduce((sum, r) => sum + Number(r.currency === "EUR" ? r.gross_amount : r.gross_amount_eur || 0), 0);
  const missing = getMissingProfileFields(applicant);

  function point(e: PointerEvent<HTMLCanvasElement>) {
    const element = canvas.current!;
    const rect = element.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * element.width / rect.width, y: (e.clientY - rect.top) * element.height / rect.height };
  }
  function begin(e: PointerEvent<HTMLCanvasElement>) {
    const element = canvas.current!;
    element.setPointerCapture(e.pointerId);
    const ctx = element.getContext("2d"); if (!ctx) return;
    const p = point(e); ctx.strokeStyle = "#171715"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(p.x, p.y);
    drawing.current = true;
  }
  function move(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvas.current?.getContext("2d"); if (!ctx) return;
    const p = point(e); ctx.lineTo(p.x, p.y); ctx.stroke();
  }
  function end() { drawing.current = false; setSignature(canvas.current?.toDataURL("image/png") ?? null); }
  function clear() { const element = canvas.current; element?.getContext("2d")?.clearRect(0, 0, element.width, element.height); setSignature(null); }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError("");
    if (!selected.length) { setError("Bitte mindestens einen Beleg wählen."); return; }
    if (missing.length || !isValidIban(applicant.iban)) { setError(`Profil vervollständigen: ${missing.join(", ") || "IBAN"}.`); return; }
    if (!signature) { setError("Bitte den Antrag unterschreiben."); return; }
    start(async () => {
      if (saveStandard) {
        const data = new FormData();
        for (const { key } of PROFILE_FIELDS) data.set(key, applicant[key]);
        const profileResult = await saveProfileAction(data);
        if (!profileResult.ok) { setError(profileResult.error || "Profil konnte nicht gespeichert werden."); return; }
      }
      const result = await createClaimAction({ companyId, receiptIds: selected, applicant, place, claimDate, signaturePng: signature });
      if (!result.ok || !result.id) setError(result.error || "Antrag konnte nicht erstellt werden.");
      else { router.push(`/auslagen/antraege/${result.id}`); router.refresh(); }
    });
  }

  return <form className="aus-form" onSubmit={submit}>
    <fieldset className="aus-fieldset"><legend className="aus-legend">01 / Firma</legend>
      <div className="aus-grid aus-grid-2">{companies.map((company) => <label className="aus-choice" key={company.id}><input type="radio" name="company" value={company.id} checked={companyId === company.id} onChange={() => setCompanyId(company.id)} disabled={pending} /><span><strong>{company.name}</strong><small>{company.recipient_email || "Empfänger-E-Mail noch nicht hinterlegt"}</small></span></label>)}</div>
    </fieldset>
    <fieldset className="aus-fieldset"><legend className="aus-legend">02 / Belege</legend>
      {receipts.length ? <div className="aus-list">{receipts.map((r) => <label className="aus-item" key={r.id}><input type="checkbox" checked={selected.includes(r.id)} onChange={() => setSelected((prev) => prev.includes(r.id) ? prev.filter((id) => id !== r.id) : [...prev, r.id])} disabled={pending} /><span className="aus-item-main"><strong className="aus-item-title">{r.merchant || "Beleg"}</strong><span className="aus-item-meta">{formatDate(r.receipt_date)} · {r.description || "Ohne Beschreibung"}</span></span><strong className="aus-amount">{formatEUR(r.currency === "EUR" ? r.gross_amount : r.gross_amount_eur)}</strong></label>)}</div> : <div className="aus-empty"><p className="aus-empty-title">Keine verfügbaren Belege</p><p>Erfasste, privat bezahlte Belege erscheinen hier.</p></div>}
      <p className="aus-amount-lg">Gesamtbetrag: {formatEUR(total)}</p>
    </fieldset>
    <fieldset className="aus-fieldset"><legend className="aus-legend">03 / Antragsteller</legend>
      <div className="aus-grid aus-grid-2">{PROFILE_FIELDS.map(({ key, label, required }) => <label className="aus-field" key={key}><span className="aus-label">{label}{required ? " *" : ""}</span><input className="aus-input" name={key} value={applicant[key]} onChange={(e) => setApplicant((prev) => ({ ...prev, [key]: e.target.value }))} required={required} disabled={pending} autoComplete={key === "iban" ? "off" : undefined} /></label>)}</div>
      <label className="aus-check"><input type="checkbox" checked={saveStandard} onChange={(e) => setSaveStandard(e.target.checked)} disabled={pending} /> Diese Angaben als Standard im Profil speichern</label>
      <div className="aus-grid aus-grid-2"><label className="aus-field"><span className="aus-label">Ort</span><input className="aus-input" value={place} onChange={(e) => setPlace(e.target.value)} maxLength={120} disabled={pending} /></label><label className="aus-field"><span className="aus-label">Datum</span><input className="aus-input" type="date" value={claimDate} onChange={(e) => setClaimDate(e.target.value)} required disabled={pending} /></label></div>
    </fieldset>
    <fieldset className="aus-fieldset"><legend className="aus-legend">04 / Unterschrift</legend>
      <p className="aus-help">Mit Finger, Stift oder Maus unterschreiben.</p>
      <canvas ref={canvas} width={600} height={180} onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} style={{ width: "100%", height: 180, border: "1px solid var(--border-strong)", touchAction: "none", background: "white" }} aria-label="Unterschriftsfeld" />
      <button type="button" className="aus-btn aus-btn-quiet" onClick={clear} disabled={pending}>Unterschrift löschen</button>
    </fieldset>
    {error && <div className="aus-note is-danger" role="alert"><div className="aus-note-body"><p>{error}</p></div></div>}
    <div className="aus-actions"><button type="submit" className="aus-btn aus-btn-primary" disabled={pending || !receipts.length || !companies.length}>{pending ? "Antrag wird erstellt …" : "Antrag erstellen"}</button></div>
  </form>;
}
