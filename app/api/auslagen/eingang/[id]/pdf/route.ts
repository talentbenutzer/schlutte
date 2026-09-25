import { createClient } from "@/lib/supabase/server";
import { AUSLAGEN_BUCKET } from "@/lib/auslagen/paths";
import { getSubmittedClaimPdf } from "@/lib/data/auslagen-inbox";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const claim = await getSubmittedClaimPdf(id);
    const db = await createClient();
    const { data: file, error } = await db.storage.from(AUSLAGEN_BUCKET).download(claim.path);
    if (error || !file || file.size > 25 * 1024 * 1024 || (await file.slice(0, 5).text()) !== "%PDF-") {
      return new Response("Antrags-PDF nicht verfügbar.", { status: 404 });
    }
    const name = `Auslagenantrag_${claim.claimDate}_${claim.applicantName.replace(/[^a-zA-Z0-9_-]+/g, "_")}_${id.slice(0, 8)}.pdf`;
    return new Response(file.stream(), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(file.size),
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Antrag nicht verfügbar.", { status: 404 });
  }
}
