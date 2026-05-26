import type {
  CommissionDocument,
  DocumentKind,
  LaufzettelPrintData,
  Palette,
  PalettePrintPage,
  LaufzettelFormData,
  PaletteFormData,
  Document,
} from "@/lib/types";
import {
  RECENT_DOCS,
  MATERIALS,
  STATIONS,
  PALETTES,
} from "@/mocks/data";
import { getCommissionByNumber } from "@/lib/data/commissions";
import { createClient } from "@/lib/supabase/server";

function inferKind(label: string): DocumentKind {
  return label.toLowerCase().startsWith("palette") ? "palette" : "laufzettel";
}

function toDocument(
  src: (typeof RECENT_DOCS)[number],
  i: number
): CommissionDocument {
  return {
    id: `${src.kommission}-${i}`,
    kommission: src.kommission,
    kind: inferKind(src.type),
    label: src.type,
    client: src.client,
    stamp: src.stamp,
    by: src.by,
  };
}

async function logPrintAction(
  documentId: string,
  printLabel: string,
  ownerInitials: string
) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("document_prints")
      .insert({
        document_id: documentId,
        print_label: printLabel,
        created_by_initials: ownerInitials.toUpperCase()
      });
    if (error) {
      console.warn("Failed to log print action to Supabase:", error.message);
    }
  } catch (e) {
    console.warn("Failed to connect to Supabase for logging print action:", e);
  }
}

