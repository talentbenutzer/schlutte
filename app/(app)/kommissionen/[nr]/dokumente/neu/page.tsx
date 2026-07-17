import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { getCommissionByNumber } from "@/lib/data/commissions";

export default async function NewDocumentSelectPage({
  params,
}: {
  params: Promise<{ nr: string }>;
}) {
  const { nr } = await params;
  const commission = await getCommissionByNumber(nr);
  if (!commission) notFound();

  return (
    <div
      style={{
        padding: "40px 56px 80px",
        display: "flex",
        flexDirection: "column",
        gap: 32,
        maxWidth: 960,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <div>
        <Link
          href={`/kommissionen/${commission.no}`}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          ← Kommission {commission.no}
        </Link>
        <span className="grb-eyebrow" style={{ display: "block", marginTop: 18 }}>
          Neues Dokument erstellen
        </span>
        <h1 className="grb-h-h1" style={{ marginTop: 6 }}>
          Dokumenttyp wählen
        </h1>
        <p className="gd-lede" style={{ marginTop: 10 }}>
          Wähle den Typ des Druckdokuments für die Kommission <strong>{commission.no}</strong> ({commission.client}).
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 16 }}>
        {/* Card 1: Laufzettel */}
        <Link
          href={`/kommissionen/${commission.no}/dokumente/laufzettel/neu`}
          style={{
            textDecoration: "none",
            color: "inherit",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            padding: 32,
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            position: "relative",
            minHeight: 240,
            cursor: "pointer",
            transition: "border-color 180ms var(--ease-out), box-shadow 180ms var(--ease-out)",
          }}
          className="grb-card-hover"
        >
          <span style={{ position: "absolute", top: 16, right: 16, color: "var(--fg-subtle)" }}>
            <Icon name="pallet-boards" size={24} stroke={1.25} />
          </span>
          <span className="grb-eyebrow" style={{ color: "var(--accent)" }}>01 / Werkstatt</span>
          <h2 className="grb-h-h2" style={{ fontSize: 28, margin: "12px 0 6px" }}>
            Palettenlabel intern
          </h2>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg-muted)", lineHeight: 1.5, margin: 0 }}>
            Werkstatt / Produktion. Erstelle eine Stückliste und weise die Arbeitsschritte den einzelnen Gewerke-Stationen zu.
          </p>
          <span style={{ marginTop: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg)" }}>
            Erstellen <Icon name="arrow" size={14} />
          </span>
        </Link>

        {/* Card 2: Palettenbeschriftung */}
        <Link
          href={`/kommissionen/${commission.no}/dokumente/palette/neu`}
          style={{
            textDecoration: "none",
            color: "inherit",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            padding: 32,
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            position: "relative",
            minHeight: 240,
            cursor: "pointer",
            transition: "border-color 180ms var(--ease-out), box-shadow 180ms var(--ease-out)",
          }}
          className="grb-card-hover"
        >
          <span style={{ position: "absolute", top: 16, right: 16, color: "var(--fg-subtle)" }}>
            <Icon name="truck" size={24} stroke={1.25} />
          </span>
          <span className="grb-eyebrow" style={{ color: "var(--accent)" }}>02 / Versand</span>
          <h2 className="grb-h-h2" style={{ fontSize: 28, margin: "12px 0 6px" }}>
            Palettenversand-Label
          </h2>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg-muted)", lineHeight: 1.5, margin: 0 }}>
            Versand / Packstücke. Beschriftung für den Palettentransport. Unterstützt Nummernsequenzen (z. B. 1 von 5) und Gewicht/Maße.
          </p>
          <span style={{ marginTop: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg)" }}>
            Erstellen <Icon name="arrow" size={14} />
          </span>
        </Link>
      </div>
    </div>
  );
}
