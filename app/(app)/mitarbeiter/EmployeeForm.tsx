"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { Employee } from "@/lib/types";
import { createEmployeeAction, updateEmployeeAction } from "./actions";

type State = { error?: string } | null;

export function EmployeeForm({
  employee,
}: {
  employee?: Employee;
}) {
  const isEditing = !!employee?.id;

  // Bind the id for update action
  const boundAction = isEditing
    ? updateEmployeeAction.bind(null, employee!.id!)
    : createEmployeeAction;

  const [state, action, isPending] = useActionState<State, FormData>(
    boundAction,
    null
  );

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {state?.error && (
        <div
          style={{
            background: "var(--bg-alt)",
            border: "1px solid var(--border-strong)",
            padding: "12px 16px",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--fg)",
          }}
        >
          ⚠ {state.error}
        </div>
      )}

      {/* Kürzel */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label
          htmlFor="emp-initials"
          style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--fg-muted)" }}
        >
          Kürzel *
        </label>
        <input
          id="emp-initials"
          name="initials"
          type="text"
          required
          maxLength={3}
          defaultValue={employee?.initials ?? ""}
          placeholder="z.B. EDL"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 16,
            padding: "10px 14px",
            border: "1px solid var(--border-strong)",
            background: "var(--bg)",
            color: "var(--fg)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            width: 120,
          }}
        />
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--fg-subtle)" }}>
          1–3 Buchstaben, wird automatisch großgeschrieben, muss eindeutig sein.
        </span>
      </div>

      {/* Name */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label
          htmlFor="emp-name"
          style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--fg-muted)" }}
        >
          Name *
        </label>
        <input
          id="emp-name"
          name="name"
          type="text"
          required
          defaultValue={employee?.name ?? ""}
          placeholder="Vollständiger Name"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            padding: "10px 14px",
            border: "1px solid var(--border-strong)",
            background: "var(--bg)",
            color: "var(--fg)",
            maxWidth: 400,
          }}
        />
      </div>

      {/* E-Mail */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label
          htmlFor="emp-email"
          style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--fg-muted)" }}
        >
          E-Mail (optional)
        </label>
        <input
          id="emp-email"
          name="email"
          type="email"
          defaultValue={employee?.email ?? ""}
          placeholder="max@grabner-design.at"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            padding: "10px 14px",
            border: "1px solid var(--border-strong)",
            background: "var(--bg)",
            color: "var(--fg)",
            maxWidth: 400,
          }}
        />
      </div>

      {/* Admin + Aktiv */}
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14 }}>
          <input
            type="checkbox"
            name="is_admin"
            value="true"
            defaultChecked={employee?.is_admin ?? false}
          />
          Rolle: Administrator (ohne Haken: Mitarbeiter)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14 }}>
          <input
            type="checkbox"
            name="is_active"
            value="true"
            defaultChecked={employee?.is_active !== false}
          />
          Aktiv
        </label>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button
          type="submit"
          className="grb-btn grb-btn-primary"
          disabled={isPending}
        >
          <Icon name="check" size={14} />
          {isPending
            ? "Wird gespeichert …"
            : isEditing
            ? "Änderungen speichern"
            : "Mitarbeiter anlegen"}
        </button>
        <Link href="/mitarbeiter" className="grb-btn grb-btn-ghost">
          Abbrechen
        </Link>
      </div>
    </form>
  );
}