export async function getRecentDocuments(
  limit = 6
): Promise<CommissionDocument[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("documents")
      .select(`
        id,
        document_type,
        title,
        created_by_initials,
        created_at,
        commissions (
          commission_number,
          customer_name
        )
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching recent documents from Supabase:", error.message);
      return RECENT_DOCS.slice(0, limit).map(toDocument);
    }

    if (!data || data.length === 0) {
      return RECENT_DOCS.slice(0, limit).map(toDocument);
    }

    interface DBRecentDocument {
      id: string;
      document_type: string;
      title: string;
      created_by_initials: string;
      created_at: string;
      commissions: {
        commission_number: string;
        customer_name: string;
      } | null;
    }

    const dbData = data as unknown as DBRecentDocument[];
    return dbData.map((item) => ({
      id: item.id,
      kommission: item.commissions?.commission_number || "",
      kind: item.document_type as DocumentKind,
      label: item.title,
      client: item.commissions?.customer_name || "",
      stamp: new Date(item.created_at).toLocaleDateString("de-DE"),
      by: item.created_by_initials || "EDL",
    }));
  } catch (e) {
    console.error("Failed to connect to Supabase server client for recent documents:", e);
    return RECENT_DOCS.slice(0, limit).map(toDocument);
  }
}

export async function getDocumentsByCommissionNumber(
  nr: string
): Promise<CommissionDocument[]> {
  try {
    const supabase = await createClient();
    
    // Find the commission first to get UUID
    const { data: comm, error: commErr } = await supabase
      .from("commissions")
      .select("id, customer_name")
      .eq("commission_number", nr)
      .maybeSingle();

    if (commErr || !comm) {
      if (commErr) {
        console.error("Error fetching commission for documents:", commErr.message);
      }
      return RECENT_DOCS.filter((d) => d.kommission === nr).map(toDocument);
    }

    const { data, error } = await supabase
      .from("documents")
      .select("id, document_type, title, created_by_initials, created_at")
      .eq("commission_id", comm.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents from Supabase:", error.message);
      return RECENT_DOCS.filter((d) => d.kommission === nr).map(toDocument);
    }

    if (!data || data.length === 0) {
      return RECENT_DOCS.filter((d) => d.kommission === nr).map(toDocument);
    }

    return data.map((item) => ({
      id: item.id,
      kommission: nr,
      kind: item.document_type as DocumentKind,
      label: item.title,
      client: comm.customer_name,
      stamp: new Date(item.created_at).toLocaleDateString("de-DE"),
      by: item.created_by_initials || "EDL",
    }));
  } catch (e) {
    console.error("Failed to connect to Supabase server client for commission documents:", e);
    return RECENT_DOCS.filter((d) => d.kommission === nr).map(toDocument);
  }
}

export async function getPalettesForCommission(
  nr: string
): Promise<Palette[]> {
  try {
    const supabase = await createClient();
    
    // Find the commission first
    const { data: comm, error: commErr } = await supabase
      .from("commissions")
      .select("id")
      .eq("commission_number", nr)
      .maybeSingle();

    if (commErr || !comm) {
      return PALETTES;
    }

    const { data, error } = await supabase
      .from("documents")
      .select("form_data")
      .eq("commission_id", comm.id)
      .eq("document_type", "palette")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return PALETTES;
    }

    // We have palette documents. Let's reconstruct the Palette array using the latest one
    const latestDoc = data[0];
    const formData = latestDoc.form_data as unknown as PaletteFormData;
    if (!formData || !formData.packageCount) {
      return PALETTES;
    }

    const count = formData.packageCount;
    const positionsList = formData.positionNumber 
      ? formData.positionNumber.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    return Array.from({ length: count }).map((_, i) => ({
      idx: i + 1,
      total: count,
      content: formData.objectName || "Möbelelemente",
      weight: "—",
      dim: formData.dimensions || "—",
      positions: positionsList,
      shippingNote: formData.shippingNote,
    }));
  } catch {
    return PALETTES;
  }
}

export async function getPalettePrintPage(
  nr: string,
  idx: number
): Promise<PalettePrintPage | null> {
  const commission = await getCommissionByNumber(nr);
  if (!commission) return null;
  const palettes = await getPalettesForCommission(nr);
  const palette = palettes.find((p) => p.idx === idx);
  if (!palette) return null;

  // Attempt print logging
  try {
    const supabase = await createClient();
    const { data: comm } = await supabase
      .from("commissions")
      .select("id")
      .eq("commission_number", nr)
      .maybeSingle();

    if (comm) {
      const { data: doc } = await supabase
        .from("documents")
        .select("id")
        .eq("commission_id", comm.id)
        .eq("document_type", "palette")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (doc) {
        await logPrintAction(
          doc.id,
          `Palette ${idx} / ${palette.total}`,
          commission.owner
        );
      }
    }
  } catch (e) {
    console.warn("Failed to log print action:", e);
  }

  return {
    commission,
    palette,
    printedBy: commission.owner,
    printedAt: new Date().toLocaleDateString("de-DE"),
  };
}

export async function getPalettePrintRange(
  nr: string,
  from: number,
  to: number
): Promise<PalettePrintPage[]> {
  if (!Number.isInteger(from) || !Number.isInteger(to)) return [];
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  if (lo < 1) return [];
  const commission = await getCommissionByNumber(nr);
  if (!commission) return [];

  const palettes = await getPalettesForCommission(nr);
  const inRange = palettes
    .filter((p) => p.idx >= lo && p.idx <= hi)
    .sort((a, b) => a.idx - b.idx);

  if (inRange.length === 0) return [];

  // Attempt print logging for the sequence
  try {
    const supabase = await createClient();
    const { data: comm } = await supabase
      .from("commissions")
      .select("id")
      .eq("commission_number", nr)
      .maybeSingle();

    if (comm) {
      const { data: doc } = await supabase
        .from("documents")
        .select("id")
        .eq("commission_id", comm.id)
        .eq("document_type", "palette")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (doc) {
        for (const p of inRange) {
          await logPrintAction(
            doc.id,
            `Palette ${p.idx} / ${p.total}`,
            commission.owner
          );
        }
      }
    }
  } catch (e) {
    console.warn("Failed to log print range action:", e);
  }

  const printedAt = new Date().toLocaleDateString("de-DE");
  return inRange.map((palette) => ({
    commission,
    palette,
    printedBy: commission.owner,
    printedAt,
  }));
}

export async function getLaufzettelPrintData(
  nr: string
): Promise<LaufzettelPrintData | null> {
  const commission = await getCommissionByNumber(nr);
  if (!commission) return null;

  let formData: LaufzettelFormData | undefined;
  
  try {
    const supabase = await createClient();
    const { data: comm } = await supabase
      .from("commissions")
      .select("id")
      .eq("commission_number", nr)
      .maybeSingle();

    if (comm) {
      const { data: doc } = await supabase
        .from("documents")
        .select("id, form_data")
        .eq("commission_id", comm.id)
        .eq("document_type", "laufzettel")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (doc) {
        formData = doc.form_data as unknown as LaufzettelFormData;
        await logPrintAction(
          doc.id,
          "Laufzettel",
          commission.owner
        );
      }
    }
  } catch (e) {
    console.warn("Failed to fetch Laufzettel form data or log print action:", e);
  }

  return {
    commission,
    materials: MATERIALS,
    stations: STATIONS,
    printedBy: commission.owner,
    printedAt: new Date().toLocaleDateString("de-DE"),
    formData,
  };
}

export async function createLaufzettelDocument(
  commissionNo: string,
  formData: LaufzettelFormData
): Promise<string> {
  const supabase = await createClient();
  
  // Find commission
  const { data: comm, error: commErr } = await supabase
    .from("commissions")
    .select("id")
    .eq("commission_number", commissionNo)
    .maybeSingle();

  if (commErr || !comm) {
    throw new Error(`Kommission ${commissionNo} nicht gefunden.`);
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      commission_id: comm.id,
      document_type: "laufzettel",
      title: "Laufzettel",
      form_data: formData as unknown as Record<string, unknown>,
      created_by_initials: (formData.employeeInitials || "EDL").toUpperCase()
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Error creating Laufzettel in Supabase:", error?.message);
    if (error?.message.includes("row-level security") || error?.message.includes("violates row-level security")) {
      throw new Error("Bitte melden Sie sich an, um Dokumente zu speichern.");
    }
    throw new Error(`Supabase Fehler: ${error?.message || "Unbekannter Fehler"}`);
  }

  return data.id;
}

export async function createPaletteDocument(
  commissionNo: string,
  formData: PaletteFormData
): Promise<string> {
  const supabase = await createClient();
  
  // Find commission
  const { data: comm, error: commErr } = await supabase
    .from("commissions")
    .select("id")
    .eq("commission_number", commissionNo)
    .maybeSingle();

  if (commErr || !comm) {
    throw new Error(`Kommission ${commissionNo} nicht gefunden.`);
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      commission_id: comm.id,
      document_type: "palette",
      title: `Palette (Anzahl: ${formData.packageCount})`,
      form_data: formData as unknown as Record<string, unknown>,
      created_by_initials: (formData.employeeInitials || "EDL").toUpperCase()
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Error creating Palette in Supabase:", error?.message);
    if (error?.message.includes("row-level security") || error?.message.includes("violates row-level security")) {
      throw new Error("Bitte melden Sie sich an, um Dokumente zu speichern.");
    }
    throw new Error(`Supabase Fehler: ${error?.message || "Unbekannter Fehler"}`);
  }

  return data.id;
}

export async function updateLaufzettelDocument(
  id: string,
  formData: LaufzettelFormData
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .update({
      form_data: formData as unknown as Record<string, unknown>,
      created_by_initials: (formData.employeeInitials || "EDL").toUpperCase(),
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    console.error(`Error updating Laufzettel ${id}:`, error.message);
    if (error.message.includes("row-level security") || error.message.includes("violates row-level security")) {
      throw new Error("Bitte melden Sie sich an, um Dokumente zu bearbeiten.");
    }
    throw new Error(`Supabase Fehler: ${error.message}`);
  }
}

export async function updatePaletteDocument(
  id: string,
  formData: PaletteFormData
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .update({
      title: `Palette (Anzahl: ${formData.packageCount})`,
      form_data: formData as unknown as Record<string, unknown>,
      created_by_initials: (formData.employeeInitials || "EDL").toUpperCase(),
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    console.error(`Error updating Palette ${id}:`, error.message);
    if (error.message.includes("row-level security") || error.message.includes("violates row-level security")) {
      throw new Error("Bitte melden Sie sich an, um Dokumente zu bearbeiten.");
    }
    throw new Error(`Supabase Fehler: ${error.message}`);
  }
}

export async function getDocumentById(id: string): Promise<Document | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("documents")
      .select("id, commission_id, document_type, title, form_data, created_by_initials, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      console.error(`Error fetching document ${id}:`, error?.message);
      return null;
    }

    return data as unknown as Document;
  } catch (e) {
    console.error(`Failed to connect to Supabase for document ${id}:`, e);
    return null;
  }
}

export async function getPalettePrintPageByDocId(
  docId: string,
  idx: number
): Promise<PalettePrintPage | null> {
  try {
    const supabase = await createClient();
    const { data: docData, error } = await supabase
      .from("documents")
      .select("*, commissions(*)")
      .eq("id", docId)
      .maybeSingle();

    if (error || !docData) return null;

    const comm = docData.commissions;
    if (!comm) return null;

    const commission = {
      no: comm.commission_number,
      client: comm.customer_name,
      project: comm.project_name || "",
      status: "in-progress" as const,
      updated: new Date(comm.updated_at || comm.created_at).toLocaleDateString("de-DE"),
      owner: comm.created_by_initials || "EDL",
      docs: 0,
      note: comm.notes || "",
    };

    const formData = docData.form_data as unknown as PaletteFormData;
    const count = formData.packageCount || 1;
    const positionsList = formData.positionNumber 
      ? formData.positionNumber.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

    const palette: Palette = {
      idx,
      total: count,
      content: formData.objectName || "Möbelelemente",
      weight: "—",
      dim: formData.dimensions || "—",
      positions: positionsList,
      shippingNote: formData.shippingNote,
    };

    // Log print action
    await logPrintAction(
      docId,
      `Palette ${idx} / ${count}`,
      commission.owner
    );

    return {
      commission,
      palette,
      printedBy: commission.owner,
      printedAt: new Date().toLocaleDateString("de-DE"),
    };
  } catch (e) {
    console.error("Error in getPalettePrintPageByDocId:", e);
    return null;
  }
}

export async function getPalettePrintRangeByDocId(
  docId: string,
  from: number,
  to: number
): Promise<PalettePrintPage[]> {
  if (!Number.isInteger(from) || !Number.isInteger(to)) return [];
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  if (lo < 1) return [];

  try {
    const supabase = await createClient();
    const { data: docData, error } = await supabase
      .from("documents")
      .select("*, commissions(*)")
      .eq("id", docId)
      .maybeSingle();

    if (error || !docData) return [];

    const comm = docData.commissions;
    if (!comm) return [];

    const commission = {
      no: comm.commission_number,
      client: comm.customer_name,
      project: comm.project_name || "",
      status: "in-progress" as const,
      updated: new Date(comm.updated_at || comm.created_at).toLocaleDateString("de-DE"),
      owner: comm.created_by_initials || "EDL",
      docs: 0,
      note: comm.notes || "",
    };

    const formData = docData.form_data as unknown as PaletteFormData;
    const count = formData.packageCount || 1;
    const positionsList = formData.positionNumber 
      ? formData.positionNumber.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

    const pages: PalettePrintPage[] = [];
    const printedAt = new Date().toLocaleDateString("de-DE");

    for (let idx = lo; idx <= Math.min(hi, count); idx++) {
      const palette: Palette = {
        idx,
        total: count,
        content: formData.objectName || "Möbelelemente",
        weight: "—",
        dim: formData.dimensions || "—",
        positions: positionsList,
        shippingNote: formData.shippingNote,
      };

      await logPrintAction(
        docId,
        `Palette ${idx} / ${count}`,
        commission.owner
      );

      pages.push({
        commission,
        palette,
        printedBy: commission.owner,
        printedAt,
      });
    }

    return pages;
  } catch (e) {
    console.error("Error in getPalettePrintRangeByDocId:", e);
    return [];
  }
}


