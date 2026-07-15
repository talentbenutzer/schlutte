"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { Commission, PaletteFormData, PalettePackage } from "@/lib/types";
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

  // Shared (gilt für alle Packstücke gleich)
  const [count, setCount] = useState<number>(initialData?.packageCount || 1);
  const [hidePackageCount, setHidePackageCount] = useState<boolean>(
    initialData?.hidePackageCount ?? false
  );
  const [owner, setOwner] = useState(initialData?.employeeInitials || currentInitials || "");

  // Pro-Packstück-Daten. Init aus initialData.packages ODER aus den Top-Level-Legacy-Werten,
  // die dann für alle N Packstücke als Standard übernommen werden.
  const [packages, setPackages] = useState<PalettePackage[]>(() => {
    const initCount = initialData?.packageCount || 1;
    const defaults: PalettePackage = {
      objectName:
        initialData?.objectName ?? (documentId ? "" : commission.project ?? "") ?? "",
      content: initialData?.content ?? "",
      lengthMm: initialData?.lengthMm ?? "",
      widthMm: initialData?.widthMm ?? "",
      heightMm: initialData?.heightMm ?? "",
      weight: initialData?.weight ?? "",
      shippingNote: initialData?.shippingNote ?? "",
    };
    return Array.from({ length: initCount }, (_, i) => ({
      ...defaults,
      ...(initialData?.packages?.[i] ?? {}),
    }));
  });
  const [activeIdx, setActiveIdx] = useState(0);
  const [submitAction, setSubmitAction] = useState<"single" | "range">("single");

  const [countError, setCountError] = useState("");
  const [ownerError, setOwnerError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Anzahl der Packstücke ändern → Array wächst/schrumpft (bestehende Einträge bleiben).
  const changeCount = (n: number) => {
    const newCount = Math.max(1, Number.isFinite(n) ? n : 1);
    setCount(newCount);
    setPackages((prev) => {
      if (prev.length === newCount) return prev;
      if (prev.length < newCount) {
        const tmpl = prev[prev.length - 1] ?? {};
        return [
          ...prev,
          ...Array.from({ length: newCount - prev.length }, () => ({ ...tmpl })),
        ];
      }
      return prev.slice(0, newCount);
    });
    setActiveIdx((idx) => Math.min(idx, Math.max(0, newCount - 1)));
  };

  const effectiveIdx = hidePackageCount ? 0 : activeIdx;
  const active = packages[effectiveIdx] ?? {};
  const setActive = (field: keyof PalettePackage, value: string) => {
    setPackages((prev) => {
      const next = [...prev];
      next[effectiveIdx] = { ...next[effectiveIdx], [field]: value };
      return next;
    });
  };

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

    // Bei hidePackageCount = true wird genau ein Etikett erzeugt.
    const outPackages = packages.slice(0, effectiveCount);
    const first = outPackages[0] ?? {};

    const payload: PaletteFormData = {
      packageCount: effectiveCount,
      hidePackageCount,
      employeeInitials: owner,
      // Legacy/Default (erstes Packstück als Fallback für alte Renderer)
      objectName: first.objectName,
      content: first.content,
      lengthMm: first.lengthMm,
      widthMm: first.widthMm,
      heightMm: first.heightMm,
      weight: first.weight,
      shippingNote: first.shippingNote,
      // Pro-Packstück-Werte
      packages: outPackages,
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
      // Aktuell gewählten Zettel öffnen (nicht zwingend #1) — 1-indexiert.
      const targetIdx = Math.min(activeIdx + 1, effectiveCount);
      router.push(`/print/palette/document/${docId}/${targetIdx}`);
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

      {/* Vorschau Nummernsequenz — klickbar: wechselt das gerade bearbeitete Packstück. */}
      {!hidePackageCount && count > 0 && (
        <div style={{ border: "1px solid var(--border)", padding: 16, background: "var(--bg-alt)" }}>
          <span className="grb-eyebrow" style={{ display: "block", marginBottom: 8 }}>Vorschau Nummernsequenz</span>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--fg-muted)" }}>
            Es werden {count} Palettenzettel erzeugt. Klick einen Zettel an, um dessen Felder zu bearbeiten.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {Array.from({ length: count }).map((_, i) => {
              const isActive = i === activeIdx;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    letterSpacing: "0.06em",
                    padding: "6px 12px",
                    background: isActive ? "var(--fg)" : "transparent",
                    color: isActive ? "var(--fg-inverse)" : "var(--fg)",
                    border: `1px solid ${isActive ? "var(--fg)" : "var(--border-strong)"}`,
                    cursor: "pointer",
                  }}
                >
                  {i + 1} von {count}
                </button>
              );
            })}
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

      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--fg-subtle)",
        }}
      >
        {hidePackageCount
          ? "Felder für dieses Etikett"
          : `Felder für Zettel ${activeIdx + 1} von ${count}`}
      </div>

      <Field label="Objektbezeichnung" hint="Pro Zettel individuell.">
        <input
          value={active.objectName ?? ""}
          onChange={(e) => setActive("objectName", e.target.value)}
          placeholder="Küche & Esszimmer"
          className="grb-input"
        />
      </Field>

      <Field label="Bauteil / Bezeichnung" hint="Pro Zettel individuell. Ein Eintrag pro Zeile.">
        <textarea
          value={active.content ?? ""}
          onChange={(e) => setActive("content", e.target.value)}
          placeholder={"Fronten\nKorpora\nSockelleisten"}
          rows={4}
          className="grb-input"
          style={{ resize: "vertical", minHeight: 96, fontFamily: "var(--font-sans)" }}
        />
      </Field>

      <Field label="Maße (mm)" hint="Pro Zettel individuell. Länge / Breite / Höhe.">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg-muted)" }}>L</span>
            <input
              type="number"
              inputMode="numeric"
              value={active.lengthMm ?? ""}
              onChange={(e) => setActive("lengthMm", e.target.value)}
              placeholder="1234"
              className="grb-input"
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg-muted)" }}>B</span>
            <input
              type="number"
              inputMode="numeric"
              value={active.widthMm ?? ""}
              onChange={(e) => setActive("widthMm", e.target.value)}
              placeholder="1234"
              className="grb-input"
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg-muted)" }}>H</span>
            <input
              type="number"
              inputMode="numeric"
              value={active.heightMm ?? ""}
              onChange={(e) => setActive("heightMm", e.target.value)}
              placeholder="1234"
              className="grb-input"
            />
          </div>
        </div>
      </Field>

      <Field label="Gewicht (Freitext)" hint="Pro Zettel individuell. Z. B. 85 kg.">
        <input
          value={active.weight ?? ""}
          onChange={(e) => setActive("weight", e.target.value)}
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
              onChange={(e) => changeCount(Number(e.target.value))}
              placeholder="1"
              className="grb-input"
              style={{ maxWidth: 320 }}
            />
          </Field>
        )}
      </div>

      <Field label="Versandhinweis" hint="Pro Zettel individuell (z. B. Fragile, Trocken lagern).">
        <input
          value={active.shippingNote ?? ""}
          onChange={(e) => setActive("shippingNote", e.target.value)}
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
          {isSaved && submitAction === "single"
            ? "Weiterleitung..."
            : isSaving
            ? "Wird gespeichert..."
            : hidePackageCount
            ? "Speichern & Vorschau öffnen"
            : `Speichern & Zettel ${activeIdx + 1} drucken`}
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
