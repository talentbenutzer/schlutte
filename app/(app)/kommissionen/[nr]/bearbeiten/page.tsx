import Link from "next/link";
import { notFound } from "next/navigation";
import { getCommissionByNumber } from "@/lib/data/commissions";
import { CommissionEditForm } from "./CommissionEditForm";

export default async function EditCommissionPage({
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
          href={`/kommissionen/${nr}`}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          ← Zurück zu {nr}
        </Link>
        <span className="grb-eyebrow" style={{ display: "block", marginTop: 18 }}>
          Kommission bearbeiten
        </span>
        <h1 className="grb-h-h1" style={{ marginTop: 6 }}>
          {nr}
        </h1>
        <p className="gd-lede" style={{ marginTop: 10 }}>
          Aktualisieren Sie den Kunden, das Projekt oder interne Hinweise für diese Kommission.
        </p>
      </div>

      <CommissionEditForm commission={commission} />
    </div>
  );
}
