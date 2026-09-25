import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { hasAdminRights } from "@/lib/auth/app-role";
import { getCurrentUserContext } from "@/lib/auth/roles";

/**
 * Mitarbeiterverwaltung ist für CEO und Administratoren zugänglich.
 * Andere Nutzer werden auf die Startseite umgeleitet.
 */
export default async function MitarbeiterLayout({
  children,
}: {
  children: ReactNode;
}) {
  const ctx = await getCurrentUserContext();
  if (!ctx || !hasAdminRights(ctx.role)) {
    redirect("/start");
  }
  return <>{children}</>;
}
