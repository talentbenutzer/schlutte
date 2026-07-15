import { notFound } from "next/navigation";
import { PaletteSheet } from "@/components/print/PaletteSheet";
import { PrintToolbar } from "@/components/print/PrintToolbar";
import { getPalettePrintRangeByDocId } from "@/lib/data/documents";

export default async function PaletteDocRangePrintPage({
  params,
}: {
  params: Promise<{ id: string; from: string; to: string }>;
}) {
  const { id, from, to } = await params;
  const fromNum = Number(from);
  const toNum = Number(to);
  if (!Number.isInteger(fromNum) || !Number.isInteger(toNum)) notFound();

  const pages = await getPalettePrintRangeByDocId(id, fromNum, toNum);
  if (pages.length === 0) notFound();

  return (
    <>
      <PrintToolbar backUrl={`/kommissionen/${pages[0].commission.no}/dokumente/palette/${id}/bearbeiten`} />
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
