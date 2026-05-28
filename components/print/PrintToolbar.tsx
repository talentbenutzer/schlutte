"use client";

import { Icon } from "@/components/ui/Icon";

export function PrintToolbar({ backUrl }: { backUrl?: string }) {
  const handleClose = () => {
    // Druckseiten werden in einem neuen Tab geöffnet → window.close() funktioniert.
    window.close();
    // Fallback, falls der Browser das Schließen verweigert (Tab nicht per Skript geöffnet).
    setTimeout(() => {
      if (backUrl) {
        window.location.href = backUrl;
      } else {
        window.history.back();
      }
    }, 250);
  };

  return (
    <div className="print-toolbar no-print">
      <button
        type="button"
        className="grb-btn grb-btn-quiet"
        onClick={handleClose}
        style={{ background: "var(--bg-raised)" }}
      >
        <Icon name="x" size={14} /> Schließen
      </button>
      <button
        type="button"
        className="grb-btn grb-btn-primary"
        onClick={() => window.print()}
      >
        <Icon name="print" size={14} /> Drucken
      </button>
    </div>
  );
}
