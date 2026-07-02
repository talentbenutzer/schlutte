"use client";

import { useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { deleteDocumentAction } from "./actions";

export function DeleteDocumentButton({
  commissionNo,
  documentId,
  label,
}: {
  commissionNo: string;
  documentId: string;
  /** z. B. "Laufzettel" oder "Palette" — für die Rückfrage. */
  label: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    const confirmed = window.confirm(
      `${label} wirklich löschen? Dieser Schritt kann nicht rückgängig gemacht werden.`
    );
    if (!confirmed) return;
    startTransition(async () => {
      const result = await deleteDocumentAction(commissionNo, documentId);
      if (result.error) {
        alert(`Fehler: ${result.error}`);
      }
    });
  };

  return (
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
        opacity: isPending ? 0.5 : 1,
      }}
    >
      <Icon name="x" size={14} />
    </button>
  );
}
