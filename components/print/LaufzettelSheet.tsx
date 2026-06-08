import { A4Sheet, PrintHeader } from "@/components/print/A4Sheet";
import type { Commission, LaufzettelFormData } from "@/lib/types";

const INK = "#0E0E0D";
const STONE = "#5C5852";
const SUBTLE = "#8A8278";
const HAIRLINE = "rgba(14,14,13,.18)";

export function LaufzettelSheet({
  commission,
  stations,
  formData,
  printedBy,
  printedAt,
}: {
  commission: Commission;
  /** Vollständige Stationen-Liste — alle werden immer gerendert. */
  stations: string[];
  /** Ausgewählte Stationen erscheinen abgehakt + fett. */
  formData?: LaufzettelFormData;
  printedBy: string;
  printedAt: string;
}) {
  const checkedSet = new Set(formData?.stations ?? []);

  return (
    <A4Sheet>
      <PrintHeader printedBy={printedBy} printedAt={printedAt} />

      {/* TOP — Kommissionsnummer auf voller Sheet-Breite */}
      <div
        style={{
          marginTop: 10,
          containerType: "inline-size",
        }}
      >
        <div className="print-eyebrow" style={{ marginBottom: 2 }}>Kommission</div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 300,
            fontSize: "clamp(120px, 21cqi, 230px)",
            color: INK,
            letterSpacing: "-0.03em",
            lineHeight: 0.9,
          }}
        >
          {commission.no}
        </div>
      </div>

      {/* Durchgezogene Trennlinie über die ganze Sheet-Breite */}
      <div style={{ borderTop: `1px solid ${INK}`, marginTop: 12 }} />

      {/* BOTTOM — 2 Spalten: 2/3 (Kunde) · 1/3 (Stationen) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 24,
          flex: 1,
          paddingTop: 10,
        }}
      >
        {/* LEFT (2/3) — Kunde, Projekt, Mitarbeiter/Datum */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div className="print-label" style={{ marginBottom: 2 }}>Kunde</div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 400,
                fontSize: 40,
                color: INK,
                letterSpacing: "-0.01em",
                lineHeight: 1.0,
              }}
            >
              {commission.client}
            </div>
            {commission.project && (
              <>
                <div className="print-label" style={{ marginTop: 10, marginBottom: 2 }}>Projekt</div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    fontWeight: 400,
                    fontSize: 40,
                    color: STONE,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.0,
                  }}
                >
                  {commission.project}
                </div>
              </>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, borderTop: `1px solid ${HAIRLINE}`, paddingTop: 8 }}>
            <div>
              <div className="print-label">Mitarbeiter</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: INK, marginTop: 2, letterSpacing: "0.06em", fontWeight: 500 }}>
                {formData?.employeeInitials || commission.owner || "—"}
              </div>
            </div>
            <div>
              <div className="print-label">Datum</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: INK, marginTop: 2 }}>
                {printedAt}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT (1/3) — Stationen (immer alle) + Notiz */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            paddingLeft: 18,
            borderLeft: `1px solid ${INK}`,
          }}
        >
          <section>
            <div className="print-label" style={{ marginBottom: 6 }}>Stationen · Werkstatt</div>
            <ul style={{ display: "flex", flexDirection: "column", gap: 5, margin: 0, padding: 0, listStyle: "none" }}>
              {stations.map((s) => {
                const checked = checkedSet.has(s);
                return (
                  <li
                    key={s}
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      color: INK,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontWeight: checked ? 700 : 400,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-grid",
                        placeItems: "center",
                        width: 14,
                        height: 14,
                        border: `1.5px solid ${INK}`,
                        background: checked ? INK : "transparent",
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      {checked && (
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12.5 9.5 17 19 7.5" />
                        </svg>
                      )}
                    </span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section
            style={{
              borderTop: `1px solid ${HAIRLINE}`,
              paddingTop: 8,
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div className="print-label" style={{ marginBottom: 4 }}>
              {formData?.note ? "Notiz" : "Notiz · handschriftlich"}
            </div>
            <div
              style={{
                flex: 1,
                border: `1px dashed rgba(14,14,13,.30)`,
                minHeight: 50,
                padding: "6px 10px",
                fontSize: 11,
                color: formData?.note ? INK : SUBTLE,
                fontFamily: "var(--font-sans)",
                whiteSpace: "pre-wrap",
                lineHeight: 1.4,
              }}
            >
              {formData?.note || "Ergänzungen zu Kanten, Beschlägen, Sondermaßen …"}
            </div>
          </section>
        </div>
      </div>

      <footer
        style={{
          marginTop: 10,
          paddingTop: 6,
          borderTop: `1px solid ${HAIRLINE}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          color: SUBTLE,
          letterSpacing: "0.1em",
        }}
      >
        <span>Schlutte · Laufzettel</span>
        <span>{commission.no}</span>
      </footer>
    </A4Sheet>
  );
}
