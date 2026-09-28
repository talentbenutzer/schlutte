import "server-only";

import { AuslagenError } from "./errors";
import { formatEUR } from "./format";
import type { ExpenseClaim } from "./types";
import { formatDate } from "../utils";

type ResendResponse = { id?: string; message?: string; error?: { message?: string } };

export async function sendClaimEmail(claim: ExpenseClaim, pdf: Blob): Promise<string> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EXPENSE_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new AuslagenError("validation", "Der automatische E-Mail-Versand ist noch nicht eingerichtet.");
  }
  if (!claim.recipient_email) {
    throw new AuslagenError("validation", "Für diese Firma ist noch keine Empfänger-E-Mail hinterlegt.");
  }
  if (pdf.size > 18 * 1024 * 1024) {
    throw new AuslagenError("validation", "Das Antrags-PDF ist für den E-Mail-Versand zu groß.");
  }

  const applicant = `${claim.applicant.first_name} ${claim.applicant.last_name}`.trim() || "Mitarbeiter";
  const subject = `Antrag auf Auslagenerstattung – ${applicant} – ${formatDate(claim.claim_date)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `expense-claim/${claim.id}`,
    },
    body: JSON.stringify({
      from,
      to: [claim.recipient_email],
      subject,
      text: [
        "Guten Tag,",
        "",
        `anbei erhalten Sie den eingereichten Antrag auf Auslagenerstattung von ${applicant}.`,
        `Antragsdatum: ${formatDate(claim.claim_date)}`,
        `Belege: ${claim.receipt_count}`,
        `Gesamtsumme: ${formatEUR(claim.total_gross)}`,
        "",
        "Diese E-Mail wurde automatisch über Schlutte Belege versendet.",
      ].join("\n"),
      attachments: [{
        filename: `Auslagenerstattung_${claim.claim_date}_${applicant.replace(/[^a-z0-9_-]+/gi, "_")}.pdf`,
        content: Buffer.from(await pdf.arrayBuffer()).toString("base64"),
        content_type: "application/pdf",
      }],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const result = await response.json().catch(() => ({})) as ResendResponse;
  if (!response.ok || !result.id) {
    const detail = result.message || result.error?.message;
    throw new AuslagenError("db", detail ? `E-Mail konnte nicht gesendet werden: ${detail}` : "E-Mail konnte nicht gesendet werden.");
  }
  return result.id;
}
