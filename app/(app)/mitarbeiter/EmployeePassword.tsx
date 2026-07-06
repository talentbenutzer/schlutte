"use client";

import { useActionState } from "react";
import { Icon } from "@/components/ui/Icon";
import { setPasswordAction } from "./actions";

type State = { error?: string; success?: string } | null;

export function EmployeePassword({
  employeeId,
  email,
}: {
  employeeId: string;
  email?: string;
}) {
  const boundAction = setPasswordAction.bind(null, employeeId);
  const [state, action, isPending] = useActionState<State, FormData>(
    boundAction,
    null
  );

  return (
    <section
      style={{
        marginTop: 40,
        paddingTop: 28,
        borderTop: "1px solid var(--border-strong)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div>
        <span className="grb-eyebrow">Zugang</span>
        <h2 className="grb-h-h2" style={{ fontSize: 22, marginTop: 6 }}>
          Login &amp; Passwort
        </h2>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg-muted)", marginTop: 8 }}>
          {email ? (
            <>
              Setzt bzw. ersetzt das Passwort für <strong>{email}</strong>. Existiert noch
              kein Login zu dieser E-Mail, wird er dabei angelegt.
            </>
          ) : (
            <>Für den Zugang zuerst oben eine E-Mail-Adresse hinterlegen und speichern.</>
          )}
        </p>
      </div>

      {state?.error && (
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
          ⚠ {state.error}
        </div>
      )}

      {state?.success && (
        <div
          role="status"
          style={{
            border: "1px solid var(--gd-success)",
            color: "var(--gd-success)",
            background: "var(--bg-alt)",
            padding: "12px 14px",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
          }}
        >
          ✓ {state.success}
        </div>
      )}

      <form action={action} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label
            htmlFor="new-password"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--fg-muted)" }}
          >
            Neues Passwort
          </label>
          <input
            id="new-password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            disabled={!email || isPending}
            placeholder="Mind. 8 Zeichen"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              padding: "10px 14px",
              border: "1px solid var(--border-strong)",
              background: "var(--bg)",
              color: "var(--fg)",
              width: 320,
              opacity: email ? 1 : 0.5,
            }}
          />
        </div>
        <button
          type="submit"
          className="grb-btn grb-btn-primary"
          disabled={!email || isPending}
        >
          <Icon name="check" size={14} />
          {isPending ? "Wird gesetzt …" : "Passwort setzen"}
        </button>
      </form>
    </section>
  );
}
