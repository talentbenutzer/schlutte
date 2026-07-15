import { notFound } from "next/navigation";
import { PaletteSheet } from "@/components/print/PaletteSheet";
import { PrintToolbar } from "@/components/print/PrintToolbar";
import { getPalettePrintPageByDocId } from "@/lib/data/documents";

export default async function PaletteDocPrintPage({
  params,
}: {
  params: Promise<{ id: string; idx: string }>;
}) {
  const { id, idx } = await params;
  const idxNum = Number(idx);
  if (!Number.isInteger(idxNum) || idxNum < 1) notFound();

  const data = await getPalettePrintPageByDocId(id, idxNum);
  if (!data) notFound();

  return (
    <>
      <PrintToolbar backUrl={`/kommissionen/${data.commission.no}/dokumente/palette/${id}/bearbeiten`} />
      <PaletteSheet
        commission={data.commission}
        palette={data.palette}
        printedBy={data.printedBy}
        printedAt={data.printedAt}
      />
    </>
  );
}
