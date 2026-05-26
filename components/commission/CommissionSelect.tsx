"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { Commission } from "@/lib/types";

export function CommissionSelect({
  commissions,
  documentType,
}: {
  commissions: Commission[];
  documentType: "laufzettel" | "palette";
}) {
  const [query, setQuery] = useState("");

  const filtered = commissions.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.no.includes(q) ||
      c.client.toLowerCase().includes(q) ||
      c.project.toLowerCase().includes(q)
    );
  });

  const getFormUrl = (no: string) => {
    return `/kommissionen/${no}/dokumente/${documentType}/neu`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 640 }}>
      {/* Search Input */}
      <div className="grb-search-big" style={{ padding: "14px 18px" }}>
        <Icon name="search" size={18} style={{ color: "var(--fg-muted)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Kommissionsnummer oder Kunde suchen..."
          className="grb-input"
          style={{ border: "none", padding: 0, fontSize: 18, background: "transparent" }}
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--fg-muted)" }}
          >
            <Icon name="x" size={16} />
          </button>
        )}
      </div>

      {/* Results List */}
      <div style={{ border: "1px solid var(--border)", background: "var(--bg-raised)" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "24px 28px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg)", fontWeight: 500 }}>
              Keine Kommission gefunden.
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--fg-muted)", marginTop: 4, marginBottom: 16 }}>
              Möchten Sie eine neue Kommission mit dieser Nummer anlegen?
            </div>
            <Link
              href="/kommissionen/neu"
              className="grb-btn grb-btn-primary"
              style={{ fontSize: 11 }}
            >
              <Icon name="plus" size={12} /> Neue Kommission anlegen
            </Link>
          </div>
        ) : (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "100px 1fr auto",
                padding: "10px 18px",
                borderBottom: "1px solid var(--border)",
                background: "var(--bg-alt)",
              }}
            >
              <span className="grb-eyebrow">Nr.</span>
              <span className="grb-eyebrow">Kunde · Projekt</span>
              <span className="grb-eyebrow" style={{ textAlign: "right" }}>Aktion</span>
            </div>
            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {filtered.map((c) => (
                <Link
                  key={c.no}
                  href={getFormUrl(c.no)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "100px 1fr auto",
                    alignItems: "center",
                    padding: "12px 18px",
                    borderBottom: "1px solid var(--hairline)",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                  className="grb-table-row-hover"
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500, letterSpacing: "0.04em" }}>
                    {c.no}
                  </span>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--fg)" }}>
                      {c.client}
                    </div>
                    {c.project && (
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--fg-muted)", marginTop: 1 }}>
                        {c.project}
                      </div>
                    )}
                  </div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500, color: "var(--accent)" }}>
                    Auswählen <Icon name="arrow" size={12} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
