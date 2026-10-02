import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { AUSLAGEN_BUCKET } from "@/lib/auslagen/paths";

export const runtime = "nodejs";
export const maxDuration = 60;

type PurgeCandidate = { id: string; file_path: string };

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || !supplied) return false;
  const expected = Buffer.from(secret);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.rpc("claim_receipts_for_storage_purge", { batch_size: 100 });
  if (error) return NextResponse.json({ error: "Retention queue could not be read" }, { status: 500 });

  const rows = (data ?? []) as PurgeCandidate[];
  if (!rows.length) return NextResponse.json({ deleted: 0 });

  const ids = rows.map((row) => row.id);
  const releaseClaims = async () => {
    await db.from("receipts").update({ storage_purge_claimed_at: null }).in("id", ids);
  };

  const { error: storageError } = await db.storage.from(AUSLAGEN_BUCKET).remove(rows.map((row) => row.file_path));
  if (storageError) {
    await releaseClaims();
    return NextResponse.json({ error: "Receipt files could not be deleted" }, { status: 500 });
  }

  const deletedAt = new Date().toISOString();
  const { error: updateError } = await db.from("receipts")
    .update({ file_deleted_at: deletedAt, storage_purge_claimed_at: null })
    .in("id", ids);
  if (updateError) {
    await releaseClaims();
    return NextResponse.json({ error: "Receipt records could not be updated" }, { status: 500 });
  }

  return NextResponse.json({ deleted: rows.length, deletedAt });
}

