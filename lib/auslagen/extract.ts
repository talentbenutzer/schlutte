import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { isISODate, normalizeCurrency, round2 } from "./format";
import type { ReceiptExtraction, StatementExtraction, StatementTransactionExtraction } from "./types";

const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

function client() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("KI-Auslesen ist noch nicht eingerichtet. Bitte den Beleg manuell erfassen.");
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 55_000 });
}

function document(data: Buffer, mime: string): ContentBlockParam {
  const base64 = data.toString("base64");
  if (mime === "application/pdf") {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } };
  }
  if (mime === "image/jpeg" || mime === "image/png" || mime === "image/webp") {
    return { type: "image", source: { type: "base64", media_type: mime, data: base64 } };
  }
  throw new Error("Dieser Dateityp kann nicht automatisch ausgelesen werden.");
}

function str(value: unknown, max = 200): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function money(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return round2(value);
}

function date(value: unknown): string | null {
  return typeof value === "string" && isISODate(value) ? value : null;
}

async function callTool(data: Buffer, mime: string, prompt: string, name: string, schema: Record<string, unknown>, maxTokens: number) {
  const result = await client().messages.create({
    model,
    max_tokens: maxTokens,
    temperature: 0,
    tools: [{ name, description: "Strukturierte Daten aus dem Dokument erfassen", input_schema: schema as Anthropic.Messages.Tool.InputSchema }],
    tool_choice: { type: "tool", name },
    messages: [{ role: "user", content: [{ type: "text", text: prompt }, document(data, mime)] }],
  });
  const block = result.content.find((part) => part.type === "tool_use" && part.name === name);
  if (!block || block.type !== "tool_use" || typeof block.input !== "object" || !block.input) throw new Error("Die KI konnte das Dokument nicht zuverlässig auslesen.");
  return block.input as Record<string, unknown>;
}

const receiptSchema = {
  type: "object",
  properties: {
    date: { type: ["string", "null"] }, merchant: { type: ["string", "null"] },
    description_suggestion: { type: ["string", "null"] }, currency: { type: ["string", "null"] },
    gross: { type: ["number", "null"] }, net: { type: ["number", "null"] }, vat_total: { type: ["number", "null"] },
    vat_lines: { type: "array", items: { type: "object", properties: { rate: { type: ["number", "null"] }, net: { type: ["number", "null"] }, vat: { type: ["number", "null"] }, gross: { type: ["number", "null"] } } } },
    card_last4: { type: ["string", "null"] }, payment_hint: { type: "string", enum: ["karte", "bar", "unbekannt"] },
  },
  required: ["date", "merchant", "description_suggestion", "currency", "gross", "net", "vat_total", "vat_lines", "card_last4", "payment_hint"],
};

export async function extractReceipt(data: Buffer, mime: string): Promise<ReceiptExtraction> {
  const raw = await callTool(data, mime,
    "Lies diesen Beleg. Gib nur sicher erkennbare Angaben zurück; sonst null. Datum YYYY-MM-DD, ISO-Währung, Beträge als Dezimalzahlen. Keine Daten erfinden. Falls mehrere MwSt-Sätze vorkommen, gib jede Zeile getrennt an.",
    "receipt", receiptSchema, 1200);
  const lines = Array.isArray(raw.vat_lines) ? raw.vat_lines.slice(0, 10) : [];
  return {
    date: date(raw.date), merchant: str(raw.merchant), description_suggestion: str(raw.description_suggestion, 300),
    currency: str(raw.currency, 3) ? normalizeCurrency(String(raw.currency)) : null,
    gross: money(raw.gross), net: money(raw.net), vat_total: money(raw.vat_total),
    vat_lines: lines.map((line) => { const x = (line && typeof line === "object" ? line : {}) as Record<string, unknown>; return { rate: money(x.rate), net: money(x.net), vat: money(x.vat), gross: money(x.gross) }; }),
    card_last4: /^\d{4}$/.test(String(raw.card_last4 ?? "")) ? String(raw.card_last4) : null,
    payment_hint: raw.payment_hint === "karte" || raw.payment_hint === "bar" ? raw.payment_hint : "unbekannt",
  };
}

const statementSchema = {
  type: "object",
  properties: {
    card_last4: { type: ["string", "null"] }, holder: { type: ["string", "null"] },
    period_start: { type: ["string", "null"] }, period_end: { type: ["string", "null"] }, statement_date: { type: ["string", "null"] },
    total: { type: ["number", "null"] }, currency: { type: ["string", "null"] },
    transactions: { type: "array", items: { type: "object", properties: {
      transaction_date: { type: ["string", "null"] }, booking_date: { type: ["string", "null"] }, merchant: { type: ["string", "null"] },
      description: { type: ["string", "null"] }, amount: { type: "number" }, original_amount: { type: ["number", "null"] }, original_currency: { type: ["string", "null"] },
    }, required: ["transaction_date", "booking_date", "merchant", "description", "amount", "original_amount", "original_currency"] } },
  },
  required: ["card_last4", "holder", "period_start", "period_end", "statement_date", "total", "currency", "transactions"],
};

export async function extractStatement(data: Buffer): Promise<StatementExtraction> {
  const raw = await callTool(data, "application/pdf",
    "Lies jede einzelne Buchung dieser Kreditkartenabrechnung. Beträge in EUR: Belastungen positiv, Gutschriften negativ. Kein Saldo und keine Summenzeile als Buchung. Datum YYYY-MM-DD. Wenn ein Wert unklar ist, null. Erfinde keine Buchungen.",
    "statement", statementSchema, 6000);
  const rows = Array.isArray(raw.transactions) ? raw.transactions.slice(0, 500) : [];
  const transactions: StatementTransactionExtraction[] = rows.flatMap((row) => {
    const x = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
    const amount = money(x.amount);
    if (amount === null) return [];
    return [{ transaction_date: date(x.transaction_date), booking_date: date(x.booking_date), merchant: str(x.merchant), description: str(x.description, 300), amount, original_amount: money(x.original_amount), original_currency: str(x.original_currency, 3) ? normalizeCurrency(String(x.original_currency)) : null }];
  });
  return { card_last4: /^\d{4}$/.test(String(raw.card_last4 ?? "")) ? String(raw.card_last4) : null,
    holder: str(raw.holder), period_start: date(raw.period_start), period_end: date(raw.period_end), statement_date: date(raw.statement_date),
    total: money(raw.total), currency: str(raw.currency, 3) ? normalizeCurrency(String(raw.currency)) : null, transactions };
}
