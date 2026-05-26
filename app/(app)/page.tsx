import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Status } from "@/components/ui/Status";
import { getCommissions } from "@/lib/data/commissions";
import { getRecentDocuments } from "@/lib/data/documents";

function DashTile({
  idx,
  title,
  hint,
  icon,
  href,
}: {
  idx: string;
  title: string;
  hint: string;
  icon: React.ComponentProps<typeof Icon>["name"];
  href?: string;
}) {
  const body = (
    <>
      <span className="corner">{idx}</span>
      <div style={{ color: "var(--fg)" }}>
        <Icon name={icon} size={28} stroke={1.25} />
      </div>
      <div className="title">{title}</div>
      <div className="hint">{hint}</div>
      <span style={{ position: "absolute", right: 20, bottom: 20, color: "var(--accent)" }}>
        <Icon name="arrow" size={18} />
      </span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="grb-action-tile" style={{ textDecoration: "none", color: "inherit" }}>
        {body}
      </Link>
    );
  }
  return <div className="grb-action-tile">{body}</div>;
}

export default async function DashboardPage() {
  const [commissions, recentDocs] = await Promise.all([
    getCommissions(),
    getRecentDocuments(6),
  ]);
  return (
    <>
      <div
        style={{
          flex: 1,
          padding: "40px 56px",
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        {/* Hero / search */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 32 }}>
          <div>
            <span className="grb-eyebrow">Dashboard · Schlutte</span>
            <h1 className="grb-h-display" style={{ fontSize: 56, marginTop: 12 }}>
              Guten Morgen, Eddy.
            </h1>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 16, color: "var(--fg-muted)", marginTop: 12, maxWidth: 560 }}>
              6 aktive Kommissionen. 12 Dokumente diese Woche gedruckt.
            </p>
          </div>
          <div style={{ minWidth: 460, flex: "0 0 460px" }}>
            <div className="grb-search-big">
              <Icon name="search" size={20} />
              <input placeholder="260050 oder Raitl …" />
              <kbd style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-subtle)", border: "1px solid var(--border)", padding: "2px 6px" }}>
                ⌘ K
              </kbd>
            </div>
          </div>
        </div>

        {/* Schnellaktionen */}
        <section>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
            <span className="grb-eyebrow">Schnellaktion · ohne Umweg über Kommission</span>
            <span className="grb-index">01 / 03</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            <DashTile idx="01" title="Neuer Laufzettel" hint="Gewerke-Stationen, Stückliste, Maße." icon="doc-stripe" />
            <DashTile idx="02" title="Neue Palette" hint="Versand · Beschriftung 1 von n. Mehrfachdruck." icon="pkg" />
            <DashTile idx="03" title="Neue Kommission" hint="Nummer, Kunde, Projekt anlegen." icon="plus" href="/kommissionen/neu" />
            <DashTile idx="04" title="Archiv öffnen" hint="Druckstände, PDFs, Versionen." icon="archive" href="/archiv" />
          </div>
        </section>

        {/* Two columns */}
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 48 }}>
          <section>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="grb-eyebrow">Letzte Kommissionen</span>
              <a className="grb-btn-link" style={{ fontSize: 11 }}>
                Alle ansehen <Icon name="arrow" size={12} />
              </a>
            </div>
            <div style={{ borderTop: "1px solid var(--fg)" }}>
              {commissions.slice(0, 5).map((k) => (
                <div
                  key={k.no}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 1fr auto auto auto",
                    alignItems: "center",
                    gap: 24,
                    padding: "14px 0",
                    borderBottom: "1px solid var(--hairline)",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--fg)", letterSpacing: "0.04em" }}>
                    {k.no}
                  </span>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 18, color: "var(--fg)", letterSpacing: "-0.005em" }}>
                      {k.client}
                    </div>
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--fg-muted)", marginTop: 2 }}>
                      {k.project}
                    </div>
                  </div>
                  <Status value={k.status} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-subtle)", letterSpacing: "0.06em" }}>
                    {k.docs} Dok.
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-subtle)", letterSpacing: "0.06em" }}>
                    {k.updated}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="grb-eyebrow">Zuletzt bearbeitet</span>
              <a className="grb-btn-link" style={{ fontSize: 11 }}>
                Archiv <Icon name="arrow" size={12} />
              </a>
            </div>
            <div style={{ borderTop: "1px solid var(--fg)" }}>
              {recentDocs.map((d, i) => (
                <div
                  key={i}
                  style={{
                    padding: "14px 0",
                    borderBottom: "1px solid var(--hairline)",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
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
                  <Icon name="arrow" size={14} style={{ color: "var(--fg-subtle)" }} />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
