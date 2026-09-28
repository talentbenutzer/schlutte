alter table public.expense_claims
  add column if not exists email_sent_at timestamptz,
  add column if not exists email_message_id text;

comment on column public.expense_claims.email_sent_at is
  'Zeitpunkt, zu dem das Antrags-PDF automatisch an recipient_email gesendet wurde.';

