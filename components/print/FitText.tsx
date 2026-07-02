"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Rendert Text bei `maxFontSize` und verkleinert ihn proportional (einheitlich),
 * sobald er breiter als das umgebende Feld wird. Kürzerer Text bleibt bei voller Größe.
 * Die Messung läuft im Browser (auch vor dem Druck) und reagiert auf Breiten- und
 * Font-Load-Änderungen.
 */
export function FitText({
  text,
  maxFontSize,
  style,
}: {
  text: string;
  maxFontSize: number;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const container = el?.parentElement;
    if (!el || !container) return;

    const measure = () => {
      el.style.fontSize = `${maxFontSize}px`;
      const natural = el.scrollWidth;
      const avail = container.clientWidth;
      if (natural > avail && natural > 0) {
        el.style.fontSize = `${maxFontSize * (avail / natural)}px`;
      }
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
  }, [text, maxFontSize]);

  return (
    <div style={{ width: "100%", overflow: "hidden" }}>
      <span
        ref={ref}
        style={{
          display: "inline-block",
          whiteSpace: "nowrap",
          fontSize: maxFontSize,
          ...style,
        }}
      >
        {text}
      </span>
    </div>
  );
}
