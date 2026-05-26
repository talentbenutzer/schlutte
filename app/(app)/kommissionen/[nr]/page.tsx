import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Status } from "@/components/ui/Status";
import { getCommissionByNumber } from "@/lib/data/commissions";
import {
  getDocumentsByCommissionNumber,
  getPalettesForCommission,
} from "@/lib/data/documents";

function SectionHeader({
  eyebrow,
  title,
  index,
  action,
}: {
  eyebrow: string;
  title: string;
  index?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom: 14,
        gap: 16,
      }}
    >
      <div>
        <span className="grb-eyebrow">{eyebrow}</span>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 400,
            color: "var(--fg)",
            letterSpacing: "-0.005em",
            marginTop: 4,
          }}
        >
          {title}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {action}
        {index && <span className="grb-index">{index}</span>}
      </div>
    </div>
  );
}

export default async function CommissionDetailPage({
  params,
}: {
  params: Promise<{ nr: string }>;
}) {
  const { nr } = await params;
  const commission = await getCommissionByNumber(nr);
  if (!commission) notFound();

  const [documents, palettes] = await Promise.all([
    getDocumentsByCommissionNumber(nr),
    getPalettesForCommission(nr),
  ]);

  const laufzettelDocs = documents.filter((d) => d.kind === "laufzettel");
  const paletteDocs = documents.filter((d) => d.kind === "palette");
  const totalPalettes = palettes.length;
  const palettesPrintHref =
    totalPalettes > 0
      ? `/print/palette/${commission.no}/range/1/${totalPalettes}`
      : `/print/palette/${commission.no}/1`;

  return (
    <div
      style={{
        padding: "32px 56px 80px",
        display: "flex",
        flexDirection: "column",
        gap: 40,
        maxWidth: 1440,
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* ---------- Hero ---------- */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 28,
          paddingBottom: 18,
          borderBottom: "1px solid var(--fg)",
          flexWrap: "wrap",
        }}
      >
        <div>
          <span className="grb-eyebrow">Kommission</span>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 300,
              fontSize: 88,
              color: "var(--fg)",
              letterSpacing: "-0.025em",
              lineHeight: 0.95,
              marginTop: 4,
            }}
          >
            {commission.no}
          </div>
        </div>

        <span style={{ width: 1, height: 72, background: "var(--border-strong)" }} />

        <div style={{ minWidth: 280 }}>
          <h1
            className="grb-h-h2"
            style={{ fontSize: 32, margin: 0, letterSpacing: "-0.005em" }}
          >
            {commission.client}
          </h1>
          {commission.project && (
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 16,
                color: "var(--fg-muted)",
                fontStyle: "italic",
                marginTop: 4,
              }}
            >
              {commission.project}
            </div>
          )}
          <div
            style={{
              display: "flex",
              gap: 18,
              marginTop: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-subtle)",
                letterSpacing: "0.12em",
              }}
            >
              OWNER · {commission.owner}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-subtle)",
                letterSpacing: "0.12em",
              }}
            >
              AKTUALISIERT · {commission.updated.toUpperCase()}
            </span>
            <Status value={commission.status} />
          </div>
        </div>

        {/* ---------- Action bar ---------- */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <Link
            className="grb-btn grb-btn-primary"
            href={`/kommissionen/${commission.no}/dokumente/neu`}
          >
            <Icon name="plus" size={14} /> Neues Dokument
          </Link>
          <Link
            className="grb-btn grb-btn-ghost"
            href={`/print/laufzettel/${commission.no}`}
          >
            <Icon name="print" size={14} /> Laufzettel drucken
          </Link>
          <Link
            className="grb-btn grb-btn-ghost"
            href={palettesPrintHref}
          >
            <Icon name="print" size={14} />
            {totalPalettes > 1 ? `Alle ${totalPalettes} Paletten drucken` : "Palette drucken"}
          </Link>
          <button className="grb-btn grb-btn-quiet" disabled title="Folgt">
            <Icon name="edit" size={14} /> Bearbeiten
          </button>
        </div>
      </header>

      {/* ---------- Laufzettel ---------- */}
      <section>
        <SectionHeader
          eyebrow="Dokumente · Laufzettel"
          title="Laufzettel zu dieser Kommission"
          index={laufzettelDocs.length > 0 ? `${laufzettelDocs.length} Stück` : undefined}
          action={
            <Link
              href={`/print/laufzettel/${commission.no}`}
              className="grb-btn-link"
              style={{ fontSize: 11 }}
            >
              Neuer Laufzettel <Icon name="arrow" size={12} />
            </Link>
          }
        />

        {laufzettelDocs.length === 0 ? (
          <div
            style={{
              border: "1px dashed var(--border-strong)",
              padding: "24px 28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  color: "var(--fg)",
                  fontWeight: 500,
                }}
              >
                Noch kein Laufzettel angelegt.
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  color: "var(--fg-muted)",
                  marginTop: 4,
                }}
              >
                Stationen, Material und Notizen — bereit für die Werkstatt.
              </div>
            </div>
            <Link
              href={`/print/laufzettel/${commission.no}`}
              className="grb-btn grb-btn-ghost"
            >
              <Icon name="doc-stripe" size={14} /> Laufzettel öffnen
            </Link>
          </div>
        ) : (
          <table className="grb-table">
            <thead>
              <tr>
                <th style={{ width: 30 }} />
                <th>Bezeichnung</th>
                <th>Erstellt</th>
                <th>Von</th>
                <th style={{ textAlign: "right" }}>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {laufzettelDocs.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Icon
                      name="doc-stripe"
                      size={16}
                      stroke={1.25}
                      style={{ color: "var(--fg-muted)" }}
                    />
                  </td>
                  <td style={{ fontWeight: 500 }}>{d.label}</td>
                  <td className="mono">{d.stamp}</td>
                  <td className="mono" style={{ color: "var(--accent)" }}>
                    {d.by}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link
                      href={`/print/laufzettel/${commission.no}`}
                      style={{ padding: 4, color: "var(--fg)" }}
                      title="Drucken"
                    >
                      <Icon name="print" size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ---------- Paletten ---------- */}
      <section>
        <SectionHeader
          eyebrow="Dokumente · Palettenbeschriftung"
          title="Paletten zu dieser Kommission"
          index={palettes.length > 0 ? `${palettes.length} Paletten` : undefined}
          action={
            paletteDocs.length > 0 ? (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  color: "var(--fg-subtle)",
                  textTransform: "uppercase",
                }}
              >
                {paletteDocs.length} bereits gedruckt
              </span>
            ) : undefined
          }
        />

        {palettes.length === 0 ? (
          <div
            style={{
              border: "1px dashed var(--border-strong)",
              padding: "24px 28px",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--fg-muted)",
            }}
          >
            Noch keine Paletten erfasst.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            {palettes.map((p) => (
              <Link
                key={p.idx}
                href={`/print/palette/${commission.no}/${p.idx}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  padding: 18,
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border)",
                  minHeight: 200,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <span className="grb-eyebrow">Palette</span>
                  <Icon
                    name="print"
                    size={14}
                    style={{ color: "var(--fg-subtle)" }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 300,
                      fontSize: 56,
                      color: "var(--fg)",
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                    }}
                  >
                    {p.idx}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      fontWeight: 200,
                      fontSize: 22,
                      color: "var(--fg-muted)",
                    }}
                  >
                    von {p.total}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    color: "var(--fg)",
                    lineHeight: 1.45,
                  }}
                >
                  {p.content}
                </div>
                <div
                  style={{
                    marginTop: "auto",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    paddingTop: 10,
                    borderTop: "1px solid var(--hairline)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    color: "var(--fg-subtle)",
                  }}
                >
                  <span>{p.weight}</span>
                  <span>{p.dim}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ---------- Archiv ---------- */}
      <section>
        <SectionHeader
          eyebrow="Archiv"
          title="Frühere Druckstände"
          index="Vorbereitet"
        />
        <div
          style={{
            border: "1px solid var(--border)",
            padding: "20px 24px",
            background: "var(--bg-alt)",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <Icon
            name="archive"
            size={20}
            stroke={1.25}
            style={{ color: "var(--fg-muted)" }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                color: "var(--fg)",
                fontWeight: 500,
              }}
            >
              PDF-Archivierung folgt
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--fg-muted)",
                marginTop: 2,
              }}
            >
              Gedruckte Stände werden später als unveränderliche PDFs in Supabase
              Storage abgelegt. Bis dahin bleibt der Druck der MVP-Pfad.
            </div>
          </div>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.18em",
              color: "var(--fg-subtle)",
              textTransform: "uppercase",
            }}
          >
            Folgt
          </span>
        </div>
      </section>
    </div>
  );
}
