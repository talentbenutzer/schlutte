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

/** Eine PDF je Zahlungsmittel: vollständige Betragsliste, Summe und Originalbelege. */
export async function buildPaymentMethodPdf(group: PaymentGroup, onProgress: (done: number, total: number) => void): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`Schlutte · ${group.title} · Belege`);
  const [regular, light, medium] = await Promise.all(["1-IBMPlexSans-Regular.ttf", "1-IBMPlexSans-Light.ttf", "1-IBMPlexSans-Medium.ttf"].map((name) => loadFont(pdf, name)));
  let cover = pdf.addPage([W, H]);
  const heading = (continued = false) => {
    write(cover, continued ? "SCHLUTTE / ZAHLUNGSMITTEL · FORTSETZUNG" : "SCHLUTTE / ZAHLUNGSABGLEICH", M, H - 42, medium, 8, brass);
    write(cover, `${group.payer} · ${group.title}`, M, H - 79, light, 20, ink, W - 2 * M);
    write(cover, `${group.receipts.length} Belege`, M, H - 107, regular, 9, muted);
    write(cover, "GESAMTSUMME", M + 360, H - 107, medium, 8, brass);
    write(cover, formatEUR(group.totalEUR), M + 440, H - 107, medium, 10, ink, 75);
    rule(cover, H - 121);
    write(cover, "NR", M, H - 146, medium, 8, brass);
    write(cover, "DATUM", M + 48, H - 146, medium, 8, brass);
    write(cover, "HÄNDLER", M + 125, H - 146, medium, 8, brass);
    write(cover, "BETRAG", M + 405, H - 146, medium, 8, brass);
  };
  heading();
  let y = H - 173;
  for (let index = 0; index < group.receipts.length; index++) {
    const receipt = group.receipts[index];
    if (y < 65) { cover = pdf.addPage([W, H]); heading(true); y = H - 173; }
    write(cover, `B${index + 1}`, M, y, medium, 8);
    write(cover, formatDate(receipt.receipt_date), M + 48, y, regular, 8);
    write(cover, receipt.merchant || receipt.file_name || "Beleg", M + 125, y, regular, 8, ink, 260);
    write(cover, formatEUR(receipt.currency === "EUR" ? receipt.gross_amount : receipt.gross_amount_eur), M + 405, y, regular, 8, ink, 100);
    y -= 25;
    rule(cover, y + 9);
  }

  const db = createClient();
  onProgress(0, group.receipts.length);
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
    onProgress(index + 1, group.receipts.length);
  }
  return pdf.save();
}
