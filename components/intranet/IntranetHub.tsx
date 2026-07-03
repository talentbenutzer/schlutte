"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type IconName =
  | "workshop" | "staff" | "order" | "vacation" | "inventory" | "report"
  | "arrow" | "search" | "sun" | "moon" | "logout";

function SIcon({
  name,
  size = 28,
  stroke = 1.4,
  style,
}: {
  name: IconName;
  size?: number;
  stroke?: number;
  style?: React.CSSProperties;
}) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style,
  };
  switch (name) {
    case "workshop": return <svg {...p}><path d="m3 7 9 5 9-5"/><path d="M21 7v10l-9 5-9-5V7l9-5 9 5z"/><path d="M12 12v10"/></svg>;
    case "staff":    return <svg {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11"/></svg>;
    case "order":    return <svg {...p}><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M8 11h8M8 15h6"/></svg>;
    case "vacation": return <svg {...p}><circle cx="12" cy="9" r="3.5"/><path d="M12 2v1.5M12 14.5V16M19 9h-1.5M6.5 9H5M16.95 4.05l-1.06 1.06M8.11 12.89l-1.06 1.06M16.95 13.95l-1.06-1.06M8.11 5.11 7.05 4.05M3 21h18"/></svg>;
    case "inventory": return <svg {...p}><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35a2 2 0 0 1 1.26-1.86l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35z"/><path d="M6 18h12M6 14h12"/><rect x="6" y="10" width="12" height="12"/></svg>;
    case "report":   return <svg {...p}><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="5"/><rect x="12" y="8" width="3" height="9"/><rect x="17" y="5" width="3" height="12"/></svg>;
    case "arrow":    return <svg {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case "search":   return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case "sun":      return <svg {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>;
    case "moon":     return <svg {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
    case "logout":   return <svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>;
    default: return null;
  }
}

type Tile = {
  no: string;
  icon: IconName;
  title: string;
  hint: string;
  meta: string;
  href?: string;
  live?: boolean;
  external?: boolean;
};

const TILES: Tile[] = [
  {
    no: "01",
    icon: "report",
    title: "Gerda",
    hint: "Auswertungen und Gesamt-Reports auf einen Blick — Kennzahlen erfassen, analysieren und exportieren.",
    meta: "Auswertung · Report",
    href: "https://ppl-two.vercel.app/",
    live: true,
    external: true,
  },
  {
    no: "02",
    icon: "workshop",
    title: "Druckvorlagen Werkstatt",
    hint: "Laufzettel & Palettenbeschriftung. Kommissionen verwalten, Dokumente erstellen, drucken und archivieren.",
    meta: "Laufzettel · Palette · Versand",
    href: "/",
    live: true,
  },
  {
    no: "03",
    icon: "staff",
    title: "Druckvorlagen Personal",
    hint: "Vorlagen für Büro & Verwaltung — Bescheinigungen, Aushänge, interne Schreiben.",
    meta: "Personal · Büro",
  },
  {
    no: "04",
    icon: "inventory",
    title: "Warenbestand WERK 2",
    hint: "Mobiles Kommissionslager — Bestände erfassen, Ein- und Auslagerungen buchen, Kommissionen im Blick behalten.",
    meta: "Lager · Kommission",
    href: "https://warenbestand-werk-2.vercel.app/",
    live: true,
    external: true,
  },
  {
    no: "05",
    icon: "order",
    title: "Bestellliste",
    hint: "Material, Beschläge und Verbrauch erfassen. Sammelbestellung für die Werkstatt vorbereiten.",
    meta: "Material · Einkauf",
    href: "/bestellliste",
    live: true,
  },
  {
    no: "06",
    icon: "vacation",
    title: "Urlaubsantrag",
    hint: "Urlaub und Abwesenheit beantragen. Übersicht über Resttage und das Team.",
    meta: "Personal · Abwesenheit",
  },
];

function TileInner({ tile }: { tile: Tile }) {
  const disabled = !tile.live;
  return (
    <>
      <div className="sch-tile-top">
        <span className="sch-tile-icon">
          <SIcon name={tile.icon} size={34} stroke={1.3} />
        </span>
        <span className="sch-tile-no">{tile.no}</span>
      </div>
      <div className="sch-tile-body">
        <h2 className="sch-tile-title">{tile.title}</h2>
        <p className="sch-tile-hint">{tile.hint}</p>
      </div>
      <div className="sch-tile-foot">
        <span className="sch-tile-meta">{tile.meta}</span>
        {disabled ? (
          <span className="sch-tile-soon">folgt</span>
        ) : (
          <span className="sch-tile-arrow">
            <SIcon name="arrow" size={20} stroke={1.6} />
          </span>
        )}
      </div>
    </>
  );
}

export function IntranetHub({
  salutation,
  displayName,
  dateLine,
  userName,
  userInitials,
  userRole,
}: {
  salutation: string;
  displayName: string | null;
  dateLine: string;
  userName: string;
  userInitials: string;
  userRole: string;
}) {
  const router = useRouter();
  const [dark, setDark] = useState(false);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    const html = document.documentElement;
    if (next) html.setAttribute("data-theme", "dark");
    else html.removeAttribute("data-theme");
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="sch">
      {/* Topbar */}
      <header className="sch-topbar">
        <div className="sch-brand">
          <Link href="/start" aria-label="Zur Startseite" style={{ display: "inline-flex" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/grabner-schlutte-logo.svg" alt="Grabner Schlutte" className="grb-logo" />
          </Link>
          <span className="sch-brand-div" />
          <span className="sch-brand-sub">Schlutte · Intranet</span>
        </div>

        <div className="sch-search">
          <SIcon name="search" size={18} stroke={1.5} />
          <span className="sch-search-ph">Suchen im Intranet …</span>
        </div>

        <div className="sch-topbar-right">
          <button className="sch-iconbtn" onClick={toggleTheme} aria-label="Theme wechseln">
            <SIcon name={dark ? "sun" : "moon"} size={18} stroke={1.5} />
          </button>
          <button className="sch-iconbtn" onClick={handleLogout} aria-label="Abmelden" title="Abmelden">
            <SIcon name="logout" size={18} stroke={1.5} />
          </button>
          <div className="sch-user">
            <div className="sch-user-text">
              <div className="sch-user-name">{userName}</div>
              <div className="sch-user-role">{userRole}</div>
            </div>
            <div className="sch-user-initials">{userInitials}</div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="sch-main">
        <div className="sch-inner">
          <section className="sch-hero">
            <span className="sch-eyebrow">{dateLine}</span>
            <h1 className="sch-greeting">
              {salutation}
              {displayName ? (
                <>
                  , <em>{displayName}.</em>
                </>
              ) : (
                "."
              )}
            </h1>
            <p className="sch-lede">Willkommen im Schlutte-Intranet. Wähle einen Bereich.</p>
          </section>

          <section className="sch-grid" aria-label="Bereiche">
            {TILES.map((tile) =>
              tile.live && tile.href ? (
                tile.external ? (
                  <a
                    key={tile.no}
                    href={tile.href}
                    className="sch-tile is-live"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <TileInner tile={tile} />
                  </a>
                ) : (
                  <Link key={tile.no} href={tile.href} className="sch-tile is-live">
                    <TileInner tile={tile} />
                  </Link>
                )
              ) : (
                <div
                  key={tile.no}
                  className="sch-tile is-disabled"
                  aria-disabled="true"
                  title="In Vorbereitung"
                >
                  <TileInner tile={tile} />
                </div>
              )
            )}
          </section>
        </div>
      </main>

      <footer className="sch-foot">
        <span>Grabner Design · Kandern</span>
        <span>Schlutte — internes Intranet</span>
        <span>v 0.1 · MVP</span>
      </footer>
    </div>
  );
}
