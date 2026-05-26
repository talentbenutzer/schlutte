export function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <div className="grb-brand">
      <span
        className="grb-brand-mark"
        style={light ? { color: "var(--gd-bone)" } : undefined}
      >
        Grabner
      </span>
      <span className="grb-brand-sub">SCHLUTTE</span>
    </div>
  );
}
