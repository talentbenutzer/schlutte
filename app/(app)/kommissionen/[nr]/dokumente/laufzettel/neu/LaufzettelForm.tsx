"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { Commission, LaufzettelFormData } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { saveLaufzettelAction } from "./actions";

export function LaufzettelForm({
  commission,
  documentId,
  initialData,
}: {
  commission: Commission;
  documentId?: string;
  initialData?: LaufzettelFormData;
}) {
  const router = useRouter();
  const [project, setProject] = useState(commission.project || "");
  const [room, setRoom] = useState(initialData?.area || "");
  const [partName, setPartName] = useState(initialData?.componentName || "");
  const [material, setMaterial] = useState(initialData?.material || "");
  const [surface, setSurface] = useState(initialData?.surface || "");
  const [note, setNote] = useState(initialData?.note || "");
  const [owner, setOwner] = useState(initialData?.employeeInitials || commission.owner || "EDL");
  const [selectedComponents, setSelectedComponents] = useState<string[]>(initialData?.categories || []);
  
  const [ownerError, setOwnerError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const supabase = createClient();

  useEffect(() => {
    if (initialData?.employeeInitials) return;
    let active = true;
    const loadUserKuerzel = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active || !user) return;
      
      const { data } = await supabase
        .from("employees")
        .select("initials")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;
      if (data?.initials) {
        setOwner(data.initials);
      } else if (user.email) {
        setOwner(user.email.slice(0, 3).toUpperCase());
      }
    };
    loadUserKuerzel();
    return () => {
      active = false;
    };
  }, [supabase, initialData]);

  const COMPONENTS = [
    "Seiten",
    "Sockel",
    "RW-Schub",
    "Boden / Deckel",
    "Fronten",
    "Boden-Schub",
    "Traverse",
    "Blenden",
    "Rückwände",
    "UK",
    "Fachböden",
    "Konstruktionsböden",
    "Sonstiges",
  ];

  const handleComponentChange = (comp: string) => {
    if (selectedComponents.includes(comp)) {
      setSelectedComponents(selectedComponents.filter((c) => c !== comp));
    } else {
      setSelectedComponents([...selectedComponents, comp]);
    }
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
      area: room,
      componentName: partName,
      material,
      surface,
      note,
      employeeInitials: owner,
      categories: selectedComponents,
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
        <Field label="Bereich / Raum" hint="Optional. Z. B. Erdgeschoss / Küche.">
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="Erdgeschoss / Küche"
            className="grb-input"
          />
        </Field>

        <Field label="Bauteil / Bezeichnung" hint="Optional. Z. B. Kücheninsel & Zeile.">
          <input
            value={partName}
            onChange={(e) => setPartName(e.target.value)}
            placeholder="Kücheninsel & Zeile"
            className="grb-input"
          />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Material" hint="Optional. Z. B. Eiche furniert.">
          <input
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            placeholder="Eiche furniert"
            className="grb-input"
          />
        </Field>

        <Field label="Oberfläche" hint="Optional. Z. B. Natur matt lackiert.">
          <input
            value={surface}
            onChange={(e) => setSurface(e.target.value)}
            placeholder="Natur matt lackiert"
            className="grb-input"
          />
        </Field>
      </div>

      <Field label="Hinweis / Freitext" hint="Optional. Erscheint auf dem Ausdruck für Sonderwünsche.">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Zusätzliche Fertigungshinweise..."
          className="grb-input"
          style={{ minHeight: 80, resize: "vertical", fontFamily: "var(--font-sans)" }}
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

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
        <span className="grb-eyebrow" style={{ display: "block", marginBottom: 12 }}>Bauteil-Komponenten</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {COMPONENTS.map((comp) => {
            const checked = selectedComponents.includes(comp);
            return (
              <label
                key={comp}
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
                  onChange={() => handleComponentChange(comp)}
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
                {comp}
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
