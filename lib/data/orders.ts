import type {
  Order,
  OrderBatch,
  CreateOrderInput,
} from "@/lib/types";
import { ORDER_SUPPLIERS } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

interface DBOrder {
  id: string;
  batch_id: string | null;
  supplier: string;
  custom_supplier: string | null;
  article: string | null;
  article_number: string | null;
  quantity: number;
  note: string | null;
  employee_initials: string;
  urgent: boolean | null;
  deliver_by: string | null;
  created_at: string;
}

function toOrder(row: DBOrder): Order {
  return {
    id: row.id,
    supplier: row.supplier,
    customSupplier: row.custom_supplier ?? undefined,
    article: row.article ?? undefined,
    articleNumber: row.article_number ?? undefined,
    quantity: row.quantity,
    note: row.note ?? undefined,
    employeeInitials: row.employee_initials,
    urgent: row.urgent ?? false,
    deliverBy: row.deliver_by ?? undefined,
    createdAt: formatDate(row.created_at),
  };
}

const SELECT =
  "id, batch_id, supplier, custom_supplier, article, article_number, quantity, note, employee_initials, urgent, deliver_by, created_at";

function supplierRank(s: string): number {
  const i = (ORDER_SUPPLIERS as readonly string[]).indexOf(s);
  return i === -1 ? ORDER_SUPPLIERS.length : i;
}

// ─── Reads ──────────────────────────────────────────────────────────────────

/** Offene (noch nicht aufgegebene) Bestellungen — batch_id IS NULL. */
export async function getOpenOrders(): Promise<Order[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .select(SELECT)
      .is("batch_id", null)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error fetching open orders:", error.message);
      return [];
    }
    return (data ?? [])
      .map((r) => toOrder(r as DBOrder))
      .sort(
        (a, b) =>
          supplierRank(a.supplier) - supplierRank(b.supplier) ||
          a.createdAt.localeCompare(b.createdAt)
      );
  } catch (e) {
    console.error("Failed to fetch open orders:", e);
    return [];
  }
}

/** Archiv: aufgegebene Bestell-Stapel, neueste zuerst, je mit ihren Positionen. */
export async function getArchivedBatches(): Promise<OrderBatch[]> {
  try {
    const supabase = await createClient();
    const { data: batches, error } = await supabase
      .from("order_batches")
      .select("id, placed_at, placed_by_initials")
      .order("placed_at", { ascending: false });
    if (error || !batches || batches.length === 0) return [];

    const { data: orders } = await supabase
      .from("orders")
      .select(SELECT)
      .not("batch_id", "is", null);

    const byBatch = new Map<string, Order[]>();
    (orders ?? []).forEach((row) => {
      const o = row as DBOrder;
      const list = byBatch.get(o.batch_id as string) ?? [];
      list.push(toOrder(o));
      byBatch.set(o.batch_id as string, list);
    });

    return batches.map((b) => ({
      id: b.id,
      placedAt: formatDate(b.placed_at),
      placedByInitials: b.placed_by_initials ?? undefined,
      orders: (byBatch.get(b.id) ?? []).sort(
        (a, c) => supplierRank(a.supplier) - supplierRank(c.supplier)
      ),
    }));
  } catch (e) {
    console.error("Failed to fetch archived batches:", e);
    return [];
  }
}

// ─── Writes ─────────────────────────────────────────────────────────────────

function validate(input: CreateOrderInput) {
  if (!input.supplier?.trim()) throw new Error("Lieferant ist erforderlich.");
  if (input.supplier === "Sonstiges" && !input.customSupplier?.trim()) {
    throw new Error("Bei „Sonstiges“ bitte Lieferant/Firma angeben.");
  }
  if (!input.employeeInitials?.trim()) {
    throw new Error("Mitarbeiter ist erforderlich.");
  }
  if (!Number.isFinite(input.quantity) || input.quantity < 1) {
    throw new Error("Menge muss mindestens 1 sein.");
  }
}

function toRow(input: CreateOrderInput) {
  return {
    supplier: input.supplier,
    custom_supplier:
      input.supplier === "Sonstiges" ? input.customSupplier?.trim() || null : null,
    article: input.article?.trim() || null,
    article_number: input.articleNumber?.trim() || null,
    quantity: Math.floor(input.quantity),
    note: input.note?.trim() || null,
    employee_initials: input.employeeInitials.trim(),
    urgent: !!input.urgent,
    deliver_by: input.deliverBy?.trim() || null,
  };
}

export async function createOrder(input: CreateOrderInput): Promise<void> {
  validate(input);
  const supabase = await createClient();
  const { error } = await supabase.from("orders").insert(toRow(input));
  if (error) throw new Error(`Fehler beim Anlegen: ${error.message}`);
}

export async function updateOrder(
  id: string,
  input: CreateOrderInput
): Promise<void> {
  validate(input);
  const supabase = await createClient();
  const { error } = await supabase.from("orders").update(toRow(input)).eq("id", id);
  if (error) throw new Error(`Fehler beim Bearbeiten: ${error.message}`);
}

export async function deleteOrder(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) throw new Error(`Fehler beim Löschen: ${error.message}`);
}

/**
 * Gesamte offene Liste aufgeben: legt einen Archiv-Stapel an und hängt alle
 * offenen Bestellungen daran. Danach ist die offene Liste leer.
 */
export async function placeOrder(placedByInitials?: string): Promise<void> {
  const supabase = await createClient();

  const { data: open, error: readErr } = await supabase
    .from("orders")
    .select("id")
    .is("batch_id", null);
  if (readErr) throw new Error(`Fehler: ${readErr.message}`);
  if (!open || open.length === 0) {
    throw new Error("Es gibt keine offenen Bestellungen zum Aufgeben.");
  }

  const { data: batch, error: batchErr } = await supabase
    .from("order_batches")
    .insert({ placed_by_initials: placedByInitials || null })
    .select("id")
    .single();
  if (batchErr || !batch) throw new Error(`Fehler beim Archivieren: ${batchErr?.message}`);

  const { error: updErr } = await supabase
    .from("orders")
    .update({ batch_id: batch.id })
    .is("batch_id", null);
  if (updErr) throw new Error(`Fehler beim Archivieren: ${updErr.message}`);
}
