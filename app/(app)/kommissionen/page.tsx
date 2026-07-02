import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Status } from "@/components/ui/Status";
import { getCommissions } from "@/lib/data/commissions";

export default async function KommissionenPage() {
  const commissions = await getCommissions();
  return (
    <div style={{ padding: "40px 56px", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <span className="grb-eyebrow">Kommissionen</span>
          <h1 className="grb-h-h1" style={{ marginTop: 8 }}>
            Alle Kommissionen
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg-muted)", marginTop: 8 }}>
            {commissions.length} Einträge · Stand: Mock-Daten
          </p>
        </div>
        <Link href="/kommissionen/neu" className="grb-btn grb-btn-primary">
          <Icon name="plus" size={14} /> Neue Kommission
        </Link>
      </div>

      <div style={{ borderTop: "1px solid var(--fg)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "100px 1fr auto auto 120px 80px",
            gap: 24,
            padding: "10px 0",
            borderBottom: "1px solid var(--hairline)",
          }}
        >
          <span className="grb-eyebrow">Nr.</span>
          <span className="grb-eyebrow">Kunde</span>
          <span className="grb-eyebrow">Status</span>
          <span className="grb-eyebrow">Dokumente</span>
          <span className="grb-eyebrow">Aktualisiert</span>
          <span className="grb-eyebrow" style={{ textAlign: "right" }}>Owner</span>
        </div>
        {commissions.map((k) => (
          <Link
            key={k.no}
            href={`/kommissionen/${k.no}`}
            style={{
              display: "grid",
              gridTemplateColumns: "100px 1fr auto auto 120px 80px",
              alignItems: "center",
              gap: 24,
              padding: "16px 0",
              borderBottom: "1px solid var(--hairline)",
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--fg)", letterSpacing: "0.04em" }}>
              {k.no}
            </span>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 18, color: "var(--fg)" }}>
                {k.client}
              </div>
            </div>
            <Status value={k.status} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-subtle)", whiteSpace: "nowrap" }}>
              {k.laufzettelCount ?? 0} Laufz. · {k.paletteCount ?? 0} Pal.
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-subtle)" }}>{k.updated}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-subtle)", textAlign: "right" }}>{k.owner}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
