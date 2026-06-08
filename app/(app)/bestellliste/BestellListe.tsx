"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { ORDER_SUPPLIERS } from "@/lib/types";
import type { Order, OrderBatch, CreateOrderInput } from "@/lib/types";
import {
  createOrderAction,
  updateOrderAction,
  deleteOrderAction,
  placeOrderAction,
} from "./actions";

type EmployeeOption = { initials: string; name: string };

const EMPTY = {
  supplier: "",
  customSupplier: "",
  article: "",
  articleNumber: "",
  quantity: 1,
  note: "",
  employeeInitials: "",
  urgent: false,
  deliverBy: "",
};

function fmtDate(d?: string): string {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return y && m && day ? `${day}.${m}.${y}` : d;
}

function groupBySupplier(orders: Order[]): { supplier: string; items: Order[] }[] {
  const groups: { supplier: string; items: Order[] }[] = [];
  for (const sup of ORDER_SUPPLIERS) {
    const items = orders.filter((o) => o.supplier === sup);
    if (items.length) groups.push({ supplier: sup, items });
  }
  // any unknown suppliers (defensive)
  const known = new Set<string>(ORDER_SUPPLIERS as readonly string[]);
  const rest = orders.filter((o) => !known.has(o.supplier));
  if (rest.length) groups.push({ supplier: "Weitere", items: rest });
  return groups;
}

function supplierLabel(o: Order): string {
  return o.supplier === "Sonstiges" && o.customSupplier
    ? `Sonstiges · ${o.customSupplier}`
    : o.supplier;
}

