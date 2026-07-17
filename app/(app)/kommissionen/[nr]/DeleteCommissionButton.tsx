"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { deleteCommissionAction } from "./actions";

export function DeleteCommissionButton({
  commissionNo,
  client,
  documentCount,
}: {
  commissionNo: string;
  client: string;
  documentCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleDelete = () => {
    const docsHint =
      documentCount > 0
        ? `\n\nDabei werden auch ${documentCount} zugehörige${documentCount === 1 ? "s" : ""} Dokument${documentCount === 1 ? "" : "e"} (Palettenlabel intern & Palettenversand-Labels) unwiderruflich gelöscht.`
        : "";
    const confirmed = window.confirm(
      `Kommission ${commissionNo} (${client}) wirklich löschen?${docsHint}\n\nDieser Schritt kann nicht rückgängig gemacht werden.`
    );
    if (!confirmed) return;

    setError("");
    startTransition(async () => {
      const result = await deleteCommissionAction(commissionNo);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/kommissionen");
      router.refresh();
    });
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="grb-btn grb-btn-quiet"
      title={error || "Kommission löschen"}
      style={{ color: "var(--gd-danger)", opacity: isPending ? 0.5 : 1 }}
    >
      <Icon name="x" size={14} /> {isPending ? "Wird gelöscht …" : "Löschen"}
    </button>
  );
}
