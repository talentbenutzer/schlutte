import type { Commission } from "@/lib/types";
import { COMMISSIONS } from "@/mocks/data";

// Repository for commissions.
// MVP: backed by in-memory mocks. Production: Supabase (`commissions` table).
// Keep all signatures async + Promise-returning so the swap is purely an implementation change.

export async function getCommissions(): Promise<Commission[]> {
  return COMMISSIONS;
}

export async function getCommissionByNumber(
  nr: string
): Promise<Commission | null> {
  const hit = COMMISSIONS.find((c) => c.no === nr);
  return hit ?? null;
}

export async function searchCommissions(query: string): Promise<Commission[]> {
  const q = query.trim().toLowerCase();
  if (!q) return COMMISSIONS;
  return COMMISSIONS.filter(
    (c) =>
      c.no.includes(q) ||
      c.client.toLowerCase().includes(q) ||
      c.project.toLowerCase().includes(q)
  );
}

export type CreateCommissionInput = {
  no: string;
  client: string;
  project?: string;
  note?: string;
  owner?: string;
};

export class CommissionValidationError extends Error {
  field: "no" | "client" | "owner";
  constructor(message: string, field: "no" | "client" | "owner") {
    super(message);
    this.name = "CommissionValidationError";
    this.field = field;
  }
}

export async function createCommission(
  input: CreateCommissionInput
): Promise<Commission> {
  const no = input.no.trim();
  if (!no) {
    throw new CommissionValidationError("Kommissionsnummer ist erforderlich.", "no");
  }
  if (!/^\d{6}$/.test(no)) {
    throw new CommissionValidationError("Kommissionsnummer muss genau 6 Ziffern enthalten.", "no");
  }
  const existing = COMMISSIONS.find((c) => c.no === no);
  if (existing) {
    throw new CommissionValidationError("Diese Kommissionsnummer existiert bereits.", "no");
  }

  const client = input.client.trim();
  if (!client) {
    throw new CommissionValidationError("Kunde ist erforderlich.", "client");
  }

  const owner = input.owner?.trim() || "EDL";
  if (owner.length > 3) {
    throw new CommissionValidationError("Mitarbeiterkürzel darf maximal 3 Zeichen lang sein.", "owner");
  }

  const commission: Commission = {
    no,
    client,
    project: input.project?.trim() ?? "",
    status: "in-progress",
    updated: "jetzt",
    owner: owner.toUpperCase(),
    docs: 0,
    note: input.note?.trim() ?? "",
  };
  
  // Mocks: am Anfang einfügen, damit neue Einträge oben in der Liste landen.
  COMMISSIONS.unshift(commission);
  return commission;
}

