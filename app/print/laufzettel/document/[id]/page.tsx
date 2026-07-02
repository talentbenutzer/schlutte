import { notFound } from "next/navigation";
import { LaufzettelSheet } from "@/components/print/LaufzettelSheet";
import { PrintToolbar } from "@/components/print/PrintToolbar";
import { getLaufzettelPrintDataByDocId } from "@/lib/data/documents";

export default async function LaufzettelDocPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getLaufzettelPrintDataByDocId(id);
  if (!data) notFound();
  const { commission, stations, printedBy, printedAt, formData } = data;

  return (
    <>
      <PrintToolbar backUrl={`/kommissionen/${commission.no}`} />
      <LaufzettelSheet
        commission={commission}
        stations={stations}
        formData={formData}
        printedBy={printedBy}
        printedAt={printedAt}
      />
    </>
  );
}
