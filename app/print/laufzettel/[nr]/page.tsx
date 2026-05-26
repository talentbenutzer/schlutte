import { notFound } from "next/navigation";
import { A4Sheet, PrintHeader } from "@/components/print/A4Sheet";
import { PrintToolbar } from "@/components/print/PrintToolbar";
import { getLaufzettelPrintData } from "@/lib/data/documents";

export default async function LaufzettelPrintPage({
  params,
}: {
  params: Promise<{ nr: string }>;
}) {
  const { nr } = await params;
  const data = await getLaufzettelPrintData(nr);
  if (!data) notFound();
  const { commission, materials, stations, printedBy, printedAt } = data;

  return (
    <>
      <PrintToolbar />
      <A4Sheet>
        <PrintHeader printedBy={printedBy} printedAt={printedAt} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 28, marginTop: 14, flex: 1 }}>
          {/* Left: huge commission number + meta */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div className="print-eyebrow" style={{ marginBottom: 6 }}>Kommission</div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 300,
                  fontSize: 180,
                  color: "#0E0E0D",
                  letterSpacing: "-0.03em",
                  lineHeight: 0.92,
                }}
              >
                {commission.no}
              </div>
            </div>
            <div style={{ borderTop: "1px solid #0E0E0D", paddingTop: 12 }}>
              <div className="print-label" style={{ marginBottom: 6 }}>Kunde / Projekt</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 30, color: "#0E0E0D", letterSpacing: "-0.01em", lineHeight: 1.05 }}>
                {commission.client}
              </div>
              <div style={{ fontFamily: "var(--font-sans)", fontStyle: "italic", fontSize: 15, color: "#5C5852", marginTop: 2 }}>
                {commission.project}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, borderTop: "1px solid rgba(14,14,13,.18)", paddingTop: 12 }}>
              <div>
                <div className="print-label">Owner</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "#0E0E0D", marginTop: 4, letterSpacing: "0.06em" }}>
                  {commission.owner}
                </div>
              </div>
              <div>
                <div className="print-label">Stand</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "#0E0E0D", marginTop: 4 }}>
                  {commission.updated}
                </div>
              </div>
            </div>
          </div>

          {/* Right: stations + material */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingLeft: 24, borderLeft: "1px solid #0E0E0D" }}>
            <section>
              <div className="print-label" style={{ marginBottom: 6 }}>Stationen · Werkstatt</div>
              <ol style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", margin: 0, padding: 0, listStyle: "none" }}>
                {stations.map((s, i) => (
                  <li
                    key={s}
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "#0E0E0D",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: 14,
                        height: 14,
                        border: "1px solid #0E0E0D",
                      }}
                    />
                    <span style={{ fontFamily: "var(--font-mono)", color: "#8A8278", fontSize: 10, letterSpacing: "0.08em" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
            </section>

            <section style={{ borderTop: "1px solid rgba(14,14,13,.18)", paddingTop: 10 }}>
              <div className="print-label" style={{ marginBottom: 6 }}>Material / Stückliste</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-sans)", fontSize: 11, color: "#0E0E0D" }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#5C5852" }}>
                    <th style={{ padding: "4px 0", fontWeight: 500, width: 32 }}>Pos</th>
                    <th style={{ padding: "4px 0", fontWeight: 500 }}>Beschreibung</th>
                    <th style={{ padding: "4px 0", fontWeight: 500, width: 70 }}>Menge</th>
                    <th style={{ padding: "4px 0", fontWeight: 500, width: 160, fontFamily: "var(--font-mono)" }}>Maße (mm)</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m) => (
                    <tr key={m.pos} style={{ borderTop: "1px solid rgba(14,14,13,.10)" }}>
                      <td style={{ padding: "5px 0", fontFamily: "var(--font-mono)", color: "#8A8278", letterSpacing: "0.06em" }}>{m.pos}</td>
                      <td style={{ padding: "5px 0" }}>{m.desc}</td>
                      <td style={{ padding: "5px 0", fontFamily: "var(--font-mono)" }}>{m.qty}</td>
                      <td style={{ padding: "5px 0", fontFamily: "var(--font-mono)" }}>{m.dim}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section style={{ borderTop: "1px solid rgba(14,14,13,.18)", paddingTop: 10, minHeight: 50 }}>
              <div className="print-label" style={{ marginBottom: 6 }}>Notizen · handschriftlich</div>
              <div style={{ minHeight: 60, borderTop: "1px dashed rgba(14,14,13,.25)" }} />
            </section>
          </div>
        </div>

        <footer
          style={{
            marginTop: "auto",
            paddingTop: 10,
            borderTop: "1px solid rgba(14,14,13,.18)",
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "#5C5852",
            letterSpacing: "0.1em",
          }}
        >
          <span>Schlutte · Laufzettel</span>
          <span>{commission.no}</span>
        </footer>
      </A4Sheet>
    </>
  );
}
