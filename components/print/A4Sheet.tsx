import type { ReactNode } from "react";

export function A4Sheet({ children }: { children: ReactNode }) {
  return <article className="print-sheet">{children}</article>;
}

export function PrintHeader({
  printedBy,
  printedAt,
  logoSrc = "/brand/grabner-schlutte-logo.svg",
  logoAlt = "Grabner Schlutte",
  tagline = "High-End Interior Design · Versand",
}: {
  printedBy: string;
  printedAt: string;
  logoSrc?: string;
  logoAlt?: string;
  tagline?: string;
}) {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        paddingBottom: 10,
        borderBottom: "1px solid #000",
      }}
    >
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt={logoAlt}
          style={{ height: 30, width: "auto", display: "block" }}
        />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em", color: "#000", textTransform: "uppercase", marginTop: 6 }}>
          {tagline}
        </div>
      </div>
      <div style={{ textAlign: "right", fontFamily: "var(--font-sans)", fontSize: 10, color: "#000", lineHeight: 1.5 }}>
        <div>Tüchlinger Weg 2 · 79400 Kandern</div>
        <div>info@grabner.design · +49 7626 977 21-0</div>
        <div style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginTop: 2 }}>
          {printedBy} · {printedAt}
        </div>
      </div>
    </header>
  );
}
