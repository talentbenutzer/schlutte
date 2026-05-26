import { notFound } from "next/navigation";
import { PaletteSheet } from "@/components/print/PaletteSheet";
import { PrintToolbar } from "@/components/print/PrintToolbar";
import { getPalettePrintPage } from "@/lib/data/documents";

export default async function PalettePrintPage({
  params,
}: {
  params: Promise<{ nr: string; idx: string }>;
}) {
  const { nr, idx } = await params;
  const idxNum = Number(idx);
  if (!Number.isInteger(idxNum) || idxNum < 1) notFound();

  const data = await getPalettePrintPage(nr, idxNum);
  if (!data) notFound();

  return (
    <>
      <PrintToolbar />
      <PaletteSheet
        commission={data.commission}
        palette={data.palette}
        printedBy={data.printedBy}
        printedAt={data.printedAt}
      />
    </>
  );
}
