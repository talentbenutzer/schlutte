"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import type { FeedbackEntry, FeedbackStatus } from "@/lib/types";
import { updateStatusAction, saveResponseAction } from "./actions";
import { formatDate } from "@/lib/utils";

const STATUS_LABEL: Record<FeedbackStatus, string> = {
  offen: "Offen",
  beantwortet: "Beantwortet",
  erledigt: "Erledigt",
};

const CATEGORY_LABEL: Record<string, string> = {
  fehler: "Fehler",
  verbesserung: "Verbesserung",
  wunsch: "Wunsch",
  sonstiges: "Sonstiges",
};

function StatusBadge({ status }: { status: FeedbackStatus }) {
  const color =
    status === "erledigt"
      ? "var(--fg-subtle)"
      : status === "beantwortet"
      ? "var(--accent)"
      : "var(--fg)";
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color,
        border: `1px solid ${color}`,
        padding: "2px 8px",
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function FeedbackRow({ entry }: { entry: FeedbackEntry }) {
  const [expanded, setExpanded] = useState(false);
  const [response, setResponse] = useState(entry.response_text ?? "");
  const [isPending, startTransition] = useTransition();

  const handleStatus = (status: FeedbackStatus) => {
    startTransition(async () => {
      await updateStatusAction(entry.id, status);
    });
  };

  const handleSaveResponse = () => {
    startTransition(async () => {
      await saveResponseAction(entry.id, {
        response_text: response,
        status: "beantwortet",
      });
      setExpanded(false);
    });
  };

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        marginBottom: 10,
        opacity: isPending ? 0.6 : entry.status === "erledigt" ? 0.6 : 1,
      }}
    >
      {/* Row header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
          padding: "14px 18px",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 6,
            }}
          >
            <StatusBadge status={entry.status} />
            {entry.category && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--fg-subtle)",
                }}
              >
                {CATEGORY_LABEL[entry.category] ?? entry.category}
              </span>
            )}
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--fg-subtle)",
                marginLeft: "auto",
              }}
            >
              {formatDate(entry.created_at)}
              {entry.created_by_initials && ` · ${entry.created_by_initials}`}
              {!entry.created_by_initials && entry.created_by_email && ` · ${entry.created_by_email}`}
            </span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "var(--fg)",
              lineHeight: 1.55,
            }}
          >
            {entry.message}
          </div>
          {entry.response_text && (
            <div
              style={{
                marginTop: 10,
                paddingTop: 10,
                borderTop: "1px solid var(--hairline)",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--fg-muted)",
                fontStyle: "italic",
              }}
            >
              <strong style={{ fontStyle: "normal", color: "var(--accent)" }}>
                Eddy:
              </strong>{" "}
              {entry.response_text}
            </div>
          )}
        </div>
        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0 }}>
          {entry.status !== "erledigt" && (
            <button
              className="grb-btn-link"
              style={{ fontSize: 11 }}
              onClick={() => handleStatus("erledigt")}
              disabled={isPending}
            >
              <Icon name="check" size={12} /> Erledigt
            </button>
          )}
          {entry.status === "offen" && (
            <button
              className="grb-btn-link"
              style={{ fontSize: 11 }}
              onClick={() => handleStatus("beantwortet")}
              disabled={isPending}
            >
              <Icon name="arrow" size={12} /> Beantwortet
            </button>
          )}
          <button
            className="grb-btn-link"
            style={{ fontSize: 11 }}
            onClick={() => setExpanded(!expanded)}
          >
            <Icon name="edit" size={12} /> Antwort
          </button>
        </div>
      </div>

      {/* Response panel */}
      {expanded && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: "14px 18px",
            background: "var(--bg-alt)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            rows={3}
            placeholder="Antwort von Eddy …"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              padding: "8px 12px",
              border: "1px solid var(--border-strong)",
              background: "var(--bg)",
              color: "var(--fg)",
              resize: "vertical",
              width: "100%",
            }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="grb-btn grb-btn-primary"
              onClick={handleSaveResponse}
              disabled={isPending || !response.trim()}
              style={{ fontSize: 12, padding: "6px 14px" }}
            >
              <Icon name="check" size={12} /> Antwort speichern
            </button>
            <button
              className="grb-btn grb-btn-ghost"
              onClick={() => setExpanded(false)}
              style={{ fontSize: 12, padding: "6px 14px" }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function FeedbackList({ entries }: { entries: FeedbackEntry[] }) {
  const open = entries.filter((e) => e.status === "offen");
  const answered = entries.filter((e) => e.status === "beantwortet");
  const done = entries.filter((e) => e.status === "erledigt");

  if (entries.length === 0) {
    return (
      <div
        style={{
          border: "1px dashed var(--border-strong)",
          padding: "24px 28px",
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          color: "var(--fg-muted)",
        }}
      >
        Noch kein Feedback eingegangen.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {open.length > 0 && (
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--fg-subtle)",
              marginBottom: 10,
            }}
          >
            Offen · {open.length}
          </div>
          {open.map((e) => (
            <FeedbackRow key={e.id} entry={e} />
          ))}
        </div>
      )}
      {answered.length > 0 && (
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--fg-subtle)",
              marginBottom: 10,
            }}
          >
            Beantwortet · {answered.length}
          </div>
          {answered.map((e) => (
            <FeedbackRow key={e.id} entry={e} />
          ))}
        </div>
      )}
      {done.length > 0 && (
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--fg-subtle)",
              marginBottom: 10,
            }}
          >
            Erledigt · {done.length}
          </div>
          {done.map((e) => (
            <FeedbackRow key={e.id} entry={e} />
          ))}
        </div>
      )}
    </div>
  );
}
