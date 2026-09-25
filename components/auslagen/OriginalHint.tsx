import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

/**
 * Hinweis "Originalbelege aufbewahren" — überall dort einsetzen, wo Belege
 * erfasst oder Anträge erstellt werden (Klassen aus styles/auslagen.css).
 */
export function OriginalHint({ children }: { children?: ReactNode }) {
  return (
    <aside className="aus-note" role="note">
      <span className="aus-note-icon" aria-hidden="true">
        <Icon name="receipt" size={18} />
      </span>
      <div className="aus-note-body">
        <p className="aus-note-title">Originalbelege aufbewahren</p>
        <p>
          {children ??
            "Das Foto ersetzt den Beleg nicht: Quittungen und Rechnungen bitte im Original aufbewahren und auf Verlangen vorlegen."}
        </p>
      </div>
    </aside>
  );
}
