"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Company } from "@/lib/auslagen/types";
import { updateCompanyAction, type CompanyActionResult } from "./actions";

type Values = { name: string; address: string; recipient_email: string };

function toValues(company: Company): Values {
  return {
    name: company.name ?? "",
    address: company.address ?? "",
    recipient_email: company.recipient_email ?? "",
  };
}

export function CompanyForm({ company, index }: { company: Company; index: number }) {
  const [values, setValues] = useState<Values>(() => toValues(company));
  const [result, setResult] = useState<CompanyActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const idPrefix = `firma-${company.id}`;

  const update = (key: keyof Values, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (result?.ok) setResult(null);
    else if (result?.fieldErrors?.[key]) {
      const fieldErrors = { ...result.fieldErrors };
      delete fieldErrors[key];
      setResult({ ...result, fieldErrors });
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateCompanyAction(company.id, formData);
      setResult(res);
      if (res.ok && res.company) setValues(toValues(res.company));
    });
  };

  const error = (key: keyof Values) => result?.fieldErrors?.[key];

  return (
    <form className="aus-card" onSubmit={handleSubmit} noValidate aria-labelledby={`${idPrefix}-titel`}>
      <div className="aus-card-head">
        <h2 id={`${idPrefix}-titel`} className="aus-card-title">
          {values.name || company.name}
        </h2>
        <span className="aus-index">{String(index).padStart(2, "0")}</span>
      </div>

      {result?.error && (
        <div className="aus-note is-danger" role="alert">
          <span className="aus-note-icon" aria-hidden="true">
            <Icon name="alert" size={18} />
          </span>
          <div className="aus-note-body">
            <p>{result.error}</p>
          </div>
        </div>
      )}
      {result?.ok && (
        <div className="aus-note is-success" role="status">
          <span className="aus-note-icon" aria-hidden="true">
            <Icon name="check" size={18} />
          </span>
          <div className="aus-note-body">
            <p>{result.message}</p>
          </div>
        </div>
      )}

      <div className="aus-field">
        <label htmlFor={`${idPrefix}-name`} className="aus-label">
          Name<span className="aus-req" aria-hidden="true">*</span>
        </label>
        <input
          id={`${idPrefix}-name`}
          name="name"
          type="text"
          className="aus-input"
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          required
          maxLength={120}
          disabled={pending}
          aria-invalid={error("name") ? true : undefined}
        />
        {error("name") && <span className="aus-field-error">{error("name")}</span>}
      </div>

      <div className="aus-field">
        <label htmlFor={`${idPrefix}-address`} className="aus-label">
          Adresse
        </label>
        <textarea
          id={`${idPrefix}-address`}
          name="address"
          className="aus-textarea"
          rows={4}
          value={values.address}
          onChange={(e) => update("address", e.target.value)}
          maxLength={500}
          placeholder={"Straße Nr.\nPLZ Ort"}
          disabled={pending}
          aria-invalid={error("address") ? true : undefined}
        />
        {error("address") ? (
          <span className="aus-field-error">{error("address")}</span>
        ) : (
          <span className="aus-help">Mehrzeilig — erscheint im Antrag als Empfängeranschrift.</span>
        )}
      </div>

      <div className="aus-field">
        <label htmlFor={`${idPrefix}-email`} className="aus-label">
          Empfänger-E-Mail
        </label>
        <input
          id={`${idPrefix}-email`}
          name="recipient_email"
          type="email"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className="aus-input"
          value={values.recipient_email}
          onChange={(e) => update("recipient_email", e.target.value)}
          maxLength={200}
          disabled={pending}
          aria-invalid={error("recipient_email") ? true : undefined}
        />
        {error("recipient_email") ? (
          <span className="aus-field-error">{error("recipient_email")}</span>
        ) : (
          <span className="aus-help">An diese Adresse werden die Anträge dieser Firma geschickt.</span>
        )}
      </div>

      <div className="aus-actions">
        <button type="submit" className="aus-btn aus-btn-primary" disabled={pending}>
          <Icon name="check" size={16} />
          {pending ? "Wird gespeichert …" : "Speichern"}
        </button>
      </div>
    </form>
  );
}
