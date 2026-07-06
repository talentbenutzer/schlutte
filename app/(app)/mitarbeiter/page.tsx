import Link from "next/link";
import { getEmployees } from "@/lib/data/employees";
import { getLoginEmails } from "@/lib/data/auth-admin";
import { Icon } from "@/components/ui/Icon";
import { EmployeeActions } from "./EmployeeActions";

export default async function MitarbeiterPage() {
  const employees = await getEmployees();

  // Login-Status je Mitarbeiter (per E-Mail). Bei fehlender Konfiguration null → Status unbekannt.
  let loginEmails: Set<string> | null = null;
  try {
    loginEmails = await getLoginEmails();
  } catch {
    loginEmails = null;
  }

  return (
    <div
      style={{
        padding: "40px 56px 80px",
        maxWidth: 1100,
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 32,
          paddingBottom: 18,
          borderBottom: "1px solid var(--fg)",
        }}
      >
        <div>
          <span className="grb-eyebrow">Verwaltung</span>
          <h1
            className="grb-h-h1"
            style={{ marginTop: 6, fontSize: 40, letterSpacing: "-0.02em" }}
          >
            Mitarbeiter
          </h1>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "var(--fg-muted)",
              marginTop: 6,
            }}
          >
            Kürzel, Zugangsdaten und Status verwalten. Inaktive Mitarbeiter
            erscheinen nicht mehr in Auswahlfeldern.
          </p>
        </div>
        <Link href="/mitarbeiter/neu" className="grb-btn grb-btn-primary">
          <Icon name="plus" size={14} /> Neuer Mitarbeiter
        </Link>
      </div>

      {/* Tabelle */}
      {employees.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--border-strong)",
            padding: "32px 28px",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--fg-muted)",
            textAlign: "center",
          }}
        >
          Noch keine Mitarbeiter angelegt.
        </div>
      ) : (
        <table className="grb-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>Kürzel</th>
              <th>Name</th>
              <th>E-Mail</th>
              <th>Login</th>
              <th>Status</th>
              <th>Rolle</th>
              <th>Angelegt</th>
              <th style={{ textAlign: "right" }}>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr
                key={emp.id}
                style={emp.is_active === false ? { opacity: 0.5 } : undefined}
              >
                <td>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      fontWeight: 600,
                      letterSpacing: "0.12em",
                      color: "var(--accent)",
                    }}
                  >
                    {emp.initials}
                  </span>
                </td>
                <td style={{ fontWeight: 500 }}>{emp.name}</td>
                <td
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--fg-muted)",
                  }}
                >
                  {emp.email || "—"}
                </td>
                <td>
                  {loginEmails === null ? (
                    <span
                      title="Login-Status nicht verfügbar (Service-Role-Key fehlt)"
                      style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-subtle)" }}
                    >
                      ?
                    </span>
                  ) : emp.email && loginEmails.has(emp.email.toLowerCase()) ? (
                    <span
                      title="Login vorhanden"
                      style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)" }}
                    >
                      ✓ Login
                    </span>
                  ) : (
                    <span
                      title={emp.email ? "Kein Login — beim Passwort-Setzen wird einer angelegt" : "Keine E-Mail hinterlegt"}
                      style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-subtle)" }}
                    >
                      —
                    </span>
                  )}
                </td>
                <td>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: emp.is_active !== false ? "var(--fg)" : "var(--fg-subtle)",
                    }}
                  >
                    {emp.is_active !== false ? "Aktiv" : "Inaktiv"}
                  </span>
                </td>
                <td>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: emp.is_admin ? "var(--accent)" : "var(--fg-muted)",
                    }}
                  >
                    {emp.is_admin ? "Admin" : "Mitarbeiter"}
                  </span>
                </td>
                <td className="mono" style={{ color: "var(--fg-muted)" }}>
                  {emp.created_at}
                </td>
                <td style={{ textAlign: "right" }}>
                  <EmployeeActions
                    id={emp.id!}
                    isActive={emp.is_active !== false}
                    name={emp.name}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
