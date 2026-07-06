import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmployeeById } from "@/lib/data/employees";
import { EmployeeForm } from "../../EmployeeForm";
import { EmployeePassword } from "../../EmployeePassword";

export default async function BearbeitenMitarbeiterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = await getEmployeeById(id);
  if (!employee) notFound();

  return (
    <div
      style={{
        padding: "40px 56px 80px",
        maxWidth: 760,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <Link
        href="/mitarbeiter"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.18em",
          color: "var(--fg-muted)",
          textTransform: "uppercase",
          textDecoration: "none",
        }}
      >
        ← Mitarbeiter
      </Link>
      <span className="grb-eyebrow" style={{ display: "block", marginTop: 18 }}>
        Mitarbeiterverwaltung
      </span>
      <h1 className="grb-h-h1" style={{ marginTop: 6 }}>
        {employee.name} bearbeiten
      </h1>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          color: "var(--fg-muted)",
          marginTop: 8,
          marginBottom: 32,
        }}
      >
        Kürzel: <strong>{employee.initials}</strong>
      </p>
      <EmployeeForm employee={employee} />
      <EmployeePassword employeeId={employee.id!} email={employee.email} />
    </div>
  );
}
