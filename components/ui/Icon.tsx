type IconName =
  | "search" | "plus" | "arrow" | "arrow-up-right" | "arrow-down"
  | "file" | "box" | "print" | "archive" | "duplicate" | "edit"
  | "check" | "chevron-right" | "chevron-down" | "more" | "filter"
  | "menu" | "x" | "eye" | "download" | "pkg" | "truck" | "star"
  | "doc-stripe" | "settings" | "grid" | "list" | "home" | "tag" | "pallet";

export function Icon({
  name,
  size = 18,
  stroke = 1.5,
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
    case "search":   return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case "plus":     return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
    case "arrow":    return <svg {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case "arrow-up-right": return <svg {...p}><path d="M7 17 17 7M8 7h9v9"/></svg>;
    case "arrow-down":     return <svg {...p}><path d="M12 5v14M5 12l7 7 7-7"/></svg>;
    case "file":     return <svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>;
    case "box":      return <svg {...p}><path d="m3 7 9 5 9-5"/><path d="M21 7v10l-9 5-9-5V7l9-5 9 5z"/></svg>;
    case "print":    return <svg {...p}><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;
    case "archive":  return <svg {...p}><rect x="2" y="3" width="20" height="5"/><path d="M4 8v12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8M10 12h4"/></svg>;
    case "duplicate": return <svg {...p}><rect x="9" y="9" width="13" height="13"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
    case "edit":     return <svg {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>;
    case "check":    return <svg {...p}><path d="M5 12.5 9.5 17 19 7.5"/></svg>;
    case "chevron-right": return <svg {...p}><path d="m9 6 6 6-6 6"/></svg>;
    case "chevron-down":  return <svg {...p}><path d="m6 9 6 6 6-6"/></svg>;
    case "more":     return <svg {...p}><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>;
    case "filter":   return <svg {...p}><path d="M3 5h18M6 12h12M10 19h4"/></svg>;
    case "menu":     return <svg {...p}><path d="M3 6h18M3 12h18M3 18h18"/></svg>;
    case "x":        return <svg {...p}><path d="M6 6 18 18M6 18 18 6"/></svg>;
    case "eye":      return <svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/></svg>;
    case "download": return <svg {...p}><path d="M12 3v12M6 11l6 6 6-6M5 21h14"/></svg>;
    case "pkg":      return <svg {...p}><path d="M16 3H8L3 8v8l5 5h8l5-5V8z"/><path d="M8 8h8M8 13h8"/></svg>;
    case "pallet":   return <svg {...p}><path d="M7 4h10v9H7z"/><path d="M12 4v9"/><path d="M3 14h18M3 18h18"/><path d="M5 14v4M12 14v4M19 14v4"/></svg>;
    case "truck":    return <svg {...p}><rect x="1" y="6" width="14" height="11"/><path d="M15 10h4l3 3v4h-7"/><circle cx="5.5" cy="19.5" r="2"/><circle cx="18" cy="19.5" r="2"/></svg>;
    case "star":     return <svg {...p}><path d="m12 3 2.7 6 6.3.6-4.7 4.3 1.4 6.1L12 17l-5.7 3 1.4-6.1L3 9.6 9.3 9z"/></svg>;
    case "doc-stripe": return <svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M8 13h8M8 17h5"/></svg>;
    case "settings": return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1"/></svg>;
    case "grid":     return <svg {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
    case "list":     return <svg {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>;
    case "home":     return <svg {...p}><path d="m3 11 9-8 9 8M5 10v10h14V10"/></svg>;
    case "tag":      return <svg {...p}><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1"/></svg>;
    default: return null;
  }
}
