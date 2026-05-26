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
      <PrintToolbar backUrl={`/kommissionen/${nr}`} />
      <A4Sheet>
        <PrintHeader printedBy={printedBy} printedAt={printedAt} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 32, marginTop: 16, flex: 1 }}>
          {/* Left Column: Commission No, Client Info, Component Checkboxes, Print Meta */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, justifyContent: "space-between" }}>
            {/* 1. Header with Document Type and Commission Number */}
            <div>
              <div className="print-eyebrow" style={{ marginBottom: 4 }}>Laufzettel · Kommission</div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 300,
                  fontSize: 130,
                  color: "#0E0E0D",
                  letterSpacing: "-0.03em",
                  lineHeight: 0.85,
                }}
              >
                {commission.no}
              </div>
            </div>

            {/* 2. Client & Project Details */}
            <div style={{ borderTop: "1px solid #0E0E0D", paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <div className="print-label">Kunde</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 24, color: "#0E0E0D", letterSpacing: "-0.01em", lineHeight: 1.1 }}>
                  {commission.client}
                </div>
              </div>

              {commission.project && (
                <div>
                  <div className="print-label">Projekt / Objekt</div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#5C5852", marginTop: 1 }}>
                    {commission.project}
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, borderTop: "1px solid rgba(14,14,13,.1)", paddingTop: 8 }}>
                <div>
                  <div className="print-label">Bereich / Raum</div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#0E0E0D", marginTop: 2, fontWeight: 500 }}>
                    {commission.no === "260050" ? "Erdgeschoss / Küche" : "Innenbereich"}
                  </div>
                </div>
                <div>
                  <div className="print-label">Bauteil / Bezeichnung</div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#0E0E0D", marginTop: 2, fontWeight: 500 }}>
                    {commission.no === "260050" ? "Kücheninsel & Zeile" : "Möbelelemente"}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, borderTop: "1px solid rgba(14,14,13,.1)", paddingTop: 8 }}>
                <div>
                  <div className="print-label">Material</div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#0E0E0D", marginTop: 2, fontWeight: 500 }}>
                    Eiche furniert / massiv
                  </div>
                </div>
                <div>
                  <div className="print-label">Oberfläche</div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#0E0E0D", marginTop: 2, fontWeight: 500 }}>
                    Natur matt lackiert
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Component Checkboxes */}
            <section style={{ borderTop: "1px solid #0E0E0D", paddingTop: 10 }}>
              <div className="print-label" style={{ marginBottom: 6 }}>Bauteil-Komponenten</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
                {[
                  "Seiten",
                  "Sockel",
                  "RW-Schub",
                  "Boden / Deckel",
                  "Fronten",
                  "Boden-Schub",
                  "Traverse",
                  "Blenden",
                  "Rückwände",
                  "UK",
                  "Fachböden",
                  "Konstruktionsböden",
                  "Sonstiges",
                ].map((cb) => (
                  <div key={cb} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-sans)", fontSize: 12, color: "#0E0E0D" }}>
                    <span style={{ display: "inline-block", width: 12, height: 12, border: "1px solid #0E0E0D", flexShrink: 0 }} />
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cb}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* 4. Metadata Block */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, borderTop: "1px solid #0E0E0D", paddingTop: 10 }}>
              <div>
                <div className="print-label">Mitarbeiter (Kürzel)</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#0E0E0D", marginTop: 4, letterSpacing: "0.06em" }}>
                  {commission.owner}
                </div>
              </div>
              <div>
                <div className="print-label">Datum</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#0E0E0D", marginTop: 4 }}>
                  {printedAt}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Stations, Materials, handwritten Notes */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingLeft: 24, borderLeft: "1px solid #0E0E0D" }}>
            <section>
              <div className="print-label" style={{ marginBottom: 6 }}>Stationen · Werkstatt</div>
              <ol style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", margin: 0, padding: 0, listStyle: "none" }}>
                {stations.map((s, i) => (
                  <li
                    key={s}
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      color: "#0E0E0D",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: 12,
                        height: 12,
                        border: "1px solid #0E0E0D",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontFamily: "var(--font-mono)", color: "#8A8278", fontSize: 9, letterSpacing: "0.08em" }}>
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
                    <th style={{ padding: "4px 0", fontWeight: 500, width: 60 }}>Menge</th>
                    <th style={{ padding: "4px 0", fontWeight: 500, width: 140, fontFamily: "var(--font-mono)" }}>Maße (mm)</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m) => (
                    <tr key={m.pos} style={{ borderTop: "1px solid rgba(14,14,13,.10)" }}>
                      <td style={{ padding: "4px 0", fontFamily: "var(--font-mono)", color: "#8A8278", letterSpacing: "0.06em" }}>{m.pos}</td>
                      <td style={{ padding: "4px 0" }}>{m.desc}</td>
                      <td style={{ padding: "4px 0", fontFamily: "var(--font-mono)" }}>{m.qty}</td>
                      <td style={{ padding: "4px 0", fontFamily: "var(--font-mono)" }}>{m.dim}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section style={{ borderTop: "1px solid rgba(14,14,13,.18)", paddingTop: 10, flex: 1, display: "flex", flexDirection: "column" }}>
              <div className="print-label" style={{ marginBottom: 6 }}>Notizen · handschriftlich</div>
              <div style={{ flex: 1, border: "1px dashed rgba(14,14,13,.25)", minHeight: 80, padding: "8px 12px", fontSize: 11, color: "#8A8278", fontFamily: "var(--font-sans)" }}>
                Ergänzungen zu Kanten, Beschlägen, Sondermaßen ...
              </div>
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
