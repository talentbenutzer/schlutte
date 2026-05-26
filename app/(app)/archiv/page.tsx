import { Icon } from "@/components/ui/Icon";
import { getRecentDocuments } from "@/lib/data/documents";

export default async function ArchivPage() {
  const docs = await getRecentDocuments(20);
  return (
    <div style={{ padding: "40px 56px", display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <span className="grb-eyebrow">Archiv</span>
        <h1 className="grb-h-h1" style={{ marginTop: 8 }}>
          Druckstände & Versionen
        </h1>
        <p className="gd-lede" style={{ marginTop: 8 }}>
          Druckartefakte als unveränderliche Versionen. PDF-Archivierung folgt
          später via Supabase Storage — aktuell nur Anzeige.
        </p>
      </div>

      <div style={{ borderTop: "1px solid var(--fg)" }}>
        {docs.map((d) => (
          <div
            key={d.id}
            style={{
              padding: "16px 0",
              borderBottom: "1px solid var(--hairline)",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <Icon
              name={d.kind === "palette" ? "pkg" : "doc-stripe"}
              size={18}
              stroke={1.25}
              style={{ color: "var(--fg-muted)" }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg)", fontWeight: 500 }}>
                {d.label} · {d.client}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-subtle)", marginTop: 2 }}>
                {d.kommission} · {d.stamp} · {d.by}
              </div>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
              HTML · PDF folgt
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
