"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Rendert mehrere Zeilen (je Zeile ohne Umbruch, white-space: nowrap) und verkleinert
 * ALLE Zeilen einheitlich auf die Breite des Feldes, sodass auch die breiteste Zeile
 * ohne Zeilenumbruch passt. Deckel bei `maxFontSize`; kürzere Zeilen bleiben bei voller Größe.
 * Messung läuft im Browser (auch vor dem Druck) und reagiert auf Breite und Font-Load.
 */
export function FitLines({
  lines,
  maxFontSize,
  gap = 2,
  style,
}: {
  lines: string[];
  maxFontSize: number;
  gap?: number;
  style?: React.CSSProperties;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const rows = Array.from(
      container.querySelectorAll<HTMLElement>("[data-fit-line]")
    );
    if (rows.length === 0) return;

    const measure = () => {
      rows.forEach((r) => {
        r.style.fontSize = `${maxFontSize}px`;
      });
      const avail = container.clientWidth;
      let maxNatural = 0;
      rows.forEach((r) => {
        maxNatural = Math.max(maxNatural, r.scrollWidth);
      });
      const scale = maxNatural > avail && maxNatural > 0 ? avail / maxNatural : 1;
      const size = maxFontSize * scale;
      rows.forEach((r) => {
        r.style.fontSize = `${size}px`;
      });
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(container);

    let cancelled = false;
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) measure();
      });
    }

    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, [lines.join("\n"), maxFontSize]);

  return (
    <div ref={containerRef} style={{ width: "100%", overflow: "hidden" }}>
      {lines.map((line, i) => (
        <div
          key={i}
          data-fit-line
          style={{
            whiteSpace: "nowrap",
            fontSize: maxFontSize,
            marginTop: i === 0 ? 0 : gap,
            ...style,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}
