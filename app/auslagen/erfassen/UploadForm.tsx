"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AUSLAGEN_BUCKET } from "@/lib/auslagen/paths";
import { registerReceiptAction } from "../belege/actions";

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

export function UploadForm({ cardId, transactionId, statementId }: { cardId?: string; transactionId?: string; statementId?: string }) {
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  async function upload(files: FileList | null) {
    if (!files?.length || busy) return;
    setBusy(true); setError("");
    const db = createClient();
    try {
      const { data: { user } } = await db.auth.getUser();
      if (!user) throw new Error("Bitte erneut anmelden.");
      const ids: string[] = [];
      for (let index = 0; index < files.length; index++) {
        setProgress(`Beleg ${index + 1} von ${files.length} wird verarbeitet …`);
        const file = await normalizeFile(files[index]);
        if (file.size > 15 * 1024 * 1024) throw new Error(`${file.name}: Datei ist größer als 15 MB.`);
        const path = `${user.id}/belege/${crypto.randomUUID()}.${file.type === "application/pdf" ? "pdf" : "jpg"}`;
        const { error: uploadError } = await db.storage.from(AUSLAGEN_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw new Error(`${file.name}: ${uploadError.message}`);
        const result = await registerReceiptAction({ path, mime: file.type, fileName: files[index].name, cardId });
        if (!result.ok || !result.id) {
          await db.storage.from(AUSLAGEN_BUCKET).remove([path]);
          throw new Error(result.error || "Beleg konnte nicht registriert werden.");
        }
        ids.push(result.id);
      }
      const suffix = transactionId && statementId ? `?transactionId=${encodeURIComponent(transactionId)}&statementId=${encodeURIComponent(statementId)}` : "";
      router.push(ids.length === 1 ? `/auslagen/belege/${ids[0]}${suffix}` : "/auslagen");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload fehlgeschlagen.");
    } finally {
      setBusy(false); setProgress("");
      if (camera.current) camera.current.value = "";
      if (picker.current) picker.current.value = "";
    }
  }

  return <section className="aus-section">
    <div className="aus-card aus-stack">
      <input ref={camera} className="aus-sr-only" type="file" accept="image/*" capture="environment" onChange={(e) => upload(e.target.files)} disabled={busy} aria-label="Foto aufnehmen" />
      <input ref={picker} className="aus-sr-only" type="file" accept="image/*,application/pdf,.heic,.heif" multiple onChange={(e) => upload(e.target.files)} disabled={busy} aria-label="Datei wählen" />
      <div className="aus-actions">
        <button type="button" className="aus-btn aus-btn-primary" onClick={() => camera.current?.click()} disabled={busy}>Foto aufnehmen</button>
        <button type="button" className="aus-btn aus-btn-secondary" onClick={() => picker.current?.click()} disabled={busy}>Datei wählen</button>
      </div>
      <p className="aus-help">Bilder werden für den Upload verkleinert. PDF-Dateien bleiben unverändert. Maximal 15 MB je Datei.</p>
      {progress && <p role="status">{progress}</p>}
      {error && <div className="aus-note is-danger" role="alert"><div className="aus-note-body"><p>{error}</p></div></div>}
    </div>
  </section>;
}
