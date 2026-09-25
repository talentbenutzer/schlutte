import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth/roles";
import { AUSLAGEN_VERSION } from "@/lib/auslagen/version";
import { AUSLAGEN_CHANGELOG } from "@/lib/auslagen/changelog";

/**
 * Funktionsübersicht des Auslagen-Bereichs: für Mitarbeiter die eigenen
 * Möglichkeiten, für CEO/Admin zusätzlich Antragseingang und Abgleich.
 * Kein Ersatz für docs/AUSLAGEN-SETUP.md (dort steht die Einrichtung).
 */
export default async function AuslagenInfoPage() {
  const ctx = await getCurrentUserContext();
  if (!ctx) redirect("/login?next=/auslagen/info");
  const finance = ctx.isFinance;

  return (
    <>
      <header className="aus-head">
        <span className="aus-eyebrow">Auslagen &amp; Belege</span>
        <h1 className="aus-h1">Was die App kann</h1>
        <p className="aus-lede">
          Kurzüberblick über den Funktionsstand{finance ? " — inklusive Kreditkartenabgleich" : ""}.
        </p>
      </header>

      <section className="aus-section aus-stack">
        <div className="aus-section-head">
          <h2 className="aus-h2">Belege erfassen</h2>
        </div>
        <div className="aus-card">
          <ul className="aus-list-plain">
            <li>Foto mit dem iPhone aufnehmen oder Bild/PDF hochladen, auch mehrere auf einmal.</li>
            <li>Die KI liest Datum, Händler, Beträge und MwSt aus dem Beleg aus; die Angaben werden vor dem Speichern geprüft.</li>
            <li>Zahlungsweg wählen: privat bezahlt (für den eigenen Antrag) oder Firmenkarte — AMEX, Kreditkarte, EC, Bar, Tank- &amp; Raststätten (für den Abgleich).</li>
            <li>Bei Beträgen über 250 € weist die App auf eine vollständige Rechnung mit Firmenanschrift hin.</li>
          </ul>
        </div>
      </section>

      <section className="aus-section aus-stack">
        <div className="aus-section-head">
          <h2 className="aus-h2">Antrag auf Auslagenerstattung</h2>
        </div>
        <div className="aus-card">
          <ul className="aus-list-plain">
            <li>Privat bezahlte Belege chronologisch zu einem Antrag zusammenfassen, mit Netto-, MwSt- und Bruttosumme.</li>
            <li>Firma wählen — Grabner Design oder höllental — mit deren hinterlegter Anschrift und Empfänger-E-Mail.</li>
            <li>Unterschrift per Finger, danach PDF mit Antrag und allen angehängten Belegen erzeugen.</li>
            <li>Versand über die Teilen-Funktion des iPhones an Mail; die App verschickt aktuell noch keine E-Mails selbst.</li>
            <li>Nach dem tatsächlichen Versand als „Eingereicht“ markieren.</li>
          </ul>
          <div className="aus-note is-warn">
            <div className="aus-note-body">
              <p className="aus-note-title">Angedacht</p>
              <p>
                Der Versand direkt aus der App an die hinterlegte Firmen-E-Mail ist geplant, aber noch nicht
                umgesetzt. Admins sollen das je Firma unter Einstellungen ein- und ausschalten können.
              </p>
            </div>
          </div>
        </div>
      </section>

      {finance && (
        <>
          <section className="aus-section aus-stack">
            <div className="aus-section-head">
              <h2 className="aus-h2">Antragseingang (CEO/Admin)</h2>
            </div>
            <div className="aus-card">
              <ul className="aus-list-plain">
                <li>Eingereichte Anträge aller Mitarbeiter, mit Markierung für ungelesene.</li>
                <li>PDFs einzeln oder gesammelt als ZIP herunterladen.</li>
              </ul>
            </div>
          </section>

          <section className="aus-section aus-stack">
            <div className="aus-section-head">
              <h2 className="aus-h2">Kreditkartenabgleich (CEO/Admin)</h2>
            </div>
            <div className="aus-card">
              <ul className="aus-list-plain">
                <li>Mehrere Kreditkarten anlegen und verwalten.</li>
                <li>PDF-Abrechnung hochladen — die KI liest die einzelnen Buchungen aus.</li>
                <li>Automatischer Abgleich Buchung ↔ Beleg über Betrag, Datum und Händlername; unklare Fälle werden von Hand zugeordnet.</li>
                <li>Firmenzahlungen ohne Kartenbuchung lassen sich manuell als geprüft markieren.</li>
                <li>Export der geprüften Abrechnung samt Belegen als PDF-Belegmappe.</li>
                <li>
                  Original-Belegfotos werden 30 Tage, nachdem sie einer Kartenbuchung zugeordnet wurden,
                  automatisch aus dem Speicher gelöscht. Die erfassten Daten (Betrag, Datum, Händler, MwSt) bleiben
                  erhalten — nur die Bilddatei verschwindet.
                </li>
              </ul>
            </div>
          </section>
        </>
      )}

      <section className="aus-section aus-stack">
        <div className="aus-section-head">
          <h2 className="aus-h2">Rollen und Zugriff</h2>
        </div>
        <div className="aus-card">
          <ul className="aus-list-plain">
            <li>Mitarbeiter sehen und bearbeiten ausschließlich ihre eigenen Belege und Anträge.</li>
            <li>CEO und Admin haben dieselben Verwaltungsrechte: Mitarbeiterverwaltung, Kreditkarten, Firmeneinstellungen, Antragseingang und Abgleich.</li>
          </ul>
        </div>
      </section>

      <section className="aus-section aus-stack">
        <div className="aus-section-head">
          <h2 className="aus-h2">Auf dem iPhone, ohne App Store</h2>
        </div>
        <div className="aus-card">
          <p>
            Diese Adresse in <strong>Safari</strong> unter <code>/auslagen</code> öffnen. Über{" "}
            <strong>Teilen → Zum Home-Bildschirm</strong> wird „Belege“ installiert und startet direkt in diesem
            Bereich. Beim ersten Start kann eine erneute Anmeldung nötig sein.
          </p>
        </div>
      </section>

      <section className="aus-section aus-stack">
        <div className="aus-section-head">
          <h2 className="aus-h2">Rechtlicher Hinweis</h2>
        </div>
        <div className="aus-card">
          <p>
            Originalbelege müssen aufbewahrt und auf Verlangen im Original vorgelegt werden. Die App macht keine
            Aussage darüber, ob ein digitalisierter Beleg die papiergebundene Aufbewahrung im konkreten Fall
            ersetzen darf — das klärt die Steuerberatung.
          </p>
        </div>
      </section>

      <section className="aus-section aus-stack">
        <div className="aus-section-head">
          <h2 className="aus-h2">Versionsstand</h2>
          <span className="aus-chip is-plain">v{AUSLAGEN_VERSION}</span>
        </div>
        <div className="aus-stack">
          {AUSLAGEN_CHANGELOG.map((entry) => (
            <div className="aus-card" key={entry.version}>
              <div className="aus-card-head">
                <span className="aus-card-title">Version {entry.version}</span>
                <span className="aus-muted">{entry.date}</span>
              </div>
              <ul className="aus-list-plain">
                {entry.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
