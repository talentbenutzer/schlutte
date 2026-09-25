"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zipSync } from "fflate";
import { formatEUR } from "@/lib/auslagen/format";
import { formatDate } from "@/lib/utils";
import type { InboxClaim } from "@/lib/data/auslagen-inbox";
import { markClaimsReadAction } from "./actions";

function fileName(claim: InboxClaim) {
  const person = claim.applicantName.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 60);
  return `Auslagenantrag_${claim.claimDate}_${person}_${claim.id.slice(0, 8)}.pdf`;
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function fetchPdf(id: string): Promise<Uint8Array> {
  const response = await fetch(`/api/auslagen/eingang/${encodeURIComponent(id)}/pdf`, { cache: "no-store" });
  if (!response.ok || !response.headers.get("content-type")?.includes("application/pdf")) {
    throw new Error("Das Antrags-PDF konnte nicht geladen werden.");
  }
  return new Uint8Array(await response.arrayBuffer());
}

export function InboxList({ initialClaims, companyNames }: { initialClaims: InboxClaim[]; companyNames: Record<string, string> }) {
  const router = useRouter();
  const [claims, setClaims] = useState(initialClaims);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const unread = claims.filter((claim) => claim.unread);

  async function markRead(ids: string[]) {
    for (let index = 0; index < ids.length; index += 500) {
      const result = await markClaimsReadAction(ids.slice(index, index + 500));
      if (!result.ok) throw new Error(result.error || "Lesestatus konnte nicht gespeichert werden.");
    }
    setClaims((previous) => previous.map((claim) => ids.includes(claim.id) ? { ...claim, unread: false } : claim));
    router.refresh();
  }

  async function downloadOne(claim: InboxClaim) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const bytes = await fetchPdf(claim.id);
      downloadBlob(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), fileName(claim));
      await markRead([claim.id]);
      setMessage("PDF heruntergeladen.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Download fehlgeschlagen."); }
    finally { setBusy(false); }
  }

  async function downloadAll() {
    if (busy || !unread.length) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const files: Record<string, Uint8Array> = {};
      let total = 0;
      for (const claim of unread) {
        const bytes = await fetchPdf(claim.id);
        total += bytes.byteLength;
        if (total > 150 * 1024 * 1024) throw new Error("Die neuen PDFs sind zusammen größer als 150 MB. Bitte einzeln herunterladen.");
        files[fileName(claim)] = bytes;
      }
      const zip = zipSync(files, { level: 0 });
      downloadBlob(new Blob([new Uint8Array(zip)], { type: "application/zip" }), `Neue_Auslagenantraege_${new Date().toISOString().slice(0, 10)}.zip`);
      await markRead(unread.map((claim) => claim.id));
      setMessage(`${unread.length} Antrags-PDFs als ZIP heruntergeladen.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Sammeldownload fehlgeschlagen."); }
    finally { setBusy(false); }
  }

  return <section className="aus-section aus-stack">
    <div className="aus-section-head"><h2 className="aus-h2">Eingereichte Anträge</h2><span className="aus-chip is-plain">{unread.length} ungelesen</span></div>
    {unread.length > 0 && <button type="button" className="aus-btn aus-btn-primary" onClick={downloadAll} disabled={busy}>Alle neuen PDFs als ZIP herunterladen</button>}
    {claims.length ? <div className="aus-stack">{claims.map((claim) => <article className="aus-card aus-stack" key={claim.id}>
      <div className="aus-card-head"><div><span className="aus-eyebrow">{companyNames[claim.companyId] || claim.companyId} · {formatDate(claim.sentAt)}</span><h3 className="aus-card-title">{claim.unread && <span className="aus-unread-dot" aria-label="Ungelesen" />} {claim.applicantName}</h3><p className="aus-help">Antrag vom {formatDate(claim.claimDate)} · {claim.receiptCount} Belege</p></div><strong className="aus-amount">{formatEUR(claim.totalGross)}</strong></div>
      <div className="aus-actions"><Link className="aus-btn aus-btn-secondary" href={`/auslagen/eingang/${claim.id}`}>Antrag ansehen</Link><button type="button" className="aus-btn aus-btn-quiet" onClick={() => downloadOne(claim)} disabled={busy}>PDF herunterladen</button></div>
    </article>)}</div> : <div className="aus-empty"><p className="aus-empty-title">Noch keine eingereichten Anträge</p></div>}
    {error && <div className="aus-note is-danger" role="alert"><div className="aus-note-body"><p>{error}</p></div></div>}
    {message && <p className="aus-field-ok" role="status">{message}</p>}
  </section>;
}
