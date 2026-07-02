import { A4Sheet, PrintHeader } from "@/components/print/A4Sheet";
import type { Commission, Palette } from "@/lib/types";

// Druck: nur 100 % Schwarz, keine Grautöne.
const INK = "#000";
const STONE = "#000";
const SUBTLE = "#000";
const HAIRLINE = "#000";

export function PaletteSheet({
  commission,
  palette,
  printedBy,
  printedAt,
}: {
  commission: Commission;
  palette: Palette;
  printedBy: string;
  printedAt: string;
}) {
  // Objektbezeichnung: pro Palette überschreibbar, sonst Projekt der Kommission.
  const objectLabel = palette.objectName?.trim() || commission.project || "";
  // Inhalt: mehrzeilig — ein Eintrag pro Zeile, untereinander aufgelistet.
  const contentItems = (palette.content || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <A4Sheet>
      <PrintHeader
        printedBy={printedBy}
        printedAt={printedAt}
        logoSrc="/brand/grabner-logo.svg"
        logoAlt="Grabner"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.05fr 1fr",
          gap: 28,
          flex: 1,
          marginTop: 16,
        }}
      >
        {/* LEFT — dominante Zahlen */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div className="print-eyebrow" style={{ marginBottom: 4 }}>Kommission</div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 300,
                fontSize: 210,
                color: INK,
                letterSpacing: "-0.03em",
                lineHeight: 0.92,
              }}
            >
              {commission.no}
            </div>
          </div>

          {!palette.hidePackageCount && (
            <div>
              <div className="print-eyebrow" style={{ marginBottom: 4 }}>Packstück</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 300,
                    fontSize: 200,
                    color: INK,
                    letterSpacing: "-0.02em",
                    lineHeight: 0.9,
                  }}
                >
                  {palette.idx}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 200,
                    fontSize: 90,
                    color: STONE,
                    letterSpacing: "-0.02em",
                    fontStyle: "italic",
                  }}
                >
                  von {palette.total}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Details */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            paddingLeft: 24,
            borderLeft: `1px solid ${INK}`,
          }}
        >
          <section>
            <div className="print-label" style={{ marginBottom: 4 }}>Kunde</div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 400,
                fontSize: 44,
                color: INK,
                letterSpacing: "-0.01em",
                lineHeight: 1.04,
              }}
            >
              {commission.client}
            </div>
          </section>

          {objectLabel && (
            <section style={{ borderTop: `1px solid ${HAIRLINE}`, paddingTop: 10 }}>
              <div className="print-label" style={{ marginBottom: 4 }}>Objektbezeichnung</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 22, color: INK, lineHeight: 1.2 }}>
                {objectLabel}
              </div>
            </section>
          )}

          {contentItems.length > 0 && (
            <section style={{ borderTop: `1px solid ${HAIRLINE}`, paddingTop: 10 }}>
              <div className="print-label" style={{ marginBottom: 4 }}>Bauteil / Bezeichnung</div>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {contentItems.map((item, i) => (
                  <li
                    key={i}
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 18,
                      color: INK,
                      lineHeight: 1.3,
                      fontWeight: 500,
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    <span aria-hidden style={{ flexShrink: 0 }}>·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {palette.shippingNote && (
            <section style={{ borderTop: `1px solid ${HAIRLINE}`, paddingTop: 10 }}>
              <div className="print-label" style={{ marginBottom: 4 }}>Versandhinweis</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 16, color: INK, fontWeight: 500, lineHeight: 1.3 }}>
                {palette.shippingNote}
              </div>
            </section>
          )}

          {/* Maße & Gewicht — unten ausgerichtet, untereinander, groß. Leere Angaben ausgeblendet. */}
          {(palette.dim || palette.weight) && (
            <section
              style={{
                marginTop: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                borderTop: `1px solid ${HAIRLINE}`,
                paddingTop: 12,
              }}
            >
              {palette.dim && (
                <div>
                  <div className="print-label">Maße</div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 32,
                      color: INK,
                      marginTop: 4,
                      lineHeight: 1.15,
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    {palette.dim.split("\n").map((line, i) => (
                      <span key={i}>{line}</span>
                    ))}
                  </div>
                </div>
              )}
              {palette.weight && (
                <div>
                  <div className="print-label">Gewicht</div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: 40, color: INK, marginTop: 4, fontWeight: 500, lineHeight: 1.0 }}>
                    {palette.weight}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      <footer
        style={{
          marginTop: 14,
          paddingTop: 10,
          borderTop: `1px solid ${HAIRLINE}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: SUBTLE,
          letterSpacing: "0.1em",
        }}
      >
        <span>Schlutte · Palettenbeschriftung</span>
        <span>
          {commission.no}
          {!palette.hidePackageCount && ` · Packstück ${palette.idx} / ${palette.total}`}
        </span>
      </footer>
    </A4Sheet>
  );
}
