"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { Commission, PaletteFormData } from "@/lib/types";
import { savePaletteAction } from "./actions";

type EmployeeOption = { initials: string; name: string };

export function PaletteForm({
  commission,
  documentId,
  initialData,
  employees,
  currentInitials,
}: {
  commission: Commission;
  documentId?: string;
  initialData?: PaletteFormData;
  employees: EmployeeOption[];
  currentInitials?: string;
}) {
  const router = useRouter();
  // Objektbezeichnung: bei neuer Palette aus dem Projekt der Kommission vorausgefüllt, sonst gespeicherter Wert.
  const [objectName, setObjectName] = useState(
    initialData?.objectName ?? (documentId ? "" : commission.project ?? "") ?? ""
  );
  const [content, setContent] = useState(initialData?.content ?? "");
  const [lengthMm, setLengthMm] = useState(initialData?.lengthMm ?? "");
  const [widthMm, setWidthMm] = useState(initialData?.widthMm ?? "");
  const [heightMm, setHeightMm] = useState(initialData?.heightMm ?? "");
  const [weight, setWeight] = useState(initialData?.weight ?? "");
  const [count, setCount] = useState<number>(initialData?.packageCount || 1);
  const [hidePackageCount, setHidePackageCount] = useState<boolean>(
    initialData?.hidePackageCount ?? false
  );
  const [shippingNote, setShippingNote] = useState(initialData?.shippingNote || "");
  const [owner, setOwner] = useState(initialData?.employeeInitials || currentInitials || "");
  const [submitAction, setSubmitAction] = useState<"single" | "range">("single");

  const [countError, setCountError] = useState("");
  const [ownerError, setOwnerError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;

    // Bei ausgeblendeter Nummerierung wird genau ein Etikett erzeugt.
    const effectiveCount = hidePackageCount ? 1 : count;

    if (!hidePackageCount && count < 1) {
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

    setIsSaving(true);
    setSaveError("");

    const payload: PaletteFormData = {
      objectName,
      content,
      lengthMm,
      widthMm,
      heightMm,
      weight,
      packageCount: effectiveCount,
      hidePackageCount,
      shippingNote,
      employeeInitials: owner,
    };

    const result = await savePaletteAction(commission.no, payload, documentId);
    setIsSaving(false);

    if (result.error) {
      setSaveError(result.error);
      return;
    }

    setIsSaved(true);

    const docId = result.documentId;
    if (submitAction === "single") {
      router.push(`/print/palette/document/${docId}/1`);
    } else {
      router.push(`/print/palette/document/${docId}/range/1/${effectiveCount}`);
    }
    router.refresh();
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
          ✓ Palettenbeschriftung erfolgreich gespeichert! Weiterleitung...
        </div>
      )}

      {saveError && (
        <div
          role="alert"
          style={{
            border: "1px solid var(--gd-danger)",
            color: "var(--gd-danger)",
            background: "var(--bg-alt)",
            padding: "12px 14px",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
          }}
        >
          ❌ {saveError}
        </div>
      )}

      {/* Vorschau Nummernsequenz — direkt unter der Subheadline */}
      {!hidePackageCount && count > 0 && (
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

      <Field label="Objektbezeichnung" hint="Optional. Z. B. Küche & Esszimmer.">
        <input
          value={objectName}
          onChange={(e) => setObjectName(e.target.value)}
          placeholder="Küche & Esszimmer"
          className="grb-input"
        />
      </Field>

      <Field label="Bauteil / Bezeichnung" hint="Optional. Ein Eintrag pro Zeile — wird untereinander aufgelistet.">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={"Fronten\nKorpora\nSockelleisten"}
          rows={4}
          className="grb-input"
          style={{ resize: "vertical", minHeight: 96, fontFamily: "var(--font-sans)" }}
        />
      </Field>

      <Field label="Maße (mm)" hint="Optional. Länge / Breite / Höhe in Millimeter.">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg-muted)" }}>L</span>
            <input
              type="number"
              inputMode="numeric"
              value={lengthMm}
              onChange={(e) => setLengthMm(e.target.value)}
              placeholder="1234"
              className="grb-input"
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg-muted)" }}>B</span>
            <input
              type="number"
              inputMode="numeric"
              value={widthMm}
              onChange={(e) => setWidthMm(e.target.value)}
              placeholder="1234"
              className="grb-input"
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg-muted)" }}>H</span>
            <input
              type="number"
              inputMode="numeric"
              value={heightMm}
              onChange={(e) => setHeightMm(e.target.value)}
              placeholder="1234"
              className="grb-input"
            />
          </div>
        </div>
      </Field>

      <Field label="Gewicht (Freitext)" hint="Optional. Z. B. 85 kg.">
        <input
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="85 kg"
          className="grb-input"
          style={{ maxWidth: 320 }}
        />
      </Field>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={hidePackageCount}
            onChange={(e) => setHidePackageCount(e.target.checked)}
          />
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg)" }}>
            Packstück-Nummerierung ausblenden (ein einzelnes Etikett ohne „X von Y")
          </span>
        </label>

        {!hidePackageCount && (
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
              style={{ maxWidth: 320 }}
            />
          </Field>
        )}
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
        label="Mitarbeiter"
        hint="Aus der Mitarbeiterverwaltung."
        error={ownerError}
      >
        <select
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          className="grb-input"
          style={{ maxWidth: 320 }}
          required
        >
          <option value="">— wählen —</option>
          {employees.map((e) => (
            <option key={e.initials} value={e.initials}>
              {e.name} ({e.initials})
            </option>
          ))}
        </select>
      </Field>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
        <button
          type="submit"
          className="grb-btn grb-btn-primary"
          disabled={isSaving || isSaved}
          onClick={() => setSubmitAction("single")}
        >
          <Icon name="check" size={14} />
          {isSaved && submitAction === "single" ? "Weiterleitung..." : isSaving ? "Wird gespeichert..." : "Speichern & Vorschau öffnen"}
        </button>
        {!hidePackageCount && (
          <button
            type="submit"
            className="grb-btn grb-btn-ghost"
            disabled={isSaving || isSaved}
            onClick={() => setSubmitAction("range")}
          >
            <Icon name="print" size={14} />
            {isSaved && submitAction === "range" ? "Weiterleitung..." : "Alle Packstücke drucken"}
          </button>
        )}
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
