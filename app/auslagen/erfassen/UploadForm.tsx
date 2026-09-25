"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AUSLAGEN_BUCKET } from "@/lib/auslagen/paths";
import { formatEUR } from "@/lib/auslagen/format";
import { PAYMENT_CHANNEL_LABEL } from "@/lib/auslagen/types";
import { formatDate } from "@/lib/utils";
import { registerReceiptAction, type UploadReceiptSummary } from "../belege/actions";

async function normalizeFile(file: File): Promise<File> {
  if (file.type === "application/pdf") return file;
  if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) throw new Error("Bitte ein Bild oder PDF auswählen.");
  let image: ImageBitmap | HTMLImageElement;
  try { image = await createImageBitmap(file); }
  catch {
    // Safari kann Fotos aus der Mediathek teils per <img> dekodieren, obwohl
    // createImageBitmap (insbesondere bei HEIC) fehlschlägt.
    const objectUrl = URL.createObjectURL(file);
    try {
      image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("Das Bildformat konnte nicht geöffnet werden. Bitte als JPEG oder PDF exportieren."));
        element.src = objectUrl;
      });
    } finally { URL.revokeObjectURL(objectUrl); }
  }
  try {
    const width = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
    const height = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
    const scale = Math.min(1, 2000 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Das Bild konnte nicht verarbeitet werden.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((out) => out ? resolve(out) : reject(new Error("Das Bild konnte nicht gespeichert werden.")), "image/jpeg", 0.82));
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } finally { if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) image.close(); }
}

type BatchItem = { key: string; name: string; progress: number; stage: string; receipt?: UploadReceiptSummary; error?: string };

