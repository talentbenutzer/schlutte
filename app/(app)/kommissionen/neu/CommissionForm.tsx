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
        label="Kunde"
        hint="Pflichtfeld. Wird im Hero groß angezeigt."
        error={clientError}
      >
        <input
          name="client"
          required
          autoFocus
          defaultValue={v?.client ?? ""}
          placeholder="Familie Raitl"
          className="grb-input"
        />
      </Field>

      <Field
        label="Bauteil · Objekt"
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
        label="Owner"
        hint="Kürzel, drei Buchstaben. Default: EDL."
      >
        <input
          name="owner"
          defaultValue={v?.owner ?? ""}
          placeholder="EDL"
          maxLength={4}
          className="grb-input"
          style={{ maxWidth: 120, textTransform: "uppercase" }}
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

      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.12em",
          color: "var(--fg-subtle)",
          textTransform: "uppercase",
          marginTop: 4,
        }}
      >
        Mock-Backend · Daten leben nur im Speicher des Servers
      </p>
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
