"use client";

import { useActionState } from "react";
import { Icon } from "@/components/ui/Icon";
import { submitFeedbackAction } from "./actions";

type State = { error?: string; success?: boolean } | null;

const CATEGORIES = [
  { value: "fehler", label: "Fehler" },
  { value: "verbesserung", label: "Verbesserung" },
  { value: "wunsch", label: "Wunsch" },
  { value: "sonstiges", label: "Sonstiges" },
];

export function FeedbackForm({ currentPath }: { currentPath?: string }) {
  const [state, action, isPending] = useActionState<State, FormData>(
    submitFeedbackAction,
    null
  );

  if (state?.success) {
    return (
      <div
        style={{
          border: "1px solid var(--border-strong)",
          padding: "24px 28px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <Icon name="check" size={20} style={{ color: "var(--accent)" }} />
        <div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              fontWeight: 500,
              color: "var(--fg)",
            }}
          >
            Danke, das Feedback wurde gespeichert.
          </div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--fg-muted)",
              marginTop: 4,
            }}
          >
            Eddy wird sich melden.
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Hidden: current path */}
      <input type="hidden" name="current_path" value={currentPath ?? ""} />

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

      {/* Kategorie */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label
          htmlFor="feedback-category"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--fg-muted)",
          }}
        >
          Kategorie (optional)
        </label>
        <select
          id="feedback-category"
          name="category"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            padding: "9px 14px",
            border: "1px solid var(--border-strong)",
            background: "var(--bg)",
            color: "var(--fg)",
            maxWidth: 280,
          }}
        >
          <option value="">— Keine Angabe —</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Nachricht */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label
          htmlFor="feedback-message"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--fg-muted)",
          }}
        >
          Nachricht *
        </label>
        <textarea
          id="feedback-message"
          name="message"
          required
          rows={6}
          placeholder="Was ist aufgefallen? Was fehlt? Was könnte besser sein?"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            padding: "10px 14px",
            border: "1px solid var(--border-strong)",
            background: "var(--bg)",
            color: "var(--fg)",
            resize: "vertical",
            maxWidth: 680,
            lineHeight: 1.6,
          }}
        />
      </div>

      <div>
        <button
          type="submit"
          className="grb-btn grb-btn-primary"
          disabled={isPending}
        >
          <Icon name="arrow" size={14} />
          {isPending ? "Wird gesendet …" : "Feedback senden"}
        </button>
      </div>
    </form>
  );
}
