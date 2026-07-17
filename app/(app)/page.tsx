import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Status } from "@/components/ui/Status";
import { getCommissions, searchCommissions } from "@/lib/data/commissions";
import { getRecentDocuments } from "@/lib/data/documents";
import { createClient } from "@/lib/supabase/server";
import { getGreeting } from "@/lib/utils";
import type { Commission, CommissionDocument } from "@/lib/types";

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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const searchQuery = q?.trim() || "";

  // Load greeting based on time of day and logged-in user
  let displayName: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      const { data } = await supabase
        .from("employees")
        .select("name, initials")
        .ilike("email", user.email)
        .maybeSingle();
      if (data?.name) {
        displayName = data.name;
      } else if (data?.initials) {
        displayName = data.initials;
      } else if (user.email) {
        const localPart = user.email.split("@")[0];
        displayName = localPart.charAt(0).toUpperCase() + localPart.slice(1);
      }
    }
  } catch (e) {
    console.error("Error loading user for greeting:", e);
  }
  const greeting = getGreeting(displayName);

  // Load data based on search query
  let commissions: Commission[] = [];
  let recentDocs: CommissionDocument[] = [];
  let isSearching = false;

  if (searchQuery) {
    isSearching = true;
    commissions = await searchCommissions(searchQuery);
  } else {
    const [allComms, docs] = await Promise.all([
      getCommissions(),
      getRecentDocuments(6),
    ]);
    commissions = allComms;
    recentDocs = docs;
  }

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
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 32, flexWrap: "wrap" }}>
          <div>
            <span className="grb-eyebrow">Dashboard · Schlutte</span>
            <h1 className="grb-h-display" style={{ fontSize: 56, marginTop: 12 }}>
              {greeting}
            </h1>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 16, color: "var(--fg-muted)", marginTop: 12, maxWidth: 560 }}>
              {isSearching 
                ? `Suchergebnisse für „${searchQuery}“: ${commissions.length} Kommissionen gefunden.`
                : `${commissions.length} aktive Kommissionen in der Datenbank erfasst.`}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 400, flex: "0 0 400px" }}>
            <form action="/" method="GET" style={{ width: "100%" }}>
              <div className="grb-search-big" style={{ padding: "14px 18px" }}>
                <Icon name="search" size={20} />
                <input
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="260050 oder Raitl …"
                  style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 18, color: "var(--fg)" }}
                />
                {searchQuery && (
                  <Link
                    href="/"
                    style={{ color: "var(--fg-muted)", display: "flex", alignItems: "center" }}
                    title="Suche zurücksetzen"
                  >
                    <Icon name="x" size={16} />
                  </Link>
                )}
              </div>
            </form>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <Link href="/kommissionen/neu" className="grb-btn grb-btn-primary">
                <Icon name="plus" size={14} /> Neue Kommission
              </Link>
              <Link href="/archiv" className="grb-btn grb-btn-quiet">
                <Icon name="archive" size={14} /> Archiv
              </Link>
            </div>
          </div>
        </div>

        {/* Schnellaktionen — Dokument für bestehende Kommission erstellen */}
        <section>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
            <span className="grb-eyebrow">Dokument für bestehende Kommission erstellen</span>
            <span className="grb-index">01 / 02</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            <DashTile idx="01" title="Palettenlabel intern" hint="Gewerke-Stationen, Stückliste, Maße." icon="doc-stripe" href="/dokument-erstellen/laufzettel" />
            <DashTile idx="02" title="Palettenversand-Label" hint="Versand · Beschriftung 1 von n. Mehrfachdruck." icon="pallet" href="/dokument-erstellen/palette" />
          </div>
        </section>

        {/* Results layout */}
        {isSearching ? (
          <section>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="grb-eyebrow">Suchergebnisse Kommissionen</span>
              <Link href="/" className="grb-btn-link" style={{ fontSize: 11 }}>
                Suche schließen <Icon name="x" size={12} />
              </Link>
            </div>
            <div style={{ borderTop: "1px solid var(--fg)" }}>
              {commissions.length === 0 ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--fg-muted)", fontFamily: "var(--font-sans)" }}>
                  Keine Kommissionen entsprechen der Suchanfrage.
                </div>
              ) : (
                commissions.map((k) => (
                  <Link
                    key={k.no}
                    href={`/kommissionen/${k.no}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px 1fr auto auto auto",
                      alignItems: "center",
                      gap: 24,
                      padding: "14px 0",
                      borderBottom: "1px solid var(--hairline)",
                      cursor: "pointer",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--fg)", letterSpacing: "0.04em" }}>
                      {k.no}
                    </span>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 18, color: "var(--fg)", letterSpacing: "-0.005em" }}>
                        {k.client}
                      </div>
                    </div>
                    <Status value={k.status} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-subtle)", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                      {k.laufzettelCount ?? 0} Laufz. · {k.paletteCount ?? 0} Pal.
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-subtle)", letterSpacing: "0.06em" }}>
                      {k.updated}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 48 }}>
            <section>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
                <span className="grb-eyebrow">Letzte Kommissionen</span>
                <Link href="/kommissionen" className="grb-btn-link" style={{ fontSize: 11 }}>
                  Alle ansehen <Icon name="arrow" size={12} />
                </Link>
              </div>
              <div style={{ borderTop: "1px solid var(--fg)" }}>
                {commissions.slice(0, 5).map((k) => (
                  <Link
                    key={k.no}
                    href={`/kommissionen/${k.no}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px 1fr auto auto auto",
                      alignItems: "center",
                      gap: 24,
                      padding: "14px 0",
                      borderBottom: "1px solid var(--hairline)",
                      cursor: "pointer",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--fg)", letterSpacing: "0.04em" }}>
                      {k.no}
                    </span>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 18, color: "var(--fg)", letterSpacing: "-0.005em" }}>
                        {k.client}
                      </div>
                    </div>
                    <Status value={k.status} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-subtle)", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                      {k.laufzettelCount ?? 0} Laufz. · {k.paletteCount ?? 0} Pal.
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-subtle)", letterSpacing: "0.06em" }}>
                      {k.updated}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
                <span className="grb-eyebrow">Zuletzt bearbeitet</span>
                <Link href="/archiv" className="grb-btn-link" style={{ fontSize: 11 }}>
                  Archiv <Icon name="arrow" size={12} />
                </Link>
              </div>
              <div style={{ borderTop: "1px solid var(--fg)" }}>
                {recentDocs.map((d, i) => (
                  <Link
                    key={i}
                    href={`/kommissionen/${d.kommission}`}
                    style={{
                      padding: "14px 0",
                      borderBottom: "1px solid var(--hairline)",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      textDecoration: "none",
                      color: "inherit",
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
                  </Link>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </>
  );
}

