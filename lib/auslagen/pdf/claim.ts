import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { formatEUR } from "../format";
import { formatDate } from "../../utils";
import type { Company, ExpenseClaim, Receipt } from "../types";
import { embedReceiptImage } from "./image";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 42;
const ink = rgb(0.10, 0.10, 0.09);
const muted = rgb(0.42, 0.42, 0.40);
const brass = rgb(0.65, 0.51, 0.29);

type Fonts = { regular: PDFFont; light: PDFFont; medium: PDFFont; mono: PDFFont };

async function fonts(pdf: PDFDocument): Promise<Fonts> {
  pdf.registerFontkit(fontkit);
  const paths = ["1-IBMPlexSans-Regular.ttf", "1-IBMPlexSans-Light.ttf", "1-IBMPlexSans-Medium.ttf"];
  const files = await Promise.all(paths.map(async (name) => {
    const response = await fetch(`/fonts/${name}`);
    if (!response.ok) throw new Error("PDF-Schrift konnte nicht geladen werden.");
    return response.arrayBuffer();
  }));
  const [regular, light, medium] = await Promise.all(files.map((data) => pdf.embedFont(data)));
  // Die vorhandenen Plex-Mono-TTFs haben eine fehlerhafte Leerzeichen-Glyphe
  // (fontkit wirft beim Messen/Rendern). Für PDF-Labels die stabile Sans verwenden.
  return { regular, light, medium, mono: regular };
}

function line(page: PDFPage, y: number, x = M, width = PAGE_W - 2 * M) {
  page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness: 0.5, color: muted });
}

function clipped(text: string, font: PDFFont, size: number, width: number) {
  let value = text || "—";
  while (value.length > 1 && font.widthOfTextAtSize(value, size) > width) value = value.slice(0, -2) + "…";
  return value;
}

function text(page: PDFPage, value: string, x: number, y: number, font: PDFFont, size = 10, color = ink, maxWidth?: number) {
  page.drawText(maxWidth ? clipped(value, font, size, maxWidth) : value, { x, y, font, size, color });
}

function label(page: PDFPage, value: string, x: number, y: number, font: PDFFont) {
  text(page, value.toUpperCase(), x, y, font, 8, brass);
}

function tableHead(page: PDFPage, y: number, f: Fonts) {
  line(page, y + 10);
  const cols: [number, string][] = [[M, "NR"], [M + 27, "DATUM"], [M + 98, "HÄNDLER / ZWECK"], [M + 345, "NETTO"], [M + 412, "MWST"], [M + 468, "BRUTTO"]];
  cols.forEach(([x, title]) => label(page, title, x, y - 2, f.mono));
  line(page, y - 11);
  return y - 29;
}

function header(page: PDFPage, claim: ExpenseClaim, company: Company, f: Fonts) {
  label(page, "Schlutte / Auslagen", M, PAGE_H - 42, f.mono);
  text(page, "Antrag auf", M, PAGE_H - 87, f.light, 24);
  text(page, "Auslagenerstattung", M, PAGE_H - 115, f.light, 24);
  line(page, PAGE_H - 132);
  label(page, "An", M, PAGE_H - 157, f.mono);
  text(page, company.name, M, PAGE_H - 176, f.medium, 11);
  const address = (company.address ?? "").split("\n").filter(Boolean).slice(0, 4);
  address.forEach((row, i) => text(page, row, M, PAGE_H - 191 - i * 13, f.regular, 9));
  const a = claim.applicant;
  label(page, "Antragsteller", M + 280, PAGE_H - 157, f.mono);
  text(page, `${a.first_name} ${a.last_name}`.trim(), M + 280, PAGE_H - 176, f.medium, 11);
  text(page, a.street, M + 280, PAGE_H - 191, f.regular, 9);
  text(page, `${a.postal_code} ${a.city}`.trim(), M + 280, PAGE_H - 204, f.regular, 9);
  if (a.personnel_no || a.cost_center) text(page, [a.personnel_no && `Personalnr. ${a.personnel_no}`, a.cost_center && `Kostenstelle ${a.cost_center}`].filter(Boolean).join(" · "), M + 280, PAGE_H - 217, f.regular, 8, muted, 230);
  text(page, "Hiermit bitte ich um Erstattung der nachfolgenden von mir getätigten Auslagen.", M, PAGE_H - 268, f.regular, 10);
  return tableHead(page, PAGE_H - 301, f);
}

