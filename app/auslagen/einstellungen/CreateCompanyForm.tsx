"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { createCompanyAction, type CompanyActionResult } from "./actions";

/** Formular zum Anlegen einer neuen Firma — Kennung wird aus dem Namen abgeleitet. */
export function CreateCompanyForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [result, setResult] = useState<CompanyActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createCompanyAction(formData);
      setResult(res);
      if (res.ok) {
        formRef.current?.reset();
        router.refresh();
      }
    });
  };

  const error = (key: string) => result?.fieldErrors?.[key];

  return (
    <form className="aus-card" ref={formRef} onSubmit={handleSubmit} noValidate aria-labelledby="neue-firma-titel">
      <div className="aus-card-head">
        <h2 id="neue-firma-titel" className="aus-card-title">
          Neue Firma anlegen
        </h2>
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
        <label htmlFor="neue-firma-name" className="aus-label">
          Name<span className="aus-req" aria-hidden="true">*</span>
        </label>
        <input
          id="neue-firma-name"
          name="name"
          type="text"
          className="aus-input"
          required
          maxLength={120}
          disabled={pending}
          aria-invalid={error("name") ? true : undefined}
        />
        {error("name") && <span className="aus-field-error">{error("name")}</span>}
      </div>

      <div className="aus-field">
        <label htmlFor="neue-firma-address" className="aus-label">
          Adresse
        </label>
        <textarea
          id="neue-firma-address"
          name="address"
          className="aus-textarea"
          rows={4}
          maxLength={500}
          placeholder={"Straße Nr.\nPLZ Ort"}
          disabled={pending}
          aria-invalid={error("address") ? true : undefined}
        />
        {error("address") && <span className="aus-field-error">{error("address")}</span>}
      </div>

      <div className="aus-field">
        <label htmlFor="neue-firma-email" className="aus-label">
          Empfänger-E-Mail
        </label>
        <input
          id="neue-firma-email"
          name="recipient_email"
          type="email"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className="aus-input"
          maxLength={200}
          disabled={pending}
          aria-invalid={error("recipient_email") ? true : undefined}
        />
        {error("recipient_email") && <span className="aus-field-error">{error("recipient_email")}</span>}
      </div>

      <div className="aus-actions">
        <button type="submit" className="aus-btn aus-btn-primary" disabled={pending}>
          <Icon name="plus" size={16} />
          {pending ? "Wird angelegt …" : "Firma anlegen"}
        </button>
      </div>
    </form>
  );
}
