import type { Commission, CreateCommissionInput } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { COMMISSIONS } from "@/mocks/data";
import { createClient } from "@/lib/supabase/server";

export class CommissionValidationError extends Error {
  field: "no" | "client" | "owner";
  constructor(message: string, field: "no" | "client" | "owner") {
    super(message);
    this.name = "CommissionValidationError";
    this.field = field;
  }
}

export async function getCommissions(): Promise<Commission[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("commissions")
      .select("id,commission_number,customer_name,project_name,notes,created_by_initials,created_at,updated_at")
      .order("commission_number", { ascending: false });

    if (error) {
      console.error("Error fetching commissions from Supabase:", error.message);
      return COMMISSIONS;
    }

    if (!data || data.length === 0) {
      return COMMISSIONS;
    }

    return data.map((item) => ({
      no: item.commission_number,
      client: item.customer_name,
      project: item.project_name || "",
      status: "in-progress",
      updated: formatDate(item.updated_at || item.created_at),
      owner: item.created_by_initials || "EDL",
      docs: 0,
      note: item.notes || "",
    }));
  } catch (e) {
    console.error("Failed to connect to Supabase server client:", e);
    return COMMISSIONS;
  }
}

export async function getCommissionByNumber(
  nr: string
): Promise<Commission | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("commissions")
      .select("id,commission_number,customer_name,project_name,notes,created_by_initials,created_at,updated_at")
      .eq("commission_number", nr)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching commission ${nr} from Supabase:`, error.message);
      return COMMISSIONS.find((c) => c.no === nr) ?? null;
    }

    if (!data) {
      return COMMISSIONS.find((c) => c.no === nr) ?? null;
    }

    return {
      no: data.commission_number,
      client: data.customer_name,
      project: data.project_name || "",
      status: "in-progress",
      updated: formatDate(data.updated_at || data.created_at),
      owner: data.created_by_initials || "EDL",
      docs: 0,
      note: data.notes || "",
    };
  } catch (e) {
    console.error("Failed to connect to Supabase server client:", e);
    return COMMISSIONS.find((c) => c.no === nr) ?? null;
  }
}

export async function searchCommissions(query: string): Promise<Commission[]> {
  const q = query.trim().toLowerCase();
  if (!q) return getCommissions();

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("commissions")
      .select("id,commission_number,customer_name,project_name,notes,created_by_initials,created_at,updated_at")
      .or(`commission_number.ilike.%${q}%,customer_name.ilike.%${q}%,project_name.ilike.%${q}%`)
      .order("commission_number", { ascending: false });

    if (error || !data || data.length === 0) {
      return COMMISSIONS.filter(
        (c) =>
          c.no.includes(q) ||
          c.client.toLowerCase().includes(q) ||
          c.project.toLowerCase().includes(q)
      );
    }

    return data.map((item) => ({
      no: item.commission_number,
      client: item.customer_name,
      project: item.project_name || "",
      status: "in-progress",
      updated: formatDate(item.updated_at || item.created_at),
      owner: item.created_by_initials || "EDL",
      docs: 0,
      note: item.notes || "",
    }));
  } catch {
    return COMMISSIONS.filter(
      (c) =>
        c.no.includes(q) ||
        c.client.toLowerCase().includes(q) ||
        c.project.toLowerCase().includes(q)
    );
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

  const client = input.client.trim();
  if (!client) {
    throw new CommissionValidationError("Kunde ist erforderlich.", "client");
  }

  const owner = input.owner?.trim() || "EDL";
  if (owner.length > 3) {
    throw new CommissionValidationError("Mitarbeiterkürzel darf maximal 3 Zeichen lang sein.", "owner");
  }

  try {
    const supabase = await createClient();
    
    // Check duplicate
    const { data: existingData } = await supabase
      .from("commissions")
      .select("id")
      .eq("commission_number", no)
      .maybeSingle();

    if (existingData) {
      throw new CommissionValidationError("Diese Kommissionsnummer existiert bereits.", "no");
    }

    const { data, error } = await supabase
      .from("commissions")
      .insert({
        commission_number: no,
        customer_name: client,
        project_name: input.project?.trim() || "",
        notes: input.note?.trim() || "",
        created_by_initials: owner.toUpperCase()
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating commission in Supabase:", error.message);
      if (error.message.includes("row-level security") || error.message.includes("violates row-level security")) {
        throw new Error("Bitte melden Sie sich an, um Kommissionen zu speichern.");
      }
      throw new Error(`Supabase Fehler: ${error.message}`);
    }

    return {
      no: data.commission_number,
      client: data.customer_name,
      project: data.project_name || "",
      status: "in-progress",
      updated: "jetzt",
      owner: data.created_by_initials || "EDL",
      docs: 0,
      note: data.notes || "",
    };
  } catch (e) {
    if (e instanceof CommissionValidationError || e instanceof Error) {
      throw e;
    }
    
    // In-memory fallback
    const existing = COMMISSIONS.find((c) => c.no === no);
    if (existing) {
      throw new CommissionValidationError("Diese Kommissionsnummer existiert bereits.", "no");
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
    COMMISSIONS.unshift(commission);
    return commission;
  }
}

export async function updateCommission(
  no: string,
  input: { client: string; project?: string; owner?: string; note?: string }
): Promise<void> {
  const client = input.client.trim();
  if (!client) {
    throw new CommissionValidationError("Kunde ist erforderlich.", "client");
  }

  const owner = input.owner?.trim() || "EDL";
  if (owner.length > 3) {
    throw new CommissionValidationError("Mitarbeiterkürzel darf maximal 3 Zeichen lang sein.", "owner");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("commissions")
      .update({
        customer_name: client,
        project_name: input.project?.trim() || "",
        notes: input.note?.trim() || "",
        created_by_initials: owner.toUpperCase(),
        updated_at: new Date().toISOString(),
      })
      .eq("commission_number", no);

    if (error) {
      console.error(`Error updating commission ${no} in Supabase:`, error.message);
      if (error.message.includes("row-level security") || error.message.includes("violates row-level security")) {
        throw new Error("Bitte melden Sie sich an, um Kommissionen zu bearbeiten.");
      }
      throw new Error(`Supabase Fehler: ${error.message}`);
    }
  } catch (e) {
    if (e instanceof CommissionValidationError || e instanceof Error) {
      throw e;
    }
    
    // In-memory fallback
    const existing = COMMISSIONS.find((c) => c.no === no);
    if (existing) {
      existing.client = client;
      existing.project = input.project?.trim() || "";
      existing.note = input.note?.trim() || "";
      existing.owner = owner.toUpperCase();
      existing.updated = formatDate(new Date());
    } else {
      throw new Error(`Kommission ${no} nicht gefunden.`);
    }
  }
}