export async function buildClaimPdf(claim: ExpenseClaim, company: Company, receipts: Receipt[], urls: Record<string, string>): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Auslagenerstattung ${formatDate(claim.claim_date)}`);
  pdf.setAuthor("Schlutte Belege");
  const f = await fonts(pdf);
  const ordered = [...receipts].sort((a, b) => (a.receipt_date ?? "").localeCompare(b.receipt_date ?? ""));
  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = header(page, claim, company, f);
  let netSum = 0, vatSum = 0;
  ordered.forEach((receipt, i) => {
    if (y < 220) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      label(page, "Antrag auf Auslagenerstattung / Fortsetzung", M, PAGE_H - 47, f.mono);
      y = tableHead(page, PAGE_H - 80, f);
    }
    const fx = receipt.currency !== "EUR" && receipt.gross_amount && receipt.gross_amount_eur ? receipt.gross_amount_eur / receipt.gross_amount : 1;
    const net = Number(receipt.net_amount ?? receipt.gross_amount ?? 0) * fx;
    const vat = Number(receipt.vat_amount ?? 0) * fx;
    netSum += net; vatSum += vat;
    text(page, String(i + 1).padStart(2, "0"), M, y, f.mono, 9);
    text(page, formatDate(receipt.receipt_date), M + 27, y, f.regular, 9);
    text(page, receipt.merchant ?? "—", M + 98, y, f.medium, 9, ink, 230);
    if (receipt.description) text(page, receipt.description, M + 98, y - 12, f.regular, 8, muted, 230);
    text(page, formatEUR(net), M + 345, y, f.regular, 8, ink, 65);
    text(page, formatEUR(vat), M + 412, y, f.regular, 8, ink, 55);
    text(page, formatEUR(receipt.currency === "EUR" ? receipt.gross_amount : receipt.gross_amount_eur), M + 468, y, f.medium, 8, ink, 48);
    y -= receipt.description ? 38 : 28;
    line(page, y + 8);
  });
  if (y < 205) { page = pdf.addPage([PAGE_W, PAGE_H]); y = PAGE_H - 62; }
  y -= 12;
  text(page, "Summe netto", M + 340, y, f.regular, 9); text(page, formatEUR(netSum), M + 450, y, f.medium, 9, ink, 60);
  y -= 17; text(page, "Summe MwSt", M + 340, y, f.regular, 9); text(page, formatEUR(vatSum), M + 450, y, f.medium, 9, ink, 60);
  y -= 20; line(page, y + 9, M + 325, PAGE_W - 2 * M - 325);
  text(page, "Gesamt brutto", M + 340, y - 7, f.medium, 10); text(page, formatEUR(claim.total_gross), M + 450, y - 7, f.medium, 10, ink, 60);
  y -= 54;
  if (y < 230) { page = pdf.addPage([PAGE_W, PAGE_H]); y = PAGE_H - 60; }
  text(page, "Ich bitte um Überweisung auf folgendes Konto:", M, y, f.regular, 9);
  y -= 18; text(page, `Kontoinhaber: ${claim.applicant.account_holder}`, M, y, f.regular, 9);
  y -= 15; text(page, `IBAN: ${claim.applicant.iban.replace(/(.{4})(?=.)/g, "$1 ")}`, M, y, f.mono, 9);
  y -= 15; if (claim.applicant.bic || claim.applicant.bank_name) text(page, [claim.applicant.bic && `BIC: ${claim.applicant.bic}`, claim.applicant.bank_name].filter(Boolean).join(" · "), M, y, f.regular, 9);
  y -= 27; text(page, "Ich versichere, dass die o. g. Kosten tatsächlich angefallen sind.", M, y, f.regular, 9);
  y -= 58; line(page, y, M, 185); line(page, y, M + 260, 220);
  text(page, `${claim.place ?? ""}, ${formatDate(claim.claim_date)}`, M, y - 14, f.regular, 9);
  text(page, "Unterschrift", M + 260, y - 14, f.regular, 9);
  if (claim.signature_png) {
    const bytes = Uint8Array.from(atob(claim.signature_png.split(",")[1]), (ch) => ch.charCodeAt(0));
    const image = await pdf.embedPng(bytes);
    const size = image.scaleToFit(200, 65);
    page.drawImage(image, { x: M + 265, y: y + 3, width: size.width, height: size.height });
  }
  text(page, "* Die Originalbelege sind aufzubewahren und auf Verlangen im Original vorzulegen.", M, 66, f.regular, 8, muted);

  const claimPages = pdf.getPageCount();
  for (let i = 0; i < ordered.length; i++) {
    const receipt = ordered[i];
    const source = urls[receipt.id];
    if (!source) throw new Error(`Beleg ${i + 1} konnte nicht geladen werden.`);
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Beleg ${i + 1} konnte nicht geladen werden.`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (receipt.file_mime === "application/pdf") {
      const attachment = await PDFDocument.load(bytes);
      const copies = await pdf.copyPages(attachment, attachment.getPageIndices());
      for (const copy of copies) {
        pdf.addPage(copy);
        const { width, height } = copy.getSize();
        copy.drawRectangle({ x: 0, y: height - 22, width, height: 22, color: rgb(1, 1, 1) });
        label(copy, `Beleg ${i + 1} · ${formatDate(receipt.receipt_date)} · ${receipt.merchant ?? ""}`, M, height - 15, f.mono);
      }
    } else {
      const attachment = pdf.addPage([PAGE_W, PAGE_H]);
      label(attachment, `Beleg ${i + 1} · ${formatDate(receipt.receipt_date)} · ${receipt.merchant ?? ""}`, M, PAGE_H - 45, f.mono);
      line(attachment, PAGE_H - 55);
      const image = await embedReceiptImage(pdf, bytes, receipt.file_mime);
      const size = image.scaleToFit(PAGE_W - 2 * M, PAGE_H - 150);
      attachment.drawImage(image, { x: (PAGE_W - size.width) / 2, y: (PAGE_H - size.height) / 2 - 10, width: size.width, height: size.height });
    }
  }
  pdf.getPages().forEach((p, i) => {
    if (i < claimPages) {
      line(p, 48);
      text(p, `SCHLUTTE · AUSLAGEN · ${formatDate(claim.claim_date)}`, M, 33, f.mono, 7, muted);
      text(p, `SEITE ${i + 1}/${pdf.getPageCount()}`, PAGE_W - M - 72, 33, f.mono, 7, muted);
    }
  });
  return pdf.save();
}
