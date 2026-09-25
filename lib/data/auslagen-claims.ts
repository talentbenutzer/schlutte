import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/roles";
import { AuslagenError, toAuslagenError } from "@/lib/auslagen/errors";
import { isISODate, isValidIban, round2 } from "@/lib/auslagen/format";
import { getMissingProfileFields } from "@/lib/auslagen/profile";
import { AUSLAGEN_BUCKET, claimPdfPath, isOwnStoragePath, SIGNED_URL_TTL_SECONDS } from "@/lib/auslagen/paths";
import { getCompany, isCompanyId } from "@/lib/data/auslagen-settings";
import type { ApplicantSnapshot, ExpenseClaim, Receipt } from "@/lib/auslagen/types";

const CLAIM_COLUMNS = "id, user_id, company_id, recipient_email, applicant, place, claim_date, signature_png, total_gross, receipt_count, pdf_path, status, sent_at, created_at, updated_at";
const RECEIPT_COLUMNS = "id, user_id, status, receipt_date, merchant, description, currency, gross_amount, net_amount, vat_amount, vat_rate, gross_amount_eur, payment_method, credit_card_id, file_path, file_mime, file_name, extraction, extraction_error, claim_id, created_at, updated_at";

export async function listOwnClaims(): Promise<ExpenseClaim[]> {
  const { userId } = await requireUser();
  const db = await createClient();
  const { data, error } = await db.from("expense_claims").select(CLAIM_COLUMNS).eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw toAuslagenError(error, "Anträge konnten nicht geladen werden");
  return (data ?? []) as ExpenseClaim[];
}

export async function getClaim(id: string): Promise<ExpenseClaim> {
  const { userId } = await requireUser();
  const db = await createClient();
  const { data, error } = await db.from("expense_claims").select(CLAIM_COLUMNS).eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) throw toAuslagenError(error, "Antrag konnte nicht geladen werden");
  if (!data) throw new AuslagenError("not_found", "Antrag nicht gefunden.");
  return data as ExpenseClaim;
}

export async function getClaimReceipts(id: string): Promise<Receipt[]> {
  await getClaim(id);
  const db = await createClient();
  const { data, error } = await db.from("receipts").select(RECEIPT_COLUMNS).eq("claim_id", id).order("receipt_date", { ascending: true });
  if (error) throw toAuslagenError(error, "Antragsbelege konnten nicht geladen werden");
  return (data ?? []) as Receipt[];
}

export async function createClaim(input: { companyId: string; receiptIds: string[]; applicant: ApplicantSnapshot; place: string; claimDate: string; signaturePng: string | null }): Promise<ExpenseClaim> {
  const { userId } = await requireUser();
  if (!isCompanyId(input.companyId)) throw new AuslagenError("validation", "Bitte eine Firma wählen.");
  const company = await getCompany(input.companyId);
  if (!company) throw new AuslagenError("validation", "Firma nicht gefunden.");
  const ids = [...new Set(input.receiptIds)];
  if (!ids.length || ids.length > 100 || ids.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) throw new AuslagenError("validation", "Bitte mindestens einen gültigen Beleg wählen.");
  if (getMissingProfileFields(input.applicant).length || !isValidIban(input.applicant.iban)) {
    throw new AuslagenError("validation", "Bitte vollständige Antragstellerdaten und eine gültige IBAN angeben.");
  }
  if (!isISODate(input.claimDate)) throw new AuslagenError("validation", "Bitte ein gültiges Antragsdatum angeben.");
  if (!input.signaturePng || !input.signaturePng.startsWith("data:image/png;base64,") || input.signaturePng.length > 300_000) {
    throw new AuslagenError("validation", "Die Unterschrift ist ungültig oder zu groß.");
  }
  const db = await createClient();
  const { data: receipts, error: readError } = await db.from("receipts").select("id, gross_amount, gross_amount_eur, currency").eq("user_id", userId).eq("status", "erfasst").eq("payment_method", "privat").is("claim_id", null).in("id", ids);
  if (readError) throw toAuslagenError(readError, "Belege konnten nicht geprüft werden");
  if (receipts?.length !== ids.length || receipts.some((r) => r.gross_amount === null || Number(r.gross_amount) < 0 || (r.currency !== "EUR" && (r.gross_amount_eur === null || Number(r.gross_amount_eur) < 0)))) {
    throw new AuslagenError("conflict", "Ein ausgewählter Beleg ist nicht mehr verfügbar oder unvollständig.");
  }
  const total = round2(receipts.reduce((sum, r) => sum + Number(r.currency === "EUR" ? r.gross_amount : r.gross_amount_eur), 0));
  const { data: claim, error: insertError } = await db.from("expense_claims").insert({
    user_id: userId, company_id: input.companyId, recipient_email: company.recipient_email,
    applicant: input.applicant, place: input.place.trim().slice(0, 120) || null, claim_date: input.claimDate,
    signature_png: input.signaturePng, total_gross: total, receipt_count: ids.length,
  }).select(CLAIM_COLUMNS).single();
  if (insertError) throw toAuslagenError(insertError, "Antrag konnte nicht erstellt werden");
  const { data: updated, error: linkError } = await db.from("receipts").update({ claim_id: claim.id }).eq("user_id", userId).eq("status", "erfasst").eq("payment_method", "privat").is("claim_id", null).in("id", ids).select("id");
  if (linkError || updated?.length !== ids.length) {
    // FK on delete set null gibt alle bereits verknüpften Belege wieder frei.
    await db.from("expense_claims").delete().eq("id", claim.id).eq("user_id", userId);
    throw new AuslagenError("conflict", "Belege haben sich geändert. Bitte den Antrag erneut erstellen.");
  }
  return claim as ExpenseClaim;
}

