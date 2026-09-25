import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import "@/styles/auslagen.css";
import { getCurrentUserContext, roleLabel } from "@/lib/auth/roles";
import { AuslagenNav } from "./AuslagenNav";

export const dynamic = "force-dynamic";

// Manifest & Apple-Tags nur hier: Nur /auslagen wird als Home-Bildschirm-App "Belege" installiert.
export const metadata: Metadata = {
  title: { default: "Belege — Schlutte", template: "%s — Belege" },
  description: "Quittungen und Rechnungen erfassen, Auslagen erstatten lassen, Kreditkarten abgleichen.",
  manifest: "/auslagen.webmanifest",
  appleWebApp: { capable: true, title: "Belege", statusBarStyle: "default" },
  icons: {
    apple: [{ url: "/icons/belege-180.png", sizes: "180x180", type: "image/png" }],
  },
  // Next rendert für capable nur "mobile-web-app-capable"; ältere iOS-Versionen lesen das Apple-Tag.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF9F4" },
    { media: "(prefers-color-scheme: dark)", color: "#2A2926" },
  ],
  viewportFit: "cover",
};

export default async function AuslagenLayout({ children }: { children: ReactNode }) {
  // Rolle serverseitig ermitteln (steuert nur die Navigation; Seiten prüfen selbst).
  const ctx = await getCurrentUserContext();
  if (!ctx) redirect("/login?next=/auslagen");

  const initials =
    ctx.employee?.initials || (ctx.email ? ctx.email.slice(0, 3).toUpperCase() : "USR");
  const who = ctx.employee?.name || ctx.email || "Benutzer";

  return (
    <div className="aus">
      <header className="aus-top">
        <Link href="/start" className="aus-brand" aria-label="Zur Intranet-Startseite">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/grabner-schlutte-logo.svg" alt="Grabner Schlutte" className="grb-logo" />
        </Link>
        <span className="aus-brand-div" aria-hidden="true" />
        <Link href="/auslagen" className="aus-app-title">
          Belege
        </Link>
        <AuslagenNav variant="top" finance={ctx.isFinance} />
        <div className="aus-user" title={`${who} · ${roleLabel(ctx.role)}`}>
          <span className="aus-user-role">{roleLabel(ctx.role)}</span>
          <span className="aus-user-initials">{initials}</span>
        </div>
      </header>
      <main className="aus-main">{children}</main>
      <AuslagenNav variant="tabs" finance={ctx.isFinance} />
    </div>
  );
}
