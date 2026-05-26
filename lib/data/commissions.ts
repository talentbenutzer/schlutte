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
  client: string;
  project?: string;
  owner?: string;
};

export class CommissionValidationError extends Error {
  field: "client";
  constructor(message: string, field: "client") {
    super(message);
    this.name = "CommissionValidationError";
    this.field = field;
  }
}

function nextCommissionNumber(): string {
  const max = COMMISSIONS.reduce(
    (acc, c) => Math.max(acc, Number(c.no) || 0),
    0
  );
  return String(max + 1).padStart(6, "0");
}

export async function createCommission(
  input: CreateCommissionInput
): Promise<Commission> {
  const client = input.client.trim();
  if (!client) {
    throw new CommissionValidationError("Kunde ist erforderlich.", "client");
  }
  const commission: Commission = {
    no: nextCommissionNumber(),
    client,
    project: input.project?.trim() ?? "",
    status: "in-progress",
    updated: "jetzt",
    owner: input.owner?.trim() || "EDL",
    docs: 0,
  };
  // Mocks: am Anfang einfügen, damit neue Einträge oben in der Liste landen.
  // Bei Supabase ersetzt ein INSERT diesen Schritt.
  COMMISSIONS.unshift(commission);
  return commission;
}