export function BestellListe({
  openOrders,
  batches,
  employees,
}: {
  openOrders: Order[];
  batches: OrderBatch[];
  employees: EmployeeOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [f, setF] = useState({ ...EMPTY });

  const set = (k: keyof typeof f, v: string | number) =>
    setF((prev) => ({ ...prev, [k]: v }));

  const resetForm = () => {
    setF({ ...EMPTY });
    setEditingId(null);
    setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const input: CreateOrderInput = {
      supplier: f.supplier,
      customSupplier: f.customSupplier,
      article: f.article,
      articleNumber: f.articleNumber,
      quantity: Number(f.quantity),
      note: f.note,
      employeeInitials: f.employeeInitials,
      urgent: f.urgent,
      deliverBy: f.deliverBy,
    };
    if (!input.supplier) return setError("Bitte einen Lieferanten wählen.");
    if (!input.employeeInitials) return setError("Bitte einen Mitarbeiter wählen.");
    if (input.supplier === "Sonstiges" && !input.customSupplier?.trim())
      return setError("Bei „Sonstiges“ bitte Lieferant/Firma angeben.");

    startTransition(async () => {
      const res = editingId
        ? await updateOrderAction(editingId, input)
        : await createOrderAction(input);
      if (res.error) {
        setError(res.error);
        return;
      }
      resetForm();
      router.refresh();
    });
  };

  const handleEdit = (o: Order) => {
    setEditingId(o.id);
    setError("");
    setF({
      supplier: o.supplier,
      customSupplier: o.customSupplier ?? "",
      article: o.article ?? "",
      articleNumber: o.articleNumber ?? "",
      quantity: o.quantity,
      note: o.note ?? "",
      employeeInitials: o.employeeInitials,
      urgent: o.urgent,
      deliverBy: o.deliverBy ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (o: Order) => {
    if (!window.confirm(`Bestellung „${o.article || o.supplier}“ löschen?`)) return;
    startTransition(async () => {
      const res = await deleteOrderAction(o.id);
      if (res.error) setError(res.error);
      if (editingId === o.id) resetForm();
      router.refresh();
    });
  };

  const handlePlace = () => {
    if (
      !window.confirm(
        "Komplette Liste aufgeben? Die Liste wandert ins Archiv und die offene Liste wird danach geleert."
      )
    )
      return;
    startTransition(async () => {
      const res = await placeOrderAction();
      if (res.error) setError(res.error);
      router.refresh();
    });
  };

  const groups = groupBySupplier(openOrders);
  const inputStyle = { width: "100%" } as const;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 40, alignItems: "start" }}>
      {/* LEFT: form + open orders + place button */}
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {/* ---- Form ---- */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            border: "1px solid var(--border)",
            padding: 24,
            background: "var(--bg-raised)",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span className="grb-eyebrow">{editingId ? "Bestellung bearbeiten" : "Neue Bestellung"}</span>
            {editingId && (
              <button type="button" className="grb-btn-link" style={{ fontSize: 11 }} onClick={resetForm}>
                Abbrechen <Icon name="x" size={12} />
              </button>
            )}
          </div>

          {error && (
            <div role="alert" style={{ border: "1px solid var(--gd-danger)", color: "var(--gd-danger)", padding: "10px 14px", fontFamily: "var(--font-sans)", fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Lieferant *">
              <select className="grb-input" style={inputStyle} value={f.supplier} onChange={(e) => set("supplier", e.target.value)} required>
                <option value="">— wählen —</option>
                {ORDER_SUPPLIERS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>

            <Field label="Mitarbeiter *">
              <select className="grb-input" style={inputStyle} value={f.employeeInitials} onChange={(e) => set("employeeInitials", e.target.value)} required>
                <option value="">— wählen —</option>
                {employees.map((e) => (
                  <option key={e.initials} value={e.initials}>
                    {e.initials} · {e.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {f.supplier === "Sonstiges" && (
            <Field label="Lieferant / Firma *">
              <input className="grb-input" value={f.customSupplier} onChange={(e) => set("customSupplier", e.target.value)} placeholder="Firmenname" />
            </Field>
          )}

          <Field label="Artikel / Beschreibung">
            <input className="grb-input" value={f.article} onChange={(e) => set("article", e.target.value)} placeholder="z. B. Spanplattenschrauben 4×40" />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
            <Field label="Artikelnummer">
              <input className="grb-input" value={f.articleNumber} onChange={(e) => set("articleNumber", e.target.value)} placeholder="z. B. 0153 40" />
            </Field>
            <Field label="Menge">
              <input className="grb-input" type="number" min={1} value={f.quantity} onChange={(e) => set("quantity", Number(e.target.value))} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
            <Field label="Bemerkung">
              <input className="grb-input" value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="Optional" />
            </Field>
            <Field label="Lieferung bis spätestens">
              <input className="grb-input" type="date" value={f.deliverBy} onChange={(e) => set("deliverBy", e.target.value)} />
            </Field>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg)" }}>
            <input
              type="checkbox"
              checked={f.urgent}
              onChange={(e) => setF((prev) => ({ ...prev, urgent: e.target.checked }))}
            />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="alert" size={15} style={{ color: "var(--gd-danger)" }} />
              Dringend
            </span>
          </label>

          <div>
            <button type="submit" className="grb-btn grb-btn-primary" disabled={pending}>
              <Icon name={editingId ? "check" : "plus"} size={14} />
              {editingId ? "Änderungen speichern" : "Zur Liste hinzufügen"}
            </button>
          </div>
        </form>

        {/* ---- Archiv (links, unter dem Formular) ---- */}
        <section>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="grb-eyebrow">Archiv</span>
            <span className="grb-index">{batches.length} Bestellungen</span>
          </div>
          {batches.length === 0 ? (
            <div style={{ border: "1px dashed var(--border-strong)", padding: "20px 24px", fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--fg-muted)" }}>
              Noch keine Bestellung aufgegeben.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {batches.map((b) => (
                <div key={b.id} style={{ border: "1px solid var(--border)", background: "var(--bg-alt)", padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg)", letterSpacing: "0.06em" }}>{b.placedAt}</span>
                    {b.placedByInitials && (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", letterSpacing: "0.12em", textTransform: "uppercase" }}>{b.placedByInitials}</span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {b.orders.map((o) => (
                      <div key={o.id} style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.4 }}>
                        {o.urgent && (
                          <Icon name="alert" size={13} style={{ color: "var(--gd-danger)", verticalAlign: "-2px", marginRight: 4 }} />
                        )}
                        <span style={{ color: "var(--fg)", fontWeight: 500 }}>{o.quantity}× {o.article || "—"}</span>
                        {" — "}{supplierLabel(o)}
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-subtle)" }}>
                          {o.articleNumber ? ` · Art. ${o.articleNumber}` : ""} · {o.employeeInitials}
                          {o.deliverBy ? ` · bis ${fmtDate(o.deliverBy)}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* RIGHT: offene Liste + Bestellung aufgeben */}
      <aside>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
          <span className="grb-eyebrow">Offene Liste</span>
          <span className="grb-index">{openOrders.length} Positionen</span>
        </div>

        {openOrders.length === 0 ? (
          <div style={{ border: "1px dashed var(--border-strong)", padding: "24px 28px", fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg-muted)" }}>
            Noch keine Bestellungen erfasst.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {groups.map((g) => (
              <div key={g.supplier}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--fg)", marginBottom: 6, paddingBottom: 6, borderBottom: "1px solid var(--fg)" }}>
                  {g.supplier}
                </div>
                {g.items.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto auto",
                      alignItems: "center",
                      gap: 16,
                      padding: "12px 0",
                      borderBottom: "1px solid var(--hairline)",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg)", fontWeight: 500 }}>
                        {o.urgent && (
                          <Icon name="alert" size={16} style={{ color: "var(--gd-danger)", flexShrink: 0 }} />
                        )}
                        <span>
                          {o.article || "—"}
                          {o.supplier === "Sonstiges" && o.customSupplier ? (
                            <span style={{ color: "var(--fg-subtle)", fontWeight: 400 }}> · {o.customSupplier}</span>
                          ) : null}
                        </span>
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-subtle)", marginTop: 2 }}>
                        {[
                          o.deliverBy ? `bis ${fmtDate(o.deliverBy)}` : null,
                          o.articleNumber ? `Art. ${o.articleNumber}` : null,
                          `Bestellung von: ${o.employeeInitials}`,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>
                      {o.note ? (
                        <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--fg-muted)", marginTop: 3 }}>
                          {o.note}
                        </div>
                      ) : null}
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg)" }}>{o.quantity}×</span>
                    <button type="button" onClick={() => handleEdit(o)} title="Bearbeiten" style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--fg-muted)", padding: 4 }}>
                      <Icon name="edit" size={15} />
                    </button>
                    <button type="button" onClick={() => handleDelete(o)} title="Löschen" disabled={pending} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--gd-danger)", padding: 4 }}>
                      <Icon name="x" size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Place order — vorerst für alle sichtbar, später nur Admin */}
        {openOrders.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <button type="button" className="grb-btn grb-btn-primary" onClick={handlePlace} disabled={pending}>
              <Icon name="check" size={14} /> Bestellung wurde aufgegeben (NOAH)
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span className="grb-eyebrow">{label}</span>
      {children}
    </label>
  );
}
