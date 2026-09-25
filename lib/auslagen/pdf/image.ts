import { PDFDocument, type PDFImage } from "pdf-lib";

/** pdf-lib unterstützt JPEG/PNG direkt; WebP wird im Browser in JPEG umgewandelt. */
export async function embedReceiptImage(pdf: PDFDocument, bytes: Uint8Array, mime: string): Promise<PDFImage> {
  if (mime === "image/png") return pdf.embedPng(bytes);
  if (mime === "image/jpeg") return pdf.embedJpg(bytes);
  if (mime === "image/webp") {
    const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: mime }));
    try {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("WebP-Beleg konnte nicht verarbeitet werden.");
      context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("WebP-Beleg konnte nicht verarbeitet werden.")), "image/jpeg", 0.9));
      return pdf.embedJpg(await blob.arrayBuffer());
    } finally { bitmap.close(); }
  }
  throw new Error("Nicht unterstütztes Belegbild.");
}
