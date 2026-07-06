import Link from "next/link";
import { EmployeeForm } from "../EmployeeForm";

export default function NeuMitarbeiterPage() {
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
        Neuer Mitarbeiter
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
        Lege einen neuen Mitarbeiter an. Mit E-Mail und Passwort wird direkt ein
        Login erstellt — ohne Passwort entsteht nur der Datensatz (Login später
        über „Bearbeiten").
      </p>
      <EmployeeForm />
    </div>
  );
}
