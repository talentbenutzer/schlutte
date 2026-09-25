import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth/roles";
import { getOwnProfile } from "@/lib/data/auslagen-profile";
import { AuslagenError, errorMessage } from "@/lib/auslagen/errors";
import { formatIban } from "@/lib/auslagen/format";
import { splitFullName } from "@/lib/auslagen/profile";
import { PROFILE_FIELDS, type ExpenseProfile, type ProfileFieldKey } from "@/lib/auslagen/types";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilPage() {
  const ctx = await getCurrentUserContext();
  if (!ctx) redirect("/login?next=/auslagen/profil");

  let profile: ExpenseProfile | null = null;
  let loadError: string | null = null;
  let migrationMissing = false;
  try {
    profile = await getOwnProfile();
  } catch (e) {
    loadError = errorMessage(e);
    migrationMissing = e instanceof AuslagenError && e.code === "migration";
  }

  // Werte fürs Formular; ohne gespeichertes Profil aus dem Mitarbeiter-Namen vorbelegen.
  const initial = {} as Record<ProfileFieldKey, string>;
  for (const { key } of PROFILE_FIELDS) initial[key] = profile?.[key] ?? "";
  initial.iban = formatIban(initial.iban);
  if (!profile && ctx.employee?.name) {
    const { first_name, last_name } = splitFullName(ctx.employee.name);
    initial.first_name = first_name;
    initial.last_name = last_name;
    initial.account_holder = ctx.employee.name.trim();
  }

  return (
    <>
      <header className="aus-head">
        <span className="aus-eyebrow">Auslagen &amp; Belege</span>
        <h1 className="aus-h1">Profil</h1>
        <p className="aus-lede">
          Deine Angaben für den Antrag auf Auslagenerstattung. Sie werden in jeden neuen Antrag
          übernommen und lassen sich dort anpassen.
        </p>
      </header>

      {loadError && (
        <div className="aus-note is-danger" role="alert" style={{ marginBottom: 24 }}>
          <div className="aus-note-body">
            <p className="aus-note-title">Profil konnte nicht geladen werden</p>
            <p>{loadError}</p>
          </div>
        </div>
      )}

      <ProfileForm initial={initial} isNew={!profile} disabled={migrationMissing} />
    </>
  );
}
