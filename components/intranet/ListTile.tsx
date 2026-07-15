"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UpcomingItem } from "@/lib/types";

type Result = { error?: string; success?: boolean };

export function ListTile({
  heading,
  items,
  isAdmin,
  textLabel,
  textPlaceholder,
  emptyText,
  onCreate,
  onUpdate,
  onDelete,
}: {
  heading: string;
  items: UpcomingItem[];
  isAdmin: boolean;
  textLabel: string;
  textPlaceholder: string;
  emptyText: string;
  onCreate: (text: string, date: string) => Promise<Result>;
  onUpdate: (id: string, text: string, date: string) => Promise<Result>;
  onDelete: (id: string) => Promise<Result>;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<null | "new" | string>(null);
  const [text, setText] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const list = items ?? [];
  const visible = expanded ? list : list.slice(0, 3);
  const extra = list.length - 3;

  const openNew = () => {
    setEditing("new");
    setText("");
    setDate("");
    setError("");
  };
  const openEdit = (it: UpcomingItem) => {
    setEditing(it.id);
    setText(it.text);
    setDate(it.dateISO);
    setError("");
  };
  const cancel = () => {
    setEditing(null);
    setError("");
  };

  const submit = () => {
    if (!text.trim() || !date) {
      setError("Bitte Bezeichnung und Datum angeben.");
      return;
    }
    setError("");
    startTransition(async () => {
      const res =
        editing === "new"
          ? await onCreate(text.trim(), date)
          : await onUpdate(editing as string, text.trim(), date);
      if (res.error) {
        setError(res.error);
        return;
      }
      setEditing(null);
      router.refresh();
    });
  };

  const remove = (id: string) => {
    if (!window.confirm("Diesen Eintrag wirklich löschen?")) return;
    setError("");
    startTransition(async () => {
      const res = await onDelete(id);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "var(--fg-muted)",
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: "var(--font-sans)",
    fontSize: 14,
    padding: "8px 10px",
    border: "1px solid var(--border-strong)",
    background: "var(--bg)",
    color: "var(--fg)",
    width: "100%",
  };

  return (
    <section
      style={{
        border: "1px solid var(--border-strong)",
        background: "var(--bg-alt)",
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Kopf */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 400,
            color: "var(--fg)",
            margin: 0,
          }}
        >
          {heading}
        </h3>
        {isAdmin && editing !== "new" && (
          <button
            onClick={openNew}
            disabled={isPending}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--accent)",
            }}
          >
            + Neu
          </button>
        )}
      </div>

      {error && (
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--gd-danger)" }}>
          ⚠ {error}
        </div>
      )}

      {/* Formular (Neu / Bearbeiten) */}
      {isAdmin && editing !== null && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "12px",
            border: "1px dashed var(--border-strong)",
            background: "var(--bg)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={labelStyle}>{textLabel}</span>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={textPlaceholder}
              style={inputStyle}
              autoFocus
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={labelStyle}>Datum</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              onClick={submit}
              disabled={isPending}
              className="grb-btn grb-btn-primary"
              style={{ fontSize: 12 }}
            >
              {isPending ? "Speichern …" : "Speichern"}
            </button>
            <button onClick={cancel} disabled={isPending} className="grb-btn grb-btn-quiet" style={{ fontSize: 12 }}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {list.length === 0 ? (
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--fg-subtle)" }}>
          {emptyText}
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
          {visible.map((it) => (
            <li
              key={it.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 0",
                borderTop: "1px solid var(--border)",
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                color: "var(--fg)",
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg)", whiteSpace: "nowrap" }}>
                {it.dateLabel}
              </span>
              <span style={{ color: "var(--fg-subtle)" }}>•</span>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {it.text}
              </span>
              <span style={{ color: "var(--fg-subtle)" }}>•</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-muted)", whiteSpace: "nowrap" }}>
                {it.daysLabel}
              </span>
              {isAdmin && (
                <span style={{ display: "inline-flex", gap: 2, marginLeft: 6 }}>
                  <button
                    onClick={() => openEdit(it)}
                    disabled={isPending}
                    title="Bearbeiten"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-muted)", padding: "2px 4px" }}
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => remove(it.id)}
                    disabled={isPending}
                    title="Löschen"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-subtle)", padding: "2px 4px" }}
                  >
                    ✕
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Alle anzeigen / weniger */}
      {list.length > 3 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            alignSelf: "flex-start",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--accent)",
            padding: 0,
          }}
        >
          {expanded ? "Weniger anzeigen" : `Alle anzeigen (${extra} weitere)`}
        </button>
      )}
    </section>
  );
}
