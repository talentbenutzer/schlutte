import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/data/employees";

/**
 * Mitarbeiterverwaltung ist ausschließlich für Administratoren.
 * Nicht-Admins werden auf die Startseite umgeleitet.
 */
export default async function MitarbeiterLayout({
  children,
}: {
  children: ReactNode;
}) {
  const me = await getCurrentEmployee();
  if (!me?.is_admin) {
    redirect("/start");
  }
  return <>{children}</>;
}
