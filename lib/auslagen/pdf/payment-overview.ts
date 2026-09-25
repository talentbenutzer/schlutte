import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { createClient } from "@/lib/supabase/client";
import { AUSLAGEN_BUCKET } from "../paths";
import { formatEUR } from "../format";
import { formatDate } from "../../utils";
import type { PaymentGroup } from "../reconciliation";
import { embedReceiptImage } from "./image";

const W = 595.28, H = 841.89, M = 42;
const ink = rgb(0.10, 0.10, 0.09), brass = rgb(0.65, 0.51, 0.29), muted = rgb(0.42, 0.42, 0.40);

async function loadFont(pdf: PDFDocument, name: string): Promise<PDFFont> {
  const response = await fetch(`/fonts/${name}`);
  if (!response.ok) throw new Error("PDF-Schrift konnte nicht geladen werden.");
  return pdf.embedFont(await response.arrayBuffer());
}

function write(page: PDFPage, value: string, x: number, y: number, font: PDFFont, size = 9, color = ink, maxWidth = 500) {
  let text = value || "—";
  while (text.length > 1 && font.widthOfTextAtSize(text, size) > maxWidth) text = text.slice(0, -2) + "…";
  page.drawText(text, { x, y, font, size, color });
}

function rule(page: PDFPage, y: number) { page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: muted }); }

/** Eine Datei mit Gruppenübersicht und allen dazugehörigen Originalbelegen. */
export async function buildPaymentOverviewPdf(groups: PaymentGroup[], onProgress: (done: number, total: number) => void): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle("Schlutte · Zahlungswege und Belege");
  const [regular, light, medium] = await Promise.all(["1-IBMPlexSans-Regular.ttf", "1-IBMPlexSans-Light.ttf", "1-IBMPlexSans-Medium.ttf"].map((name) => loadFont(pdf, name)));
  const total = groups.reduce((sum, group) => sum + group.receipts.length, 0);
  let cover = pdf.addPage([W, H]);
  write(cover, "SCHLUTTE / AUSLAGEN", M, H - 42, medium, 8, brass);
  write(cover, "Zahlungsmittel & Belege", M, H - 88, light, 24);
  rule(cover, H - 105);
  write(cover, `${total} erfasste Belege · ${groups.length} Zahlungsmittel-Gruppen`, M, H - 133, regular, 10);
  let coverY = H - 178;
  for (const group of groups) {
    if (coverY < 65) {
      cover = pdf.addPage([W, H]);
      write(cover, "SCHLUTTE / ZAHLUNGSMITTEL · FORTSETZUNG", M, H - 42, medium, 8, brass);
      rule(cover, H - 55);
      coverY = H - 85;
    }
    write(cover, `${group.payer} · ${group.title}`, M, coverY, regular, 9, ink, 345);
    write(cover, `${group.receipts.length} · ${formatEUR(group.totalEUR)}`, M + 365, coverY, regular, 9, ink, 140);
    coverY -= 25;
    rule(cover, coverY + 8);
  }

  const db = createClient();
  let done = 0;
  onProgress(done, total);
  for (const group of groups) {
    let page = pdf.addPage([W, H]);
    const heading = () => {
      write(page, "SCHLUTTE / ZAHLUNGSABGLEICH", M, H - 42, medium, 8, brass);
      write(page, `${group.payer} · ${group.title}`, M, H - 76, light, 18, ink, W - 2 * M);
      write(page, `${group.receipts.length} Belege · ${formatEUR(group.totalEUR)}`, M, H - 101, regular, 9, muted);
      rule(page, H - 114);
      write(page, "NR", M, H - 140, medium, 8, brass);
      write(page, "DATUM", M + 48, H - 140, medium, 8, brass);
      write(page, "HÄNDLER", M + 125, H - 140, medium, 8, brass);
      write(page, "BETRAG", M + 405, H - 140, medium, 8, brass);
    };
    heading();
    let y = H - 167;
    for (let index = 0; index < group.receipts.length; index++) {
      const receipt = group.receipts[index];
      if (y < 65) { page = pdf.addPage([W, H]); heading(); y = H - 167; }
      write(page, `B${index + 1}`, M, y, medium, 8);
      write(page, formatDate(receipt.receipt_date), M + 48, y, regular, 8);
      write(page, receipt.merchant || receipt.file_name || "Beleg", M + 125, y, regular, 8, ink, 260);
      write(page, formatEUR(receipt.currency === "EUR" ? receipt.gross_amount : receipt.gross_amount_eur), M + 405, y, regular, 8, ink, 100);
      y -= 25;
      rule(page, y + 9);
    }
    for (let index = 0; index < group.receipts.length; index++) {
      const receipt = group.receipts[index];
      const { data, error } = await db.storage.from(AUSLAGEN_BUCKET).download(receipt.file_path);
      if (error || !data) throw new Error(`Originalbeleg ${receipt.merchant || receipt.file_name || index + 1} konnte nicht geladen werden.`);
      const bytes = new Uint8Array(await data.arrayBuffer());
      const label = `${group.title} · B${index + 1} · ${receipt.merchant || "Beleg"}`;
      if (receipt.file_mime === "application/pdf") {
        const original = await PDFDocument.load(bytes);
        for (const copy of await pdf.copyPages(original, original.getPageIndices())) pdf.addPage(copy);
      } else {
        const attachment = pdf.addPage([W, H]);
        write(attachment, label, M, H - 45, regular, 8, brass, W - 2 * M);
        rule(attachment, H - 55);
        const image = await embedReceiptImage(pdf, bytes, receipt.file_mime);
        const fit = image.scaleToFit(W - 2 * M, H - 150);
        attachment.drawImage(image, { x: (W - fit.width) / 2, y: (H - fit.height) / 2 - 10, width: fit.width, height: fit.height });
      }
      done++;
      onProgress(done, total);
    }
  }
  return pdf.save();
}
