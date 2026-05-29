import Link from "next/link";
import { getOpenOrders, getArchivedBatches } from "@/lib/data/orders";
import { getActiveEmployees } from "@/lib/data/employees";
import { BestellListe } from "./BestellListe";

export const dynamic = "force-dynamic";

export default async function BestelllistePage() {
  const [openOrders, batches, employees] = await Promise.all([
    getOpenOrders(),
    getArchivedBatches(),
    getActiveEmployees(),
  ]);

  return (
    <div
      style={{
        padding: "40px 56px 80px",
        maxWidth: 1320,
        margin: "0 auto",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <div>
        <Link
          href="/start"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          ← Intranet
        </Link>
        <span className="grb-eyebrow" style={{ display: "block", marginTop: 18 }}>
          Werkstatt · Einkauf
        </span>
        <h1 className="grb-h-h1" style={{ marginTop: 6 }}>
          Bestellliste
        </h1>
        <p className="gd-lede" style={{ marginTop: 10 }}>
          Material und Beschläge erfassen. Bei „Bestellung aufgeben“ wandert die
          komplette Liste ins Archiv und die Liste ist wieder leer.
        </p>
      </div>

      <BestellListe
        openOrders={openOrders}
        batches={batches}
        employees={employees.map((e) => ({ initials: e.initials ?? e.kuerzel, name: e.name }))}
      />
    </div>
  );
}
