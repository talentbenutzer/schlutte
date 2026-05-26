import Link from "next/link";
import { CommissionForm } from "./CommissionForm";

export default function NewCommissionPage() {
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
          href="/kommissionen"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          ← Kommissionen
        </Link>
        <span className="grb-eyebrow" style={{ display: "block", marginTop: 18 }}>
          Neue Kommission
        </span>
        <h1 className="grb-h-h1" style={{ marginTop: 6 }}>
          Anlegen
        </h1>
        <p className="gd-lede" style={{ marginTop: 10 }}>
          Kunde und optional ein Bauteil/Objekt erfassen. Die 6-stellige
          Kommissionsnummer wird automatisch fortgezählt.
        </p>
      </div>

      <CommissionForm />
    </div>
  );
}
