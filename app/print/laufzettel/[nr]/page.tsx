import { notFound } from "next/navigation";
import { LaufzettelSheet } from "@/components/print/LaufzettelSheet";
import { PrintToolbar } from "@/components/print/PrintToolbar";
import { getLaufzettelPrintData } from "@/lib/data/documents";

export default async function LaufzettelPrintPage({
  params,
}: {
  params: Promise<{ nr: string }>;
}) {
  const { nr } = await params;
  const data = await getLaufzettelPrintData(nr);
  if (!data) notFound();
  const { commission, stations, printedBy, printedAt, formData } = data;

  return (
    <>
      <PrintToolbar backUrl={`/kommissionen/${nr}`} />
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
