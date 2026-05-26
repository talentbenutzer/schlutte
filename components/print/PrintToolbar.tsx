"use client";

import { Icon } from "@/components/ui/Icon";
import Link from "next/link";

export function PrintToolbar({ backUrl }: { backUrl?: string }) {
  return (
    <div className="print-toolbar no-print">
      {backUrl ? (
        <Link
          href={backUrl}
          className="grb-btn grb-btn-quiet"
          style={{ background: "var(--bg-raised)" }}
        >
          <Icon name="arrow" size={14} style={{ transform: "rotate(180deg)" }} /> Zurück
        </Link>
      ) : (
        <button
          type="button"
          className="grb-btn grb-btn-quiet"
          onClick={() => window.history.back()}
          style={{ background: "var(--bg-raised)" }}
        >
          <Icon name="arrow" size={14} style={{ transform: "rotate(180deg)" }} /> Zurück
        </button>
      )}
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
