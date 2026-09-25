"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Company } from "@/lib/auslagen/types";
import { CompanyForm } from "./CompanyForm";
import { CreateCompanyForm } from "./CreateCompanyForm";
import { DeleteCompanyForm } from "./DeleteCompanyForm";

type Panel = "none" | "create" | "delete";

/**
 * Gesamter Seiteninhalt als Client-Komponente, damit die beiden Buttons oben
 * im Kopf ("Firma anlegen" / "Firma löschen") das jeweilige Formular direkt
 * darunter, aber außerhalb des <header>, auf- und zuklappen können.
 */
export function EinstellungenView({ companies, loadError }: { companies: Company[]; loadError: string | null }) {
  const [panel, setPanel] = useState<Panel>("none");
  const toggle = (next: Panel) => setPanel((current) => (current === next ? "none" : next));

  return (
    <>
      <header className="aus-head">
        <span className="aus-eyebrow">Auslagen &amp; Belege · Finanzen</span>
        <h1 className="aus-h1">Einstellungen</h1>
        <p className="aus-lede">
          Firmen, für die Anträge auf Auslagenerstattung gestellt werden. Die Adresse erscheint im
          Antrag, an die Empfänger-E-Mail wird er geschickt.
        </p>
        {!loadError && (
          <div className="aus-actions aus-head-actions">
            <button
              type="button"
              className="aus-btn aus-btn-secondary"
              aria-pressed={panel === "create"}
              onClick={() => toggle("create")}
            >
              <Icon name="plus" size={16} />
              Firma anlegen
            </button>
            <button
              type="button"
              className="aus-btn aus-btn-quiet"
              aria-pressed={panel === "delete"}
              onClick={() => toggle("delete")}
            >
              <Icon name="trash" size={16} />
              Firma löschen
            </button>
          </div>
        )}
      </header>

      {panel === "create" && <CreateCompanyForm />}
      {panel === "delete" && <DeleteCompanyForm companies={companies.map(({ id, name }) => ({ id, name }))} />}

      {loadError ? (
        <div className="aus-note is-danger" role="alert">
          <div className="aus-note-body">
            <p className="aus-note-title">Firmen konnten nicht geladen werden</p>
            <p>{loadError}</p>
          </div>
        </div>
      ) : (
        <div className="aus-stack">
          {companies.length === 0 && (
            <div className="aus-empty">
              <p className="aus-empty-title">Noch keine Firmen</p>
              <p className="aus-help">Über „Firma anlegen“ oben die erste Firma anlegen.</p>
            </div>
          )}
          {companies.map((company, i) => (
            <CompanyForm key={company.id} company={company} index={i + 1} />
          ))}
        </div>
      )}
    </>
  );
}
