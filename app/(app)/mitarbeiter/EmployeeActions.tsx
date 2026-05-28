"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { toggleActiveAction, deleteEmployeeAction } from "./actions";

export function EmployeeActions({
  id,
  isActive,
  name,
}: {
  id: string;
  isActive: boolean;
  name: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleToggleActive = () => {
    startTransition(async () => {
      await toggleActiveAction(id, !isActive);
    });
  };

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Mitarbeiter „${name}" wirklich löschen?\n\nFalls Dokumente mit diesem Kürzel verknüpft sind, wird der Mitarbeiter stattdessen nur auf inaktiv gesetzt.`
    );
    if (!confirmed) return;
    startTransition(async () => {
      const result = await deleteEmployeeAction(id);
      if (result.error) {
        alert(`Fehler: ${result.error}`);
      } else if (result.softOnly) {
        alert(
          `„${name}" hat verknüpfte Dokumente und wurde auf inaktiv gesetzt (nicht gelöscht).`
        );
      }
    });
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        opacity: isPending ? 0.5 : 1,
      }}
    >
      <Link
        href={`/mitarbeiter/${id}/bearbeiten`}
        style={{ padding: "4px 8px", color: "var(--fg-muted)" }}
        title="Bearbeiten"
      >
        <Icon name="edit" size={14} />
      </Link>
      <button
        onClick={handleToggleActive}
        disabled={isPending}
        title={isActive ? "Auf inaktiv setzen" : "Auf aktiv setzen"}
        style={{
          padding: "4px 8px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: isActive ? "var(--fg-muted)" : "var(--accent)",
        }}
      >
        <Icon name={isActive ? "eye" : "check"} size={14} />
      </button>
      <button
        onClick={handleDelete}
        disabled={isPending}
        title="Löschen"
        style={{
          padding: "4px 8px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--fg-subtle)",
        }}
      >
        <Icon name="x" size={14} />
      </button>
    </span>
  );
}
