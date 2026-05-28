import Link from "next/link";
import { getCommissions } from "@/lib/data/commissions";
import { CommissionSelect } from "@/components/commission/CommissionSelect";
import { Icon } from "@/components/ui/Icon";

export default async function CreatePaletteSelectPage() {
  const commissions = await getCommissions();

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
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.18em",
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            ← Dashboard
          </Link>
          <span className="grb-eyebrow" style={{ display: "block", marginTop: 18 }}>
            Palettenbeschriftung erstellen
          </span>
          <h1 className="grb-h-h1" style={{ marginTop: 6 }}>
            Kommission auswählen
          </h1>
          <p className="gd-lede" style={{ marginTop: 10 }}>
            Für welche Kommission soll die Palettenbeschriftung angelegt werden?
          </p>
        </div>
        <Link href="/kommissionen/neu" className="grb-btn grb-btn-quiet">
          <Icon name="plus" size={14} /> Neue Kommission
        </Link>
      </div>

      <CommissionSelect commissions={commissions} documentType="palette" />
    </div>
  );
}
