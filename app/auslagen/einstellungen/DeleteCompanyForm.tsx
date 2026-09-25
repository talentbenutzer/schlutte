"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import type { Company } from "@/lib/auslagen/types";
import { deleteCompanyAction } from "./actions";

/**
 * Firma löschen — schlägt fehl, solange noch Kreditkarten oder Anträge auf
 * sie verweisen (Fremdschlüssel-Schutz in der Datenbank, siehe deleteCompany).
 */
export function DeleteCompanyForm({ companies }: { companies: Pick<Company, "id" | "name">[] }) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(companies[0]?.id || "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const selected = companies.find((c) => c.id === companyId);

  function remove() {
    if (!selected) return;
    if (!confirm(`„${selected.name}“ wirklich löschen? Das kann nicht rückgängig gemacht werden.`)) return;
    setError("");
    startTransition(async () => {
      const result = await deleteCompanyAction(selected.id);
      if (!result.ok) setError(result.error || "Löschen fehlgeschlagen.");
      else router.refresh();
    });
  }

  return (
    <div className="aus-card">
      <div className="aus-card-head">
        <h2 className="aus-card-title">Firma löschen</h2>
      </div>
      {error && (
        <div className="aus-note is-danger" role="alert">
          <span className="aus-note-icon" aria-hidden="true">
            <Icon name="alert" size={18} />
          </span>
          <div className="aus-note-body">
            <p>{error}</p>
          </div>
        </div>
      )}
      {companies.length === 0 ? (
        <p className="aus-help">Keine Firma vorhanden.</p>
      ) : (
        <>
          <div className="aus-field">
            <label htmlFor="loesch-firma" className="aus-label">
              Firma
            </label>
            <select
              id="loesch-firma"
              className="aus-select"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              disabled={pending}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className="aus-help">
              Geht nur, solange keine Kreditkarte und kein Antrag mehr auf diese Firma verweist.
            </span>
          </div>
          <div className="aus-actions">
            <button type="button" className="aus-btn aus-btn-danger" onClick={remove} disabled={pending || !selected}>
              <Icon name="trash" size={16} />
              {pending ? "Wird gelöscht …" : "Firma löschen"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
