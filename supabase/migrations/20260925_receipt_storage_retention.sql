-- Original receipt files are retained for 30 days after an expense claim is
-- submitted or after they are linked to a card statement. Structured data remains.

alter table public.receipts
  add column if not exists storage_delete_after timestamptz,
  add column if not exists storage_purge_claimed_at timestamptz,
  add column if not exists file_deleted_at timestamptz;

create index if not exists receipts_storage_purge_due_idx
  on public.receipts (storage_delete_after)
  where file_deleted_at is null and storage_delete_after is not null;

create or replace function public.sync_receipt_storage_retention()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_receipt_id uuid;
  new_receipt_id uuid;
begin
  if tg_op <> 'INSERT' then old_receipt_id := old.receipt_id; end if;
  if tg_op <> 'DELETE' then new_receipt_id := new.receipt_id; end if;

  if new_receipt_id is not null and new_receipt_id is distinct from old_receipt_id then
    update public.receipts
       set storage_delete_after = now() + interval '30 days',
           storage_purge_claimed_at = null
     where id = new_receipt_id
       and file_deleted_at is null;
  end if;

  if old_receipt_id is not null and old_receipt_id is distinct from new_receipt_id then
    update public.receipts r
       set storage_delete_after = null,
           storage_purge_claimed_at = null
     where r.id = old_receipt_id
       and r.file_deleted_at is null
       and not exists (
         select 1 from public.card_transactions tx where tx.receipt_id = old_receipt_id
       );
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists sync_receipt_storage_retention on public.card_transactions;
create trigger sync_receipt_storage_retention
after insert or update of receipt_id or delete on public.card_transactions
for each row execute function public.sync_receipt_storage_retention();

create or replace function public.sync_claim_receipt_storage_retention()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'versendet' and old.status is distinct from new.status then
    update public.receipts
       set storage_delete_after = now() + interval '30 days',
           storage_purge_claimed_at = null
     where claim_id = new.id
       and file_deleted_at is null;
  elsif old.status = 'versendet' and new.status is distinct from old.status then
    update public.receipts r
       set storage_delete_after = null,
           storage_purge_claimed_at = null
     where r.claim_id = new.id
       and r.file_deleted_at is null
       and not exists (select 1 from public.card_transactions tx where tx.receipt_id = r.id);
  end if;
  return new;
end;
$$;

drop trigger if exists sync_claim_receipt_storage_retention on public.expense_claims;
create trigger sync_claim_receipt_storage_retention
after update of status on public.expense_claims
for each row execute function public.sync_claim_receipt_storage_retention();

-- Give already-linked originals a full 30 days from this rollout.
update public.receipts r
   set storage_delete_after = now() + interval '30 days',
       storage_purge_claimed_at = null
 where r.file_deleted_at is null
   and (
     exists (select 1 from public.card_transactions tx where tx.receipt_id = r.id)
     or exists (select 1 from public.expense_claims c where c.id = r.claim_id and c.status = 'versendet')
   );

create or replace function public.protect_receipt_storage_retention()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') and (
    new.storage_delete_after is distinct from old.storage_delete_after or
    new.storage_purge_claimed_at is distinct from old.storage_purge_claimed_at or
    new.file_deleted_at is distinct from old.file_deleted_at
  ) then
    raise exception 'receipt storage retention fields are managed by the server'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_receipt_storage_retention on public.receipts;
create trigger protect_receipt_storage_retention
before update on public.receipts
for each row execute function public.protect_receipt_storage_retention();

create or replace function public.claim_receipts_for_storage_purge(batch_size integer default 100)
returns table (id uuid, file_path text)
language sql
security definer
set search_path = public
as $$
  with candidates as (
    select r.id
      from public.receipts r
     where r.storage_delete_after <= now()
       and r.file_deleted_at is null
       and (r.storage_purge_claimed_at is null or r.storage_purge_claimed_at < now() - interval '15 minutes')
       and (
         exists (select 1 from public.card_transactions tx where tx.receipt_id = r.id)
         or exists (select 1 from public.expense_claims c where c.id = r.claim_id and c.status = 'versendet')
       )
     order by r.storage_delete_after, r.id
     for update skip locked
     limit least(greatest(coalesce(batch_size, 100), 1), 500)
  ), claimed as (
    update public.receipts r
       set storage_purge_claimed_at = now()
      from candidates c
     where r.id = c.id
    returning r.id, r.file_path
  )
  select claimed.id, claimed.file_path from claimed;
$$;

revoke all on function public.claim_receipts_for_storage_purge(integer) from public, anon, authenticated;
grant execute on function public.claim_receipts_for_storage_purge(integer) to service_role;
