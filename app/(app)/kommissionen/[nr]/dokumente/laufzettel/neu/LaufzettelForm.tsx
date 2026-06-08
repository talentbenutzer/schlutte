"use client";

import "@/styles/print.css";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { Commission, LaufzettelFormData } from "@/lib/types";
import { STATIONS } from "@/mocks/data";
import { LaufzettelSheet } from "@/components/print/LaufzettelSheet";
import { saveLaufzettelAction } from "./actions";

// 297mm in CSS-px bei 96 dpi
const SHEET_WIDTH_PX = (297 * 96) / 25.4;

type EmployeeOption = { initials: string; name: string };

export function LaufzettelForm({
  commission,
  documentId,
  initialData,
  employees,
  currentInitials,
}: {
  commission: Commission;
  documentId?: string;
  initialData?: LaufzettelFormData;
  employees: EmployeeOption[];
  currentInitials?: string;
}) {
  const router = useRouter();
  const [client, setClient] = useState(initialData?.client || commission.client || "");
  const [project, setProject] = useState(initialData?.project || commission.project || "");
  const [note, setNote] = useState(initialData?.note || "");
  const [owner, setOwner] = useState(initialData?.employeeInitials || currentInitials || "");
  // Default: keine Stationen vorgewählt — der Nutzer hakt im Formular ab.
  const [selectedStations, setSelectedStations] = useState<string[]>(
    initialData?.stations ?? []
  );

  // Preview an die Spaltenbreite anpassen + tatsächliche Sheet-Höhe messen,
  // damit unter der Vorschau kein leerer weißer Bereich entsteht.
  const previewRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [previewScale, setPreviewScale] = useState(0.5);
  const [previewHeight, setPreviewHeight] = useState<number | null>(null);
  useEffect(() => {
    const outer = previewRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const update = () => {
      const w = outer.clientWidth;
      if (w <= 0) return;
      const s = w / SHEET_WIDTH_PX;
      setPreviewScale(s);
      // tatsächliche unskalierte Höhe des Sheet-Inhalts
      const sheet = inner.firstElementChild as HTMLElement | null;
      const h = sheet?.scrollHeight ?? inner.scrollHeight;
      if (h > 0) setPreviewHeight(h * s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    if (inner.firstElementChild) ro.observe(inner.firstElementChild as Element);
    return () => ro.disconnect();
  }, []);

  const [ownerError, setOwnerError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const toggleStation = (s: string) => {
    setSelectedStations((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (owner.length > 3) {
      setOwnerError("Mitarbeiterkürzel darf maximal 3 Zeichen lang sein.");
      return;
    }
    setOwnerError("");
    setIsSaving(true);
    setSaveError("");
    
    const payload: LaufzettelFormData = {
      client,
      project,
      note,
      employeeInitials: owner,
      stations: selectedStations,
    };

    const result = await saveLaufzettelAction(commission.no, payload, documentId);
    setIsSaving(false);

    if (result.error) {
      setSaveError(result.error);
      return;
    }

    setIsSaved(true);
    
    router.push(`/print/laufzettel/${commission.no}`);
    router.refresh();
  };

  // Live-Vorschau-Daten aus dem aktuellen Formularzustand
  const previewFormData: LaufzettelFormData = {
    client,
    project,
    note,
    employeeInitials: owner,
    stations: selectedStations,
  };
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 40, alignItems: "start" }}>
    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
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
          ✓ Laufzettel erfolgreich gespeichert! Weiterleitung...
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

      <Field label="Kommissionsnummer (vorausgefüllt)">
        <input
          disabled
          value={commission.no}
          className="grb-input"
          style={{ opacity: 0.6, cursor: "not-allowed", maxWidth: 180 }}
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Kunde" hint="Aus der Kommission vorausgefüllt — kann hier überschrieben werden.">
          <input
            value={client}
            onChange={(e) => setClient(e.target.value)}
            className="grb-input"
            placeholder={commission.client}
          />
        </Field>

        <Field label="Projekt" hint="Aus der Kommission vorausgefüllt — kann hier überschrieben werden.">
          <input
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="grb-input"
            placeholder={commission.project || "Optional"}
          />
        </Field>
      </div>

      <Field label="Notiz / Hinweis" hint="Optional. Erscheint auf dem Ausdruck für Sonderwünsche.">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Zusätzliche Fertigungshinweise..."
          className="grb-input"
          style={{ minHeight: 80, resize: "vertical", fontFamily: "var(--font-sans)" }}
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

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
          <span className="grb-eyebrow">Stationen · Werkstatt</span>
          <span className="grb-index">{selectedStations.length} / {STATIONS.length}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {STATIONS.map((s) => {
            const checked = selectedStations.includes(s);
            return (
              <label
                key={s}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleStation(s)}
                  style={{ display: "none" }}
                />
                <span
                  style={{
                    display: "inline-grid",
                    placeItems: "center",
                    width: 18,
                    height: 18,
                    border: checked ? "1.5px solid var(--fg)" : "1.5px solid var(--border-strong)",
                    background: checked ? "var(--fg)" : "transparent",
                    color: "var(--bg)",
                    transition: "all 120ms var(--ease-out)",
                  }}
                >
                  {checked && <Icon name="check" size={12} stroke={2.5} />}
                </span>
                {s}
              </label>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
        <button type="submit" className="grb-btn grb-btn-primary" disabled={isSaving || isSaved}>
          <Icon name="check" size={14} />
          {isSaved ? "Weiterleitung..." : isSaving ? "Wird gespeichert..." : "Speichern & Vorschau öffnen"}
        </button>
        <Link href={`/kommissionen/${commission.no}`} className="grb-btn grb-btn-quiet">
          Abbrechen
        </Link>
      </div>
    </form>

    {/* Live-Vorschau A4 Querformat */}
    <aside style={{ position: "sticky", top: 24, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <span className="grb-eyebrow">Live-Vorschau · A4 Querformat</span>
        <span className="grb-index">aktualisiert sich live</span>
      </div>
      <div
        ref={previewRef}
        style={{
          width: "100%",
          height: previewHeight ? `${previewHeight}px` : "auto",
          overflow: "hidden",
          position: "relative",
          border: "1px solid var(--border)",
          background: "#fff",
          colorScheme: "light",
        }}
      >
        <div
          ref={innerRef}
          style={{
            transform: `scale(${previewScale})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,
            width: `${SHEET_WIDTH_PX}px`,
          }}
        >
          <LaufzettelSheet
            commission={commission}
            stations={STATIONS}
            formData={previewFormData}
            printedBy={owner || commission.owner || "—"}
            printedAt={today}
          />
        </div>
      </div>
    </aside>
    </div>
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
