import { Icon } from "@/components/ui/Icon";

const TEMPLATES = [
  { id: "laufzettel-v1", name: "Laufzettel · Standard", kind: "Laufzettel", status: "Aktiv", updated: "2026-05-12" },
  { id: "palette-v1", name: "Palettenbeschriftung · Klassisch", kind: "Palette", status: "Aktiv", updated: "2026-05-12" },
];

export default function VorlagenPage() {
  return (
    <div style={{ padding: "40px 56px", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <span className="grb-eyebrow">Vorlagen · Admin</span>
          <h1 className="grb-h-h1" style={{ marginTop: 8 }}>
            Dokumentvorlagen
          </h1>
          <p className="gd-lede" style={{ marginTop: 8 }}>
            Im MVP sind die Vorlagen fix im Code. Später bearbeitbar — nur für
            Admin (EDL). Berechtigung wird mit Supabase Auth umgesetzt.
          </p>
        </div>
        <button className="grb-btn grb-btn-quiet" disabled>
          <Icon name="plus" size={14} /> Neue Vorlage (folgt)
        </button>
      </div>

      <div style={{ borderTop: "1px solid var(--fg)" }}>
        {TEMPLATES.map((t) => (
          <div
            key={t.id}
            style={{
              padding: "16px 0",
              borderBottom: "1px solid var(--hairline)",
              display: "grid",
              gridTemplateColumns: "180px 1fr auto auto",
              alignItems: "center",
              gap: 24,
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-subtle)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {t.kind}
            </span>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--fg)" }}>{t.name}</div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {t.status}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-subtle)" }}>{t.updated}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
