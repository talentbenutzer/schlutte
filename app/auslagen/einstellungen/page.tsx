import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth/roles";
import { getCompanies } from "@/lib/data/auslagen-settings";
import { errorMessage } from "@/lib/auslagen/errors";
import type { Company } from "@/lib/auslagen/types";
import { EinstellungenView } from "./EinstellungenView";

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

  return <EinstellungenView companies={companies} loadError={loadError} />;
}
