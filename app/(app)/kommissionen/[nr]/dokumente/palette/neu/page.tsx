import Link from "next/link";
import { notFound } from "next/navigation";
import { getCommissionByNumber } from "@/lib/data/commissions";
import { getActiveEmployees, getCurrentEmployee } from "@/lib/data/employees";
import { PaletteForm } from "./PaletteForm";

export default async function NewPalettePage({
  params,
}: {
  params: Promise<{ nr: string }>;
}) {
  const { nr } = await params;
  const [commission, employees, me] = await Promise.all([
    getCommissionByNumber(nr),
    getActiveEmployees(),
    getCurrentEmployee(),
  ]);
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
          href={`/kommissionen/${commission.no}/dokumente/neu`}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          ← Dokumenttyp wählen
        </Link>
        <span className="grb-eyebrow" style={{ display: "block", marginTop: 18 }}>
          Palettenversand-Label
        </span>
        <h1 className="grb-h-h1" style={{ marginTop: 6 }}>
          Palettenversand-Label erstellen
        </h1>
        <p className="gd-lede" style={{ marginTop: 10 }}>
          Erstelle neue Palettenversand-Labels für die Kommission <strong>{commission.no}</strong>.
        </p>
      </div>

      <PaletteForm
        commission={commission}
        employees={employees.map((e) => ({ initials: e.initials ?? e.kuerzel, name: e.name }))}
        currentInitials={me?.initials}
      />
    </div>
  );
}
