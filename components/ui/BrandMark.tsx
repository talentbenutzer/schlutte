import { APP_VERSION } from "@/lib/version";

export function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <div className="grb-brand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/grabner-schlutte-logo.svg"
        alt="Grabner Schlutte"
        className="grb-logo"
        style={light ? { filter: "invert(1) brightness(1.6)" } : undefined}
      />
      <span
        className="grb-brand-version"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.14em",
          color: "var(--fg-subtle)",
          marginLeft: 8,
          alignSelf: "flex-end",
          paddingBottom: 2,
        }}
      >
        v{APP_VERSION}
      </span>
    </div>
  );
}