export function UploadForm({ cardId, transactionId, statementId, initialBatch }: { cardId?: string; transactionId?: string; statementId?: string; initialBatch: UploadReceiptSummary[] }) {
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<BatchItem[]>(() => initialBatch.map((receipt) => ({ key: receipt.id, name: receipt.file_name || "Beleg", progress: 100, stage: receipt.status === "erfasst" ? "Erfasst" : "Zu überprüfen", receipt })));
  const [error, setError] = useState("");

  async function upload(files: FileList | null) {
    if (!files?.length || busy) return;
    const selected = Array.from(files);
    if (items.length + selected.length > 50) { setError("Pro Durchgang sind höchstens 50 Belege möglich."); return; }
    setBusy(true); setError("");
    const start = items.length;
    setItems((previous) => [...previous, ...selected.map((file, index) => ({ key: `${Date.now()}-${index}`, name: file.name, progress: 0, stage: "Wartet auf Upload" }))]);
    const update = (index: number, patch: Partial<BatchItem>) => setItems((previous) => previous.map((item, position) => position === start + index ? { ...item, ...patch } : item));
    const db = createClient();
    try {
      const { data: { user } } = await db.auth.getUser();
      if (!user) throw new Error("Bitte erneut anmelden.");
      const userId = user.id;
      const completed: (UploadReceiptSummary | null)[] = Array(selected.length).fill(null);
      let next = 0;
      async function worker() {
        while (next < selected.length) {
          const index = next++;
          const original = selected[index];
          try {
            update(index, { progress: 10, stage: "Datei wird vorbereitet" });
            const file = await normalizeFile(original);
            if (file.size > 15 * 1024 * 1024) throw new Error("Datei ist größer als 15 MB.");
            update(index, { progress: 35, stage: "Datei wird hochgeladen" });
            const path = `${userId}/belege/${crypto.randomUUID()}.${file.type === "application/pdf" ? "pdf" : "jpg"}`;
            const { error: uploadError } = await db.storage.from(AUSLAGEN_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
            if (uploadError) throw new Error(uploadError.message);
            update(index, { progress: 70, stage: "Angaben werden erkannt" });
            const result = await registerReceiptAction({ path, mime: file.type, fileName: original.name, cardId });
            if (!result.ok || !result.receipt) {
              await db.storage.from(AUSLAGEN_BUCKET).remove([path]);
              throw new Error(result.error || "Beleg konnte nicht registriert werden.");
            }
            completed[index] = result.receipt;
            update(index, { progress: 100, stage: "Zu überprüfen", receipt: result.receipt });
          } catch (cause) {
            update(index, { stage: "Fehler", error: cause instanceof Error ? cause.message : "Upload fehlgeschlagen." });
          }
        }
      }
      await Promise.all(Array.from({ length: Math.min(3, selected.length) }, () => worker()));
      const successful = completed.filter((receipt): receipt is UploadReceiptSummary => receipt !== null);
      if (transactionId && statementId && selected.length === 1 && successful.length === 1) {
        router.push(`/auslagen/belege/${successful[0].id}?transactionId=${encodeURIComponent(transactionId)}&statementId=${encodeURIComponent(statementId)}`);
      } else {
        const ids = [...items.flatMap((item) => item.receipt ? [item.receipt.id] : []), ...successful.map((receipt) => receipt.id)];
        if (ids.length) window.history.replaceState(null, "", `/auslagen/erfassen?batch=${ids.join(",")}`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload fehlgeschlagen.");
    } finally {
      setBusy(false);
      if (camera.current) camera.current.value = "";
      if (picker.current) picker.current.value = "";
    }
  }

  const batchIds = items.flatMap((item) => item.receipt ? [item.receipt.id] : []);
  const batchUrl = `/auslagen/erfassen?batch=${batchIds.join(",")}`;
  const progress = items.length ? Math.round(items.reduce((sum, item) => sum + item.progress, 0) / items.length) : 0;

  return <section className="aus-section">
    <div className="aus-card aus-stack">
      <input ref={camera} className="aus-sr-only" type="file" accept="image/*" capture="environment" onChange={(e) => upload(e.target.files)} disabled={busy} aria-label="Foto aufnehmen" />
      <input ref={picker} className="aus-sr-only" type="file" accept="image/*,application/pdf,.heic,.heif" multiple onChange={(e) => upload(e.target.files)} disabled={busy} aria-label="Datei wählen" />
      <div className="aus-actions">
        <button type="button" className="aus-btn aus-btn-primary" onClick={() => camera.current?.click()} disabled={busy}>Foto aufnehmen</button>
        <button type="button" className="aus-btn aus-btn-secondary" onClick={() => picker.current?.click()} disabled={busy}>Mehrere Belege wählen</button>
      </div>
      <p className="aus-help">Bilder werden für den Upload verkleinert. PDF-Dateien bleiben unverändert. Maximal 15 MB je Datei.</p>
      {error && <div className="aus-note is-danger" role="alert"><div className="aus-note-body"><p>{error}</p></div></div>}
    </div>
    {items.length > 0 && <div className="aus-stack" aria-live="polite">
      <div className="aus-section-head"><h2 className="aus-h2">Hochgeladene Belege</h2><span className="aus-chip is-plain">{items.filter((item) => item.receipt?.status === "erfasst").length} von {items.length} erfasst</span></div>
      {busy && <div><p className="aus-help">Gesamtfortschritt: {progress} %</p><progress className="aus-progress" max="100" value={progress} aria-label="Gesamtfortschritt" /></div>}
      <div className="aus-list">{items.map((item) => <div className="aus-item" key={item.key}>
        <span className="aus-item-main"><strong className="aus-item-title">{item.receipt?.merchant || item.name}</strong>
          <span className="aus-item-meta">{item.receipt ? `${formatDate(item.receipt.receipt_date)} · ${item.receipt.payment_channel ? PAYMENT_CHANNEL_LABEL[item.receipt.payment_channel] : "Zahlungsweg offen"} · ${formatEUR(item.receipt.gross_amount, item.receipt.currency)}` : item.stage}</span>
          {item.receipt?.extraction_error && <span className="aus-help">Automatisches Auslesen fehlgeschlagen. Bitte Angaben manuell prüfen.</span>}
          {item.error && <span className="aus-field-error">{item.error}</span>}
          {item.progress < 100 && !item.error && <progress className="aus-progress" max="100" value={item.progress} aria-label={`Fortschritt ${item.name}`} />}
        </span>
        <span className="aus-item-side"><span className={`aus-chip ${item.error ? "is-danger" : item.receipt?.status === "erfasst" ? "is-done" : "is-draft"}`}>{item.error ? "Fehler" : item.receipt?.status === "erfasst" ? "Erfasst" : item.receipt ? "Zu überprüfen" : item.stage}</span>
          {item.receipt && !busy && <Link className="aus-btn aus-btn-sm aus-btn-secondary" href={`/auslagen/belege/${item.receipt.id}?batch=${encodeURIComponent(batchIds.join(","))}`}>{item.receipt.status === "erfasst" ? "Ansehen" : "Prüfen"}</Link>}
        </span>
      </div>)}</div>
      {!busy && <div className="aus-actions">
        {batchIds.length > 0 && items.every((item) => !item.receipt || item.receipt.status === "erfasst") && items.some((item) => item.receipt?.payment_method === "privat") && <Link className="aus-btn aus-btn-secondary" href="/auslagen/antrag/neu">Antrag erstellen</Link>}
        {batchIds.length > 0 && <Link className="aus-btn aus-btn-quiet" href={batchUrl}>Liste aktualisieren</Link>}
      </div>}
    </div>}
  </section>;
}
