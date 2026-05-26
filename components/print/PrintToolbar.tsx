"use client";

import { Icon } from "@/components/ui/Icon";

export function PrintToolbar() {
  return (
    <div className="print-toolbar no-print">
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
