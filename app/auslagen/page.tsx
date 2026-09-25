import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { OriginalHint } from "@/components/auslagen/OriginalHint";

// Übersicht (Phase 1): Platzhalter-Liste — die Belegliste mit Filtern folgt in Phase 2.
export default function AuslagenPage() {
  return (
    <>
      <header className="aus-head">
        <span className="aus-eyebrow">Auslagen &amp; Belege</span>
        <h1 className="aus-h1">Belege</h1>
        <p className="aus-lede">
          Quittungen und Rechnungen fotografieren oder hochladen. Aus offenen Belegen entsteht der
          Antrag auf Auslagenerstattung.
        </p>
        <div className="aus-actions aus-head-actions">
          <Link href="/auslagen/erfassen" className="aus-btn aus-btn-primary">
            <Icon name="camera" size={16} />
            Beleg erfassen
          </Link>
          <Link href="/auslagen/antrag/neu" className="aus-btn aus-btn-secondary">
            <Icon name="doc-stripe" size={16} />
            Antrag erstellen
          </Link>
        </div>
      </header>

      <section className="aus-section" aria-labelledby="aus-belege-titel">
        <div className="aus-section-head">
          <h2 id="aus-belege-titel" className="aus-h2">
            Meine Belege
          </h2>
        </div>
        <div className="aus-empty">
          <Icon name="receipt" size={28} stroke={1.3} />
          <p className="aus-empty-title">Noch keine Belege</p>
          <p className="aus-help">Erfasste Quittungen und Rechnungen erscheinen hier.</p>
        </div>
      </section>

      <section className="aus-section">
        <OriginalHint />
      </section>
    </>
  );
}