export async function setClaimPdfPath(id: string, path: string): Promise<void> {
  const claim = await getClaim(id);
  if (claim.status !== "erstellt" || !isOwnStoragePath(path, claim.user_id, "antraege") || path !== claimPdfPath(claim.user_id, id)) {
    throw new AuslagenError("validation", "Ungültiger PDF-Pfad.");
  }
  const db = await createClient();
  const { data: file, error: fileError } = await db.storage.from(AUSLAGEN_BUCKET).download(path);
  if (fileError || !file || file.size > 25 * 1024 * 1024 || (await file.slice(0, 5).text()) !== "%PDF-") {
    throw new AuslagenError("validation", "Antrags-PDF fehlt oder ist ungültig.");
  }
  const { data, error } = await db.from("expense_claims").update({ pdf_path: path }).eq("id", id).eq("user_id", claim.user_id).select("id").maybeSingle();
  if (error || !data) throw toAuslagenError(error, "PDF konnte nicht gespeichert werden");
}

export async function signedClaimUrl(claim: ExpenseClaim): Promise<string | null> {
  if (!claim.pdf_path) return null;
  const db = await createClient();
  const { data, error } = await db.storage.from(AUSLAGEN_BUCKET).createSignedUrl(claim.pdf_path, SIGNED_URL_TTL_SECONDS);
  if (error) throw toAuslagenError(error, "Antrags-PDF konnte nicht geladen werden");
  return data.signedUrl;
}

export async function markClaimSent(id: string): Promise<void> {
  const claim = await getClaim(id);
  if (!claim.pdf_path) throw new AuslagenError("validation", "Bitte zuerst das PDF erzeugen.");
  const db = await createClient();
  const { data, error } = await db.from("expense_claims").update({ status: "versendet", sent_at: new Date().toISOString() }).eq("id", id).eq("user_id", claim.user_id).eq("status", "erstellt").select("id").maybeSingle();
  if (error || !data) throw toAuslagenError(error, "Status konnte nicht gespeichert werden");
}

export async function deleteClaim(id: string): Promise<void> {
  const claim = await getClaim(id);
  if (claim.status !== "erstellt") throw new AuslagenError("forbidden", "Versendete Anträge können nicht gelöscht werden.");
  const db = await createClient();
  const { data, error } = await db.from("expense_claims").delete().eq("id", id).eq("user_id", claim.user_id).eq("status", "erstellt").select("id").maybeSingle();
  if (error || !data) throw toAuslagenError(error, "Antrag konnte nicht gelöscht werden");
  if (claim.pdf_path) await db.storage.from(AUSLAGEN_BUCKET).remove([claim.pdf_path]);
}
