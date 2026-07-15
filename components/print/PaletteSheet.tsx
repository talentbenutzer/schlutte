import { A4Sheet, PrintHeader } from "@/components/print/A4Sheet";
import { FitText } from "@/components/print/FitText";
import { FitLines } from "@/components/print/FitLines";
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
          // Linke Spalte = Breite der Kommissionsnummer (auto/inhaltsbasiert),
          // rechte Spalte nimmt den Rest (1fr).
          gridTemplateColumns: "auto 1fr",
          gap: 28,
          flex: 1,
          // Wichtig: erlaubt dem Grid im Flex-Column-Sheet zu schrumpfen —
          // sonst schiebt zu viel Content den Footer aus der A4-Höhe heraus.
          minHeight: 0,
          overflow: "hidden",
          marginTop: 16,
        }}
      >
        {/* LEFT — dominante Zahlen. Die Spaltenbreite ergibt sich aus der Kommissionsnummer;
            der Kundenname (FitText, overflow:hidden) trägt nichts zur Spaltenbreite bei. */}
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

            {/* Feine Trennlinie zwischen Kommissionsnummer und Kundenname */}
            <div style={{ borderTop: `1px solid ${HAIRLINE}`, marginTop: 14, marginBottom: 10 }} />

            {/* Kundenname direkt unter der Kommissionsnummer, gleiche Größe (Thin), schrumpft proportional bei Überbreite */}
            <div className="print-eyebrow" style={{ marginBottom: 4 }}>Kunde</div>
            <FitText
              text={commission.client}
              maxFontSize={210}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 100,
                color: INK,
                letterSpacing: "-0.03em",
                lineHeight: 0.92,
              }}
            />
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
          {objectLabel && (
            <section>
              <div className="print-label" style={{ marginBottom: 4 }}>Objektbezeichnung</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 44, color: INK, lineHeight: 1.15, fontWeight: 500 }}>
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
                  <div style={{ marginTop: 4 }}>
                    <FitLines
                      lines={palette.dim.split("\n")}
                      maxFontSize={32}
                      gap={2}
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: INK,
                        lineHeight: 1.15,
                      }}
                    />
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
