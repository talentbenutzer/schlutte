-- Zahlungswege bleiben unabhängig vom Kostenträger (privat/Firma).
alter table public.receipts add column if not exists payment_channel text;
alter table public.receipts add column if not exists payment_reviewed_at timestamptz;
alter table public.receipts add column if not exists payment_reviewed_by uuid references auth.users (id) on delete set null;
alter table public.receipts drop constraint if exists receipts_payment_channel_check;
alter table public.receipts add constraint receipts_payment_channel_check
  check (payment_channel in ('amex', 'bar', 'ec', 'kreditkarte', 'tank_raststaetten'));

alter table public.credit_cards add column if not exists payment_channel text;
alter table public.credit_cards drop constraint if exists credit_cards_payment_channel_check;
alter table public.credit_cards add constraint credit_cards_payment_channel_check
  check (payment_channel in ('amex', 'ec', 'kreditkarte', 'tank_raststaetten'));

-- App-Nutzer ohne Finanzrolle dürfen Firmenzahlungen und deren Prüfstatus
-- nicht direkt über die Supabase-API setzen, auch wenn sie den Beleg besitzen.
create or replace function public.receipts_guard_finance_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.payment_method = 'kreditkarte' or new.credit_card_id is not null
       or new.payment_reviewed_at is not null or new.payment_reviewed_by is not null then
      if public.app_role() not in ('ceo', 'admin') then
        raise exception 'Nur CEO und Administratoren dürfen Firmenzahlungen erfassen.' using errcode = '42501';
      end if;
    end if;
  elsif new.payment_method is distinct from old.payment_method
     or new.credit_card_id is distinct from old.credit_card_id
     or new.payment_reviewed_at is distinct from old.payment_reviewed_at
     or new.payment_reviewed_by is distinct from old.payment_reviewed_by then
    if public.app_role() not in ('ceo', 'admin') then
      raise exception 'Nur CEO und Administratoren dürfen Firmenzahlungen prüfen.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists receipts_guard_finance_fields on public.receipts;
create trigger receipts_guard_finance_fields
  before insert or update on public.receipts
  for each row execute function public.receipts_guard_finance_fields();

-- Lesestatus gehört dem jeweiligen CEO/Admin; Mitarbeiter sehen ihn nicht.
create table if not exists public.expense_claim_reads (
  claim_id uuid not null references public.expense_claims (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (claim_id, user_id)
);

create index if not exists expense_claim_reads_user_idx on public.expense_claim_reads (user_id);
create index if not exists expense_claims_submitted_idx on public.expense_claims (sent_at desc)
  where status = 'versendet';
grant select, insert, update on public.expense_claim_reads to authenticated;
alter table public.expense_claim_reads enable row level security;

drop policy if exists expense_claim_reads_select on public.expense_claim_reads;
create policy expense_claim_reads_select on public.expense_claim_reads
  for select to authenticated
  using (user_id = (select auth.uid()) and (select public.app_role()) in ('ceo', 'admin'));

drop policy if exists expense_claim_reads_insert on public.expense_claim_reads;
create policy expense_claim_reads_insert on public.expense_claim_reads
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.app_role()) in ('ceo', 'admin')
    and exists (select 1 from public.expense_claims c where c.id = claim_id and c.status = 'versendet')
  );

drop policy if exists expense_claim_reads_update on public.expense_claim_reads;
create policy expense_claim_reads_update on public.expense_claim_reads
  for update to authenticated
  using (user_id = (select auth.uid()) and (select public.app_role()) in ('ceo', 'admin'))
  with check (user_id = (select auth.uid()) and (select public.app_role()) in ('ceo', 'admin'));

-- Nur eingereichte Anträge sind für die Finanzrolle sichtbar.
drop policy if exists expense_claims_select on public.expense_claims;
create policy expense_claims_select on public.expense_claims
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (status = 'versendet' and (select public.app_role()) in ('ceo', 'admin'))
  );

-- Der private Storage-Bucket gibt die Antrags-PDFs nur für eingereichte
-- Anträge an CEO/Admin frei. Alle bisherigen Regeln bleiben erhalten.
drop policy if exists auslagen_objects_select on storage.objects;
create policy auslagen_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'auslagen'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (select 1 from public.receipts r where r.file_path = storage.objects.name)
      or exists (select 1 from public.card_statements s where s.file_path = storage.objects.name)
      or (
        (select public.app_role()) in ('ceo', 'admin')
        and exists (
          select 1 from public.expense_claims c
          where c.pdf_path = storage.objects.name and c.status = 'versendet'
        )
      )
    )
  );

notify pgrst, 'reload schema';
