import { A4Sheet, PrintHeader } from "@/components/print/A4Sheet";
import type { Commission, Palette } from "@/lib/types";

const INK = "#0E0E0D";
const STONE = "#5C5852";
const SUBTLE = "#8A8278";
const HAIRLINE = "rgba(14,14,13,.18)";

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

          {commission.project && (
            <section style={{ borderTop: `1px solid ${HAIRLINE}`, paddingTop: 10 }}>
              <div className="print-label" style={{ marginBottom: 4 }}>Bauteil · Objekt</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 22, color: INK, lineHeight: 1.2 }}>
                {commission.project}
              </div>
            </section>
          )}

          <section style={{ borderTop: `1px solid ${HAIRLINE}`, paddingTop: 10 }}>
            <div className="print-label" style={{ marginBottom: 4 }}>Inhalt dieser Palette</div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 18, color: INK, lineHeight: 1.4, fontWeight: 500 }}>
              {palette.content}
            </div>
          </section>

          {palette.shippingNote && (
            <section style={{ borderTop: `1px solid ${HAIRLINE}`, paddingTop: 10 }}>
              <div className="print-label" style={{ marginBottom: 4 }}>Versandhinweis</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 16, color: INK, fontWeight: 500, lineHeight: 1.3 }}>
                {palette.shippingNote}
              </div>
            </section>
          )}

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              borderTop: `1px solid ${HAIRLINE}`,
              paddingTop: 10,
            }}
          >
            <div>
              <div className="print-label">Gewicht</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 24, color: INK, marginTop: 4, fontWeight: 500 }}>
                {palette.weight}
              </div>
            </div>
            <div>
              <div className="print-label">Maße</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: INK, marginTop: 4 }}>
                {palette.dim}
              </div>
            </div>
          </section>
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
          {commission.no} · Packstück {palette.idx} / {palette.total}
        </span>
      </footer>
    </A4Sheet>
  );
}
