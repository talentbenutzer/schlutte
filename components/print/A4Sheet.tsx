import type { ReactNode } from "react";

export function A4Sheet({ children }: { children: ReactNode }) {
  return <article className="print-sheet">{children}</article>;
}

export function PrintHeader({
  printedBy,
  printedAt,
}: {
  printedBy: string;
  printedAt: string;
}) {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        paddingBottom: 10,
        borderBottom: "1px solid #0E0E0D",
      }}
    >
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/grabner-schlutte-logo.svg"
          alt="Grabner Schlutte"
          style={{ height: 30, width: "auto", display: "block" }}
        />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em", color: "#0E0E0D", textTransform: "uppercase", marginTop: 6 }}>
          High-End Interior Design · Versand
        </div>
      </div>
      <div style={{ textAlign: "right", fontFamily: "var(--font-sans)", fontSize: 10, color: "#5C5852", lineHeight: 1.5 }}>
        <div>Tüchlinger Weg 2 · 79400 Kandern</div>
        <div>info@grabner.design · +49 7626 977 21-0</div>
        <div style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginTop: 2 }}>
          {printedBy} · {printedAt}
        </div>
      </div>
    </header>
  );
}
