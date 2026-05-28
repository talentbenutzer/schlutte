"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  createCommissionAction,
  type CreateCommissionState,
} from "./actions";

const INITIAL: CreateCommissionState = {};

export function CommissionForm() {
  const [state, formAction, pending] = useActionState(
    createCommissionAction,
    INITIAL
  );

  const v = state.values;
  const noError =
    state.fieldError?.field === "no" ? state.fieldError.message : undefined;
  const clientError =
    state.fieldError?.field === "client" ? state.fieldError.message : undefined;

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 640 }}>
      {state.error && (
        <div
          role="alert"
          style={{
            border: "1px solid var(--gd-danger)",
            color: "var(--gd-danger)",
            padding: "10px 14px",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
          }}
        >
          {state.error}
        </div>
      )}

      <Field
        label="Kommissionsnummer"
        hint="Pflichtfeld. Genau 6 Ziffern (z. B. 260051)."
        error={noError}
      >
        <input
          name="no"
          required
          autoFocus
          defaultValue={v?.no ?? ""}
          placeholder="260051"
          pattern="[0-9]{6}"
          title="Muss genau 6 Ziffern enthalten"
          className="grb-input"
          style={{ maxWidth: 180 }}
        />
      </Field>

      <Field
        label="Kunde"
        hint="Pflichtfeld. Wird im Hero groß angezeigt."
        error={clientError}
      >
        <input
          name="client"
          required
          defaultValue={v?.client ?? ""}
          placeholder="Familie Raitl"
          className="grb-input"
        />
      </Field>

      <Field
        label="Objekt"
        hint={'Optional. Z. B. „Küche & Esszimmer".'}
      >
        <input
          name="project"
          defaultValue={v?.project ?? ""}
          placeholder="Küche & Esszimmer"
          className="grb-input"
        />
      </Field>

      <Field
        label="Notiz / Interne Hinweise"
        hint="Optional. Besondere Hinweise für die Werkstatt."
      >
        <textarea
          name="note"
          defaultValue={v?.note ?? ""}
          placeholder="Hinweise zur Fertigung..."
          className="grb-input"
          style={{ minHeight: 100, resize: "vertical", fontFamily: "var(--font-sans)" }}
        />
      </Field>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
        <button type="submit" className="grb-btn grb-btn-primary" disabled={pending}>
          <Icon name="plus" size={14} />
          {pending ? "Wird angelegt…" : "Kommission anlegen"}
        </button>
        <Link href="/kommissionen" className="grb-btn grb-btn-quiet">
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
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span className="grb-eyebrow">{label}</span>
      {children}
      {hint && !error && (
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--fg-subtle)" }}>
          {hint}
        </span>
      )}
      {error && (
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--gd-danger)",
          }}
        >
          {error}
        </span>
      )}
    </label>
  );
}
