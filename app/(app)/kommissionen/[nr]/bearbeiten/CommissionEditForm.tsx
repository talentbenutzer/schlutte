"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Commission } from "@/lib/types";
import {
  updateCommissionAction,
  type CreateCommissionState,
} from "../../neu/actions";

export function CommissionEditForm({ commission }: { commission: Commission }) {
  const INITIAL: CreateCommissionState = {
    values: {
      no: commission.no,
      client: commission.client,
      project: commission.project,
      owner: commission.owner,
      note: commission.note || "",
    },
  };

  const [state, formAction, pending] = useActionState(
    updateCommissionAction,
    INITIAL
  );

  const v = state.values;
  const clientError =
    state.fieldError?.field === "client" ? state.fieldError.message : undefined;
  const ownerError =
    state.fieldError?.field === "owner" ? state.fieldError.message : undefined;

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

      {/* Hidden input for submit since visible input is disabled */}
      <input type="hidden" name="no" value={commission.no} />

      <Field
        label="Kommissionsnummer (Gesperrt)"
        hint="Die Kommissionsnummer kann nachträglich nicht geändert werden."
      >
        <input
          disabled
          value={commission.no}
          className="grb-input"
          style={{ maxWidth: 180, opacity: 0.6, cursor: "not-allowed" }}
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

      <Field
        label="Owner / Kürzel"
        hint="Mitarbeiterkürzel, maximal drei Buchstaben. Default: EDL."
        error={ownerError}
      >
        <input
          name="owner"
          defaultValue={v?.owner ?? ""}
          placeholder="EDL"
          maxLength={3}
          className="grb-input"
          style={{ maxWidth: 120, textTransform: "uppercase" }}
        />
      </Field>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
        <button type="submit" className="grb-btn grb-btn-primary" disabled={pending}>
          <Icon name="check" size={14} />
          {pending ? "Wird gespeichert…" : "Änderungen speichern"}
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
