"use server";

import { revalidatePath } from "next/cache";
import { errorMessage } from "@/lib/auslagen/errors";
import { applicantFromProfile } from "@/lib/auslagen/profile";
import { createClaim, deleteClaim, markClaimSent, setClaimPdfPath } from "@/lib/data/auslagen-claims";
import type { ApplicantSnapshot } from "@/lib/auslagen/types";

type Result = { ok: boolean; id?: string; error?: string };

export async function createClaimAction(input: { companyId: string; receiptIds: string[]; applicant: ApplicantSnapshot; place: string; claimDate: string; signaturePng: string | null }): Promise<Result> {
  try {
    const claim = await createClaim({ ...input, applicant: applicantFromProfile(input.applicant) });
    revalidatePath("/auslagen"); revalidatePath("/auslagen/antraege");
    return { ok: true, id: claim.id };
  } catch (e) { return { ok: false, error: errorMessage(e) }; }
}

export async function setClaimPdfPathAction(id: string, path: string): Promise<Result> {
  try { await setClaimPdfPath(id, path); revalidatePath(`/auslagen/antraege/${id}`); return { ok: true }; }
  catch (e) { return { ok: false, error: errorMessage(e) }; }
}

export async function markClaimSentAction(id: string): Promise<Result> {
  try { await markClaimSent(id); revalidatePath(`/auslagen/antraege/${id}`); revalidatePath("/auslagen/antraege"); return { ok: true }; }
  catch (e) { return { ok: false, error: errorMessage(e) }; }
}

export async function deleteClaimAction(id: string): Promise<Result> {
  try { await deleteClaim(id); revalidatePath("/auslagen"); revalidatePath("/auslagen/antraege"); return { ok: true }; }
  catch (e) { return { ok: false, error: errorMessage(e) }; }
}
