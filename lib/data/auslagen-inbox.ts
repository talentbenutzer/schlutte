import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireFinance } from "@/lib/auth/roles";
import { AuslagenError, toAuslagenError } from "@/lib/auslagen/errors";

export type InboxClaim = {
  id: string;
  companyId: string;
  applicantName: string;
  claimDate: string;
  sentAt: string;
  totalGross: number;
  receiptCount: number;
  receipts: { id: string; merchant: string; receiptDate: string | null; amount: number | null; currency: string }[];
  unread: boolean;
};

type ClaimRow = {
  id: string;
  user_id: string;
  company_id: string;
  applicant: { first_name?: string; last_name?: string } | null;
  claim_date: string;
  sent_at: string | null;
  total_gross: number;
  receipt_count: number;
  pdf_path: string | null;
};

export async function listSubmittedClaims(): Promise<InboxClaim[]> {
  const { userId } = await requireFinance();
  const db = await createClient();
  const claims: ClaimRow[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from("expense_claims")
      .select("id, user_id, company_id, applicant, claim_date, sent_at, total_gross, receipt_count, pdf_path")
      .eq("status", "versendet").neq("user_id", userId).not("pdf_path", "is", null)
      .order("sent_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + 499);
    if (error) throw toAuslagenError(error, "Eingereichte Anträge konnten nicht geladen werden");
    claims.push(...((data ?? []) as ClaimRow[]));
    if ((data ?? []).length < 500) break;
  }
  if (!claims.length) return [];
  const receiptsByClaim = new Map<string, InboxClaim["receipts"]>();
  for (let offset = 0; offset < claims.length; offset += 500) {
    const ids = claims.slice(offset, offset + 500).map((claim) => claim.id);
    const { data, error } = await db.from("receipts")
      .select("id, claim_id, merchant, receipt_date, currency, gross_amount, gross_amount_eur")
      .in("claim_id", ids).order("receipt_date", { ascending: true }).order("id");
    if (error) throw toAuslagenError(error, "Antragsbelege konnten nicht geladen werden");
    for (const receipt of data ?? []) {
      if (!receipt.claim_id) continue;
      const list = receiptsByClaim.get(receipt.claim_id) ?? [];
      const amount = receipt.currency === "EUR" ? receipt.gross_amount : receipt.gross_amount_eur;
      list.push({
        id: receipt.id,
        merchant: receipt.merchant || "Beleg",
        receiptDate: receipt.receipt_date,
        amount: amount === null ? null : Number(amount),
        currency: "EUR",
      });
      receiptsByClaim.set(receipt.claim_id, list);
    }
  }
  const readIds = new Set<string>();
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from("expense_claim_reads")
      .select("claim_id").eq("user_id", userId).order("claim_id").range(offset, offset + 499);
    if (error) throw toAuslagenError(error, "Lesestatus konnte nicht geladen werden");
    for (const row of data ?? []) readIds.add(row.claim_id);
    if ((data ?? []).length < 500) break;
  }
  return claims.map((claim) => ({
    id: claim.id,
    companyId: claim.company_id,
    applicantName: `${claim.applicant?.first_name ?? ""} ${claim.applicant?.last_name ?? ""}`.trim() || "Mitarbeiter",
    claimDate: claim.claim_date,
    sentAt: claim.sent_at ?? claim.claim_date,
    totalGross: Number(claim.total_gross),
    receiptCount: claim.receipt_count,
    receipts: receiptsByClaim.get(claim.id) ?? [],
    unread: !readIds.has(claim.id),
  }));
}

export async function getSubmittedClaimPdf(id: string): Promise<{ path: string; claimDate: string; applicantName: string }> {
  const { userId } = await requireFinance();
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AuslagenError("not_found", "Antrag nicht gefunden.");
  const db = await createClient();
  const { data, error } = await db.from("expense_claims")
    .select("user_id, applicant, claim_date, pdf_path")
    .eq("id", id).eq("status", "versendet").neq("user_id", userId).maybeSingle();
  if (error) throw toAuslagenError(error, "Antrag konnte nicht geladen werden");
  if (!data?.pdf_path) throw new AuslagenError("not_found", "Antrags-PDF nicht gefunden.");
  const applicant = data.applicant as ClaimRow["applicant"];
  return {
    path: data.pdf_path,
    claimDate: data.claim_date,
    applicantName: `${applicant?.first_name ?? ""} ${applicant?.last_name ?? ""}`.trim() || "Mitarbeiter",
  };
}

export async function markSubmittedClaimsRead(ids: string[]): Promise<void> {
  const { userId } = await requireFinance();
  const valid = [...new Set(ids)].filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (!valid.length || valid.length !== new Set(ids).size || valid.length > 500) {
    throw new AuslagenError("validation", "Ungültige Antragsauswahl.");
  }
  const db = await createClient();
  const { data: claims, error: claimsError } = await db.from("expense_claims")
    .select("id").in("id", valid).eq("status", "versendet").neq("user_id", userId);
  if (claimsError) throw toAuslagenError(claimsError, "Anträge konnten nicht geprüft werden");
  if (claims?.length !== valid.length) throw new AuslagenError("forbidden", "Ein Antrag ist nicht zugänglich.");
  const now = new Date().toISOString();
  const { error } = await db.from("expense_claim_reads").upsert(
    valid.map((claimId) => ({ claim_id: claimId, user_id: userId, read_at: now })),
    { onConflict: "claim_id,user_id" }
  );
  if (error) throw toAuslagenError(error, "Lesestatus konnte nicht gespeichert werden");
}
