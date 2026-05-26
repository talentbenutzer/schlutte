"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { Commission } from "@/lib/types";

export function PaletteForm({ commission }: { commission: Commission }) {
  const router = useRouter();
  const [project, setProject] = useState(commission.project || "");
  const [partName, setPartName] = useState("");
  const [dim, setDim] = useState("");
  const [positions, setPositions] = useState("");
  const [count, setCount] = useState<number>(1);
  const [shippingNote, setShippingNote] = useState("");
  const [owner, setOwner] = useState(commission.owner || "EDL");
  
  const [countError, setCountError] = useState("");
  const [ownerError, setOwnerError] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;

    if (count < 1) {
      setCountError("Anzahl Packstücke muss mindestens 1 sein.");
      hasError = true;
    } else {
      setCountError("");
    }

    if (owner.length > 3) {
      setOwnerError("Mitarbeiterkürzel darf maximal 3 Zeichen lang sein.");
      hasError = true;
    } else {
      setOwnerError("");
    }

    if (hasError) return;

    setIsSaved(true);
    
    // Simulate saving (e.g. redirects after brief delay)
    setTimeout(() => {
      router.push(`/kommissionen/${commission.no}`);
      router.refresh();
    }, 1500);
  };

  return (
    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 640 }}>
      {isSaved && (
        <div
          role="alert"
          style={{
            border: "1px solid var(--gd-success)",
            color: "var(--gd-success)",
            background: "var(--bg-alt)",
            padding: "12px 14px",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
          }}
        >
          ✓ Palettenbeschriftung erfolgreich simuliert gespeichert! Weiterleitung...
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Kommissionsnummer (Vorausgefüllt)">
          <input
            disabled
            value={commission.no}
            className="grb-input"
            style={{ opacity: 0.6, cursor: "not-allowed" }}
          />
        </Field>

        <Field label="Kunde (Vorausgefüllt)">
          <input
            disabled
            value={commission.client}
            className="grb-input"
            style={{ opacity: 0.6, cursor: "not-allowed" }}
          />
        </Field>
      </div>

      <Field label="Projekt / Objekt" hint="Optional. Z. B. Küche & Esszimmer.">
        <input
          value={project}
          onChange={(e) => setProject(e.target.value)}
          placeholder="Küche & Esszimmer"
          className="grb-input"
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Bauteil / Bezeichnung" hint="Optional. Z. B. Fronten / Korpora.">
          <input
            value={partName}
            onChange={(e) => setPartName(e.target.value)}
            placeholder="Fronten / Korpora"
            className="grb-input"
          />
        </Field>

        <Field label="Positionsnummern" hint="Optional. Z. B. 01, 02.">
          <input
            value={positions}
            onChange={(e) => setPositions(e.target.value)}
            placeholder="01, 02"
            className="grb-input"
          />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Maße (Freitext)" hint="Optional. Z. B. 120 × 80 × 110 cm.">
          <input
            value={dim}
            onChange={(e) => setDim(e.target.value)}
            placeholder="120 × 80 × 110 cm"
            className="grb-input"
          />
        </Field>

        <Field
          label="Anzahl Packstücke"
          hint="Pflichtfeld. Mindestens 1."
          error={countError}
        >
          <input
            type="number"
            min={1}
            required
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            placeholder="1"
            className="grb-input"
          />
        </Field>
      </div>

      <Field label="Versandhinweis" hint="Optional. Erscheint auf den Paketscheinen (z. B. Fragile, Trocken lagern).">
        <input
          value={shippingNote}
          onChange={(e) => setShippingNote(e.target.value)}
          placeholder="Achtung: Naturstein! Vorsichtig transportieren."
          className="grb-input"
        />
      </Field>

      <Field
        label="Owner / Kürzel"
        hint="Mitarbeiterkürzel, maximal drei Buchstaben."
        error={ownerError}
      >
        <input
          value={owner}
          onChange={(e) => setOwner(e.target.value.toUpperCase())}
          placeholder="EDL"
          maxLength={3}
          className="grb-input"
          style={{ maxWidth: 120, textTransform: "uppercase" }}
        />
      </Field>

      {/* Show sample label logic dynamically */}
      {count > 0 && (
        <div style={{ border: "1px solid var(--border)", padding: 16, background: "var(--bg-alt)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
          <span className="grb-eyebrow" style={{ display: "block", marginBottom: 8 }}>Vorschau Nummernsequenz</span>
          <div>Es werden {count} Palettenzettel erzeugt:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
              <span key={i} className="grb-chip">
                {i + 1} von {count}
              </span>
            ))}
            {count > 5 && <span style={{ color: "var(--fg-subtle)", alignSelf: "center" }}>... + {count - 5} weitere</span>}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
        <button type="submit" className="grb-btn grb-btn-primary" disabled={isSaved}>
          <Icon name="check" size={14} />
          {isSaved ? "Wird gespeichert..." : "Speichern simulieren"}
        </button>
        <Link
          href={`/print/palette/${commission.no}/1`}
          target="_blank"
          className="grb-btn grb-btn-ghost"
        >
          <Icon name="eye" size={14} /> Vorschau 1. Palette
        </Link>
        <Link
          href={`/print/palette/${commission.no}/range/1/${count || 1}`}
          target="_blank"
          className="grb-btn grb-btn-ghost"
        >
          <Icon name="print" size={14} /> Alle {count} drucken
        </Link>
        <Link href={`/kommissionen/${commission.no}`} className="grb-btn grb-btn-quiet">
          Abbrechen
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      <span className="grb-eyebrow">{label}</span>
      {children}
      {hint && !error && (
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--fg-subtle)" }}>
          {hint}
        </span>
      )}
      {error && (
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--gd-danger)" }}>
          {error}
        </span>
      )}
    </label>
  );
}
