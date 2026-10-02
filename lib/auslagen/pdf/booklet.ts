import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { formatEUR } from "../format";
import { formatDate } from "../../utils";
import type { CardStatement, CardTransaction, Company, CreditCard, Receipt } from "../types";
import { embedReceiptImage } from "./image";

const W = 595.28, H = 841.89, M = 42;
const ink = rgb(0.10, 0.10, 0.09), brass = rgb(0.65, 0.51, 0.29), muted = rgb(0.42, 0.42, 0.40);

async function font(pdf: PDFDocument, path: string): Promise<PDFFont> {
  const response = await fetch(`/fonts/${path}`);
  if (!response.ok) throw new Error("PDF-Schrift konnte nicht geladen werden.");
  return pdf.embedFont(await response.arrayBuffer());
}

function write(page: PDFPage, value: string, x: number, y: number, font: PDFFont, size = 9, color = ink, maxWidth = 500) {
  let text = value || "—";
  while (text.length > 1 && font.widthOfTextAtSize(text, size) > maxWidth) text = text.slice(0, -2) + "…";
  page.drawText(text, { x, y, font, size, color });
}

function rule(page: PDFPage, y: number) { page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: muted }); }

export async function buildBookletPdf(input: { statement: CardStatement; card: CreditCard; company: Company | null; transactions: CardTransaction[]; receipts: Receipt[]; receiptUrls: Record<string, string | null>; statementUrl: string }): Promise<Uint8Array> {
  const { statement, card, company, transactions, receipts, receiptUrls, statementUrl } = input;
  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
  pdf.setTitle(`Belegnachweis ${card.label} ${formatDate(statement.statement_date)}`);
  const [regular, light, medium] = await Promise.all(["1-IBMPlexSans-Regular.ttf", "1-IBMPlexSans-Light.ttf", "1-IBMPlexSans-Medium.ttf"].map((p) => font(pdf, p)));
  const mono = regular;
  let page = pdf.addPage([W, H]);
  write(page, "SCHLUTTE / AUSLAGEN", M, H - 42, mono, 8, brass);
  write(page, "Kreditkartenabrechnung", M, H - 88, light, 24);
  write(page, "Belegnachweis", M, H - 116, light, 24);
  rule(page, H - 132);
  write(page, `${card.label} ·•••• ${card.last4 ?? ""}`, M, H - 163, medium, 12);
  if (company) write(page, company.name, M, H - 181, regular, 10);
  write(page, `Zeitraum: ${formatDate(statement.period_start)} – ${formatDate(statement.period_end)}`, M, H - 200, regular, 10);
  const matched = transactions.filter((t) => t.receipt_id).length;
  write(page, `${transactions.length} Buchungen · ${matched} mit Beleg · ${transactions.length - matched} ohne Zuordnung`, M, H - 222, regular, 9, muted);
  let y = H - 265;
  const tableHeader = () => { rule(page, y + 13); write(page, "NR", M, y, mono, 8, brass); write(page, "DATUM", M + 30, y, mono, 8, brass); write(page, "HÄNDLER", M + 102, y, mono, 8, brass); write(page, "BETRAG", M + 370, y, mono, 8, brass); write(page, "BELEG", M + 445, y, mono, 8, brass); y -= 15; rule(page, y + 4); y -= 14; };
  tableHeader();
  transactions.forEach((tx, index) => {
    if (y < 85) { page = pdf.addPage([W, H]); y = H - 55; tableHeader(); }
    write(page, String(index + 1).padStart(2, "0"), M, y, mono, 8);
    write(page, formatDate(tx.transaction_date || tx.booking_date), M + 30, y, regular, 8);
    write(page, tx.merchant || tx.description || "—", M + 102, y, regular, 8, ink, 250);
    write(page, formatEUR(tx.amount), M + 370, y, regular, 8, ink, 70);
    write(page, tx.receipt_id ? `B${index + 1}` : tx.match_status === "ohne_beleg" ? "ohne" : "offen", M + 445, y, mono, 8);
    y -= 25; rule(page, y + 9);
  });
  const coverPages = pdf.getPageCount();
  const receiptById = new Map(receipts.map((r) => [r.id, r]));
  for (let index = 0; index < transactions.length; index++) {
    const tx = transactions[index];
    const receipt = tx.receipt_id ? receiptById.get(tx.receipt_id) : null;
    if (!receipt) continue;
    const url = receiptUrls[receipt.id];
    if (!url) {
      const placeholder = pdf.addPage([W, H]);
      write(placeholder, `BELEG B${index + 1} · ${receipt.merchant ?? ""}`, M, H - 45, mono, 8, brass);
      rule(placeholder, H - 55);
      write(placeholder, "Originaldatei nach 30 Tagen automatisch gelöscht", M, H - 105, medium, 13, ink, W - 2 * M);
      write(placeholder, "Belegdaten und Zuordnung sind auf dem Deckblatt weiterhin dokumentiert.", M, H - 130, regular, 9, muted, W - 2 * M);
      continue;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Beleg für Buchung ${index + 1} konnte nicht geladen werden.`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (receipt.file_mime === "application/pdf") {
      const attachment = await PDFDocument.load(bytes);
      for (const copy of await pdf.copyPages(attachment, attachment.getPageIndices())) {
        pdf.addPage(copy);
        const { width, height } = copy.getSize();
        copy.drawRectangle({ x: 0, y: height - 22, width, height: 22, color: rgb(1, 1, 1) });
        write(copy, `BELEG B${index + 1} · ${receipt.merchant ?? ""}`, M, height - 15, mono, 8, brass, width - 2 * M);
      }
    } else {
      const attachment = pdf.addPage([W, H]);
      write(attachment, `BELEG B${index + 1} · ${receipt.merchant ?? ""}`, M, H - 45, mono, 8, brass);
      rule(attachment, H - 55);
      const image = await embedReceiptImage(pdf, bytes, receipt.file_mime);
      const fit = image.scaleToFit(W - 2 * M, H - 150);
      attachment.drawImage(image, { x: (W - fit.width) / 2, y: (H - fit.height) / 2 - 10, width: fit.width, height: fit.height });
    }
  }
  const statementResponse = await fetch(statementUrl);
  if (!statementResponse.ok) throw new Error("Original-Abrechnung konnte nicht geladen werden.");
  const original = await PDFDocument.load(await statementResponse.arrayBuffer());
  for (const copy of await pdf.copyPages(original, original.getPageIndices())) pdf.addPage(copy);
  pdf.getPages().slice(0, coverPages).forEach((p, i) => {
    rule(p, 48);
    write(p, "SCHLUTTE · BELEGNACHWEIS", M, 33, mono, 7, muted);
    write(p, `SEITE ${i + 1}/${pdf.getPageCount()}`, W - M - 76, 33, mono, 7, muted);
  });
  return pdf.save();
}
