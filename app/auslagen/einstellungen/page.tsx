import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth/roles";
import { getCompanies } from "@/lib/data/auslagen-settings";
import { errorMessage } from "@/lib/auslagen/errors";
import type { Company } from "@/lib/auslagen/types";
import { CompanyForm } from "./CompanyForm";
import { CreateCompanyForm } from "./CreateCompanyForm";

export const metadata: Metadata = { title: "Einstellungen" };

export default async function EinstellungenPage() {
  const ctx = await getCurrentUserContext();
  if (!ctx) redirect("/login?next=/auslagen/einstellungen");
  // Nur Finanz-Rolle (CEO/Admin).
  if (!ctx.isFinance) redirect("/auslagen");

  let companies: Company[] = [];
  let loadError: string | null = null;
  try {
    companies = await getCompanies();
  } catch (e) {
    loadError = errorMessage(e);
  }

  return (
    <>
      <header className="aus-head">
        <span className="aus-eyebrow">Auslagen &amp; Belege · Finanzen</span>
        <h1 className="aus-h1">Einstellungen</h1>
        <p className="aus-lede">
          Firmen, für die Anträge auf Auslagenerstattung gestellt werden. Die Adresse erscheint im
          Antrag, an die Empfänger-E-Mail wird er geschickt.
        </p>
      </header>

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
              <p className="aus-help">Lege unten die erste Firma an.</p>
            </div>
          )}
          {companies.map((company, i) => (
            <CompanyForm key={company.id} company={company} index={i + 1} />
          ))}
          <CreateCompanyForm />
        </div>
      )}
    </>
  );
}
