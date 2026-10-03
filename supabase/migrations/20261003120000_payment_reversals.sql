-- Reversing a payment ("estorno") instead of deleting it.
-- The payment leaves public.payments (so every balance, instalment and report keeps summing the
-- same table) and a copy goes to public.payment_reversals with who reversed it, when and why.
-- Optionally the party goes back to pre-reservation when that payment was what confirmed it.

create table if not exists public.payment_reversals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  payment_id uuid not null,
  amount numeric(12,2) not null,
  paid_at date not null,
  method public.payment_method not null,
  notes text,
  paid_created_by uuid references auth.users(id) on delete set null,
  paid_created_at timestamptz not null,
  reason text,
  reopened boolean not null default false,
  reversed_by uuid references auth.users(id) on delete set null,
  reversed_at timestamptz not null default now()
);
create index if not exists payment_reversals_event_idx on public.payment_reversals(event_id);

alter table public.payment_reversals enable row level security;
drop policy if exists "org members read reversals" on public.payment_reversals;
create policy "org members read reversals" on public.payment_reversals for select to authenticated
  using (organization_id = (select app.current_org_id()));
grant select on public.payment_reversals to authenticated;

/**
 * Reverses one payment of the caller's organization. With p_reopen the event returns to
 * PRE_RESERVED with a fresh expiry, the latest quote back to SENT and a contract the client had
 * not accepted yet back to DRAFT (hidden from the client again).
 */
create or replace function public.reverse_payment(p_payment_id uuid, p_reason text default null, p_reopen boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := app.current_org_id();
  v_pay public.payments%rowtype;
  v_hours int;
  v_remaining numeric;
begin
  if v_org is null then raise exception 'Faça login de novo.'; end if;
  select * into v_pay from public.payments where id = p_payment_id and organization_id = v_org for update;
  if not found then raise exception 'Pagamento não encontrado.'; end if;

  insert into public.payment_reversals (organization_id, event_id, payment_id, amount, paid_at, method, notes, paid_created_by, paid_created_at, reason, reopened, reversed_by)
  values (v_pay.organization_id, v_pay.event_id, v_pay.id, v_pay.amount, v_pay.paid_at, v_pay.method, v_pay.notes, v_pay.created_by, v_pay.created_at, nullif(trim(coalesce(p_reason, '')), ''), coalesce(p_reopen, false), auth.uid());
  delete from public.payments where id = v_pay.id;

  if p_reopen then
    select pre_reservation_validity_hours into v_hours from public.organizations where id = v_org;
    update public.events set status = 'PRE_RESERVED', expires_at = now() + make_interval(hours => coalesce(v_hours, 48))
      where id = v_pay.event_id and status = 'CONFIRMED';
    update public.quotes set status = 'SENT', decided_at = null
      where id = (select q.id from public.quotes q where q.event_id = v_pay.event_id order by q.created_at desc limit 1) and status = 'ACCEPTED';
    update public.contracts set status = 'DRAFT', sent_at = null where event_id = v_pay.event_id and status = 'SENT';
  end if;

  select coalesce(sum(amount), 0) into v_remaining from public.payments where event_id = v_pay.event_id;
  return jsonb_build_object('event_id', v_pay.event_id, 'amount', v_pay.amount, 'remaining_paid', v_remaining, 'reopened', coalesce(p_reopen, false));
end;
$$;
revoke all on function public.reverse_payment(uuid, text, boolean) from public;
grant execute on function public.reverse_payment(uuid, text, boolean) to authenticated;
