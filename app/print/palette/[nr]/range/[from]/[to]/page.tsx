import { notFound } from "next/navigation";
import { PaletteSheet } from "@/components/print/PaletteSheet";
import { PrintToolbar } from "@/components/print/PrintToolbar";
import { getPalettePrintRange } from "@/lib/data/documents";

export default async function PaletteRangePrintPage({
  params,
}: {
  params: Promise<{ nr: string; from: string; to: string }>;
}) {
  const { nr, from, to } = await params;
  const fromNum = Number(from);
  const toNum = Number(to);
  if (!Number.isInteger(fromNum) || !Number.isInteger(toNum)) notFound();

  const pages = await getPalettePrintRange(nr, fromNum, toNum);
  if (pages.length === 0) notFound();

  return (
    <>
      <PrintToolbar backUrl={`/kommissionen/${nr}`} />
      {pages.map((p) => (
        <PaletteSheet
          key={p.palette.idx}
          commission={p.commission}
          palette={p.palette}
          printedBy={p.printedBy}
          printedAt={p.printedAt}
        />
      ))}
    </>
  );
}
