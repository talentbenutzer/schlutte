import type {
  CommissionDocument,
  DocumentKind,
  LaufzettelPrintData,
  Palette,
  PalettePrintPage,
} from "@/lib/types";
import {
  RECENT_DOCS,
  MATERIALS,
  STATIONS,
  PALETTES,
} from "@/mocks/data";
import { getCommissionByNumber } from "@/lib/data/commissions";

// Repository for documents (Laufzettel, Palette).
// MVP: derived from mocks. Production: Supabase `documents` table + Storage for archived PDFs.

function inferKind(label: string): DocumentKind {
  return label.toLowerCase().startsWith("palette") ? "palette" : "laufzettel";
}

function toDocument(
  src: (typeof RECENT_DOCS)[number],
  i: number
): CommissionDocument {
  return {
    id: `${src.kommission}-${i}`,
    kommission: src.kommission,
    kind: inferKind(src.type),
    label: src.type,
    client: src.client,
    stamp: src.stamp,
    by: src.by,
  };
}

export async function getRecentDocuments(
  limit = 6
): Promise<CommissionDocument[]> {
  return RECENT_DOCS.slice(0, limit).map(toDocument);
}

export async function getDocumentsByCommissionNumber(
  nr: string
): Promise<CommissionDocument[]> {
  return RECENT_DOCS.filter((d) => d.kommission === nr).map(toDocument);
}

// Available palettes belonging to a commission.
// MVP: returns the shared mock set for every commission (so all detail pages can
// demo the print routes). Production: query `palettes where commission = nr`.
export async function getPalettesForCommission(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  nr: string
): Promise<Palette[]> {
  return PALETTES;
}

export async function getPalettePrintPage(
  nr: string,
  idx: number
): Promise<PalettePrintPage | null> {
  const commission = await getCommissionByNumber(nr);
  if (!commission) return null;
  const palette = PALETTES.find((p) => p.idx === idx);
  if (!palette) return null;
  return {
    commission,
    palette,
    printedBy: commission.owner,
    printedAt: new Date().toISOString().slice(0, 10),
  };
}

// Range-Variante für den Mehrfachdruck (z. B. 1/5 … 5/5 in einem Druckdialog).
// Sortiert aufsteigend nach idx; gibt nur existierende Paletten zurück.
export async function getPalettePrintRange(
  nr: string,
  from: number,
  to: number
): Promise<PalettePrintPage[]> {
  if (!Number.isInteger(from) || !Number.isInteger(to)) return [];
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  if (lo < 1) return [];
  const commission = await getCommissionByNumber(nr);
  if (!commission) return [];
  const printedAt = new Date().toISOString().slice(0, 10);
  return PALETTES
    .filter((p) => p.idx >= lo && p.idx <= hi)
    .sort((a, b) => a.idx - b.idx)
    .map((palette) => ({
      commission,
      palette,
      printedBy: commission.owner,
      printedAt,
    }));
}

export async function getLaufzettelPrintData(
  nr: string
): Promise<LaufzettelPrintData | null> {
  const commission = await getCommissionByNumber(nr);
  if (!commission) return null;
  return {
    commission,
    materials: MATERIALS,
    stations: STATIONS,
    printedBy: commission.owner,
    printedAt: new Date().toISOString().slice(0, 10),
  };
}
