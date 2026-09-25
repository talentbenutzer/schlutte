"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatIban, isValidIban, normalizeIban } from "@/lib/auslagen/format";
import { getMissingProfileFields } from "@/lib/auslagen/profile";
import { PROFILE_FIELDS, type ProfileFieldKey } from "@/lib/auslagen/types";
import { saveProfileAction, type ProfileActionResult } from "./actions";

type Values = Record<ProfileFieldKey, string>;

const FIELD = Object.fromEntries(PROFILE_FIELDS.map((f) => [f.key, f])) as Record<
  ProfileFieldKey,
  (typeof PROFILE_FIELDS)[number]
>;

const INPUT_HINTS: Partial<
  Record<ProfileFieldKey, { inputMode?: "numeric" | "text"; placeholder?: string; mono?: boolean }>
> = {
  postal_code: { inputMode: "numeric" },
  iban: { placeholder: "DE00 0000 0000 0000 0000 00", mono: true },
  bic: { placeholder: "z. B. COBADEFFXXX", mono: true },
};

export function ProfileForm({
  initial,
  isNew,
  disabled = false,
}: {
  initial: Values;
  isNew: boolean;
  disabled?: boolean;
}) {
  const [values, setValues] = useState<Values>(initial);
  const [result, setResult] = useState<ProfileActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const missing = getMissingProfileFields(values);
  const iban = normalizeIban(values.iban);
  const ibanState = iban.length < 15 ? "empty" : isValidIban(iban) ? "valid" : "invalid";

  const update = (key: ProfileFieldKey, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (result?.ok) setResult(null);
    else if (result?.fieldErrors?.[key]) {
      // Feldfehler ausblenden, sobald das Feld korrigiert wird.
      const fieldErrors = { ...result.fieldErrors };
      delete fieldErrors[key];
      setResult({ ...result, fieldErrors });
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (disabled) return;
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveProfileAction(formData);
      setResult(res);
      if (res.ok && res.values) {
        setValues({ ...res.values, iban: formatIban(res.values.iban) });
      }
    });
  };

  const field = (key: ProfileFieldKey, opts: { span?: boolean; help?: string } = {}) => {
    const def = FIELD[key];
    const hints = INPUT_HINTS[key] ?? {};
    const error = result?.fieldErrors?.[key];
    const id = `profil-${key}`;
    const helpId = `${id}-hilfe`;
    let clientMessage: ReactNode = null;
    if (!error && key === "iban" && ibanState === "valid") {
      clientMessage = <span className="aus-field-ok">IBAN gültig</span>;
    } else if (!error && key === "iban" && ibanState === "invalid") {
      clientMessage = <span className="aus-field-error">IBAN ungültig — bitte prüfen.</span>;
    }

    return (
      <div className={`aus-field${opts.span ? " aus-span-2" : ""}`}>
        <label htmlFor={id} className="aus-label">
          {def.label}
          {def.required && (
            <span className="aus-req" aria-hidden="true">
              *
            </span>
          )}
        </label>
        <input
          id={id}
          name={key}
          type="text"
          className={`aus-input${hints.mono ? " is-mono" : ""}`}
          value={values[key]}
          onChange={(e) => update(key, e.target.value)}
          onBlur={
            key === "iban"
              ? () => values.iban.trim() && update("iban", formatIban(values.iban))
              : undefined
          }
          autoComplete={def.autoComplete}
          inputMode={hints.inputMode}
          placeholder={hints.placeholder}
          autoCapitalize={key === "iban" || key === "bic" ? "characters" : undefined}
          spellCheck={key === "iban" || key === "bic" ? false : undefined}
          maxLength={200}
          disabled={disabled || pending}
          aria-invalid={error || (key === "iban" && ibanState === "invalid") ? true : undefined}
          aria-describedby={error || opts.help ? helpId : undefined}
        />
        {error ? (
          <span id={helpId} className="aus-field-error">
            {error}
          </span>
        ) : opts.help ? (
          <span id={helpId} className="aus-help">
            {opts.help}
          </span>
        ) : null}
        {clientMessage}
      </div>
    );
  };

  return (
    <form className="aus-form" onSubmit={handleSubmit} noValidate>
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
      {!disabled && missing.length > 0 && (
        <div className="aus-note is-warn">
          <span className="aus-note-icon" aria-hidden="true">
            <Icon name="alert" size={18} />
          </span>
          <div className="aus-note-body">
            <p className="aus-note-title">
              {isNew ? "Noch kein Profil gespeichert" : "Für Anträge fehlen noch Angaben"}
            </p>
            <p>Bitte ergänzen: {missing.join(", ")}.</p>
          </div>
        </div>
      )}

      <fieldset className="aus-fieldset">
        <legend className="aus-legend">Person</legend>
        <div className="aus-grid aus-grid-2">
          {field("last_name")}
          {field("first_name")}
          {field("street", { span: true })}
          {field("postal_code")}
          {field("city")}
        </div>
      </fieldset>

      <fieldset className="aus-fieldset">
        <legend className="aus-legend">Zuordnung</legend>
        <div className="aus-grid aus-grid-2">
          {field("personnel_no", { help: "Optional — erscheint im Antrag, wenn angegeben." })}
          {field("cost_center", { help: "Optional." })}
        </div>
      </fieldset>

      <fieldset className="aus-fieldset">
        <legend className="aus-legend">Bankverbindung</legend>
        <div className="aus-grid aus-grid-2">
          {field("account_holder", { span: true })}
          {field("iban", { span: true })}
          {field("bic")}
          {field("bank_name")}
        </div>
      </fieldset>

      <p className="aus-help">
        <span className="aus-req">*</span> für den Antrag erforderlich. Die Angaben sind nur für dich
        sichtbar.
      </p>

      <div className="aus-actions">
        <button type="submit" className="aus-btn aus-btn-primary" disabled={disabled || pending}>
          <Icon name="check" size={16} />
          {pending ? "Wird gespeichert …" : "Profil speichern"}
        </button>
      </div>
    </form>
  );
}
