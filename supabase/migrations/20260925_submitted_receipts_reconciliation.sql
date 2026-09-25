-- CEO/Admin dürfen Originalbelege aus tatsächlich eingereichten Anträgen
-- im Zahlungsabgleich sehen. Entwürfe bleiben nur für ihre Eigentümer sichtbar.
alter table public.receipts add column if not exists reconciliation_channel text;
alter table public.receipts drop constraint if exists receipts_reconciliation_channel_check;
alter table public.receipts add constraint receipts_reconciliation_channel_check
  check (reconciliation_channel in ('amex', 'bar', 'ec', 'kreditkarte', 'tank_raststaetten'));

drop policy if exists receipts_select on public.receipts;
create policy receipts_select on public.receipts
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (payment_method = 'kreditkarte' and (select public.app_role()) in ('ceo', 'admin'))
    or (
      (select public.app_role()) in ('ceo', 'admin')
      and exists (
        select 1 from public.expense_claims c
        where c.id = receipts.claim_id and c.user_id = receipts.user_id and c.status = 'versendet'
      )
    )
  );

-- Die Buchhaltung kann den Zahlungsweg eines eingereichten Privatbelegs
-- separat klassifizieren. Der vom Mitarbeiter bestätigte Beleg bleibt gleich.
create or replace function public.classify_submitted_receipt(target_id uuid, channel text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select public.app_role()) not in ('ceo', 'admin') then
    raise exception 'Nur CEO und Administratoren dürfen eingereichte Belege klassifizieren.' using errcode = '42501';
  end if;
  if channel not in ('amex', 'bar', 'ec', 'kreditkarte', 'tank_raststaetten') or channel is null then
    raise exception 'Ungültiger Zahlungsweg.' using errcode = '22023';
  end if;
  update public.receipts r
  set reconciliation_channel = channel
  where r.id = target_id and r.status = 'erfasst' and r.payment_method = 'privat'
    and exists (
      select 1 from public.expense_claims c
      where c.id = r.claim_id and c.user_id = r.user_id and c.status = 'versendet'
    );
  if not found then
    raise exception 'Eingereichter Beleg nicht gefunden.' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.classify_submitted_receipt(uuid, text) from public;
revoke execute on function public.classify_submitted_receipt(uuid, text) from anon;
grant execute on function public.classify_submitted_receipt(uuid, text) to authenticated;

create or replace function public.receipts_guard_reconciliation_channel()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') and (select public.app_role()) not in ('ceo', 'admin') then
    if tg_op = 'INSERT' then
      if new.reconciliation_channel is not null then
        raise exception 'Nur CEO und Administratoren dürfen den Buchhaltungs-Zahlungsweg setzen.' using errcode = '42501';
      end if;
    elsif new.reconciliation_channel is distinct from old.reconciliation_channel then
      raise exception 'Nur CEO und Administratoren dürfen den Buchhaltungs-Zahlungsweg setzen.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists receipts_guard_reconciliation_channel on public.receipts;
create trigger receipts_guard_reconciliation_channel
  before insert or update on public.receipts
  for each row execute function public.receipts_guard_reconciliation_channel();

notify pgrst, 'reload schema';
