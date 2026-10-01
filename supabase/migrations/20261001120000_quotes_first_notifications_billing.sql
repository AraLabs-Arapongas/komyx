-- ============================================================
-- Quote-first events, in-app notifications, billing cycle
-- ============================================================

-- 1) Everything starts as a quote. QUOTE does not block the agenda.
alter type public.event_status add value if not exists 'QUOTE' before 'PRE_RESERVED';

-- 2) Billing cycle shown to the owner (managed by Festeja admin)
alter table public.organizations
  add column billing_cycle_start date,
  add column billing_due_at date,
  add column billing_status text not null default 'ok' check (billing_status in ('ok', 'due', 'overdue', 'trial'));

-- 3) Notifications (per organization)
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type text not null,              -- request | reservation | contract_accepted | guest | quote
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_org_unread_idx on public.notifications(organization_id, read_at, created_at desc);

alter table public.notifications enable row level security;
create policy "org members select notifications" on public.notifications for select to authenticated using (organization_id = (select app.current_org_id()));
create policy "org members update notifications" on public.notifications for update to authenticated using (organization_id = (select app.current_org_id())) with check (organization_id = (select app.current_org_id()));
create policy "org members delete notifications" on public.notifications for delete to authenticated using (organization_id = (select app.current_org_id()));
grant select, update, delete, insert on public.notifications to authenticated, service_role;
revoke all on public.notifications from anon;

-- Triggers that create notifications
create or replace function app.notify_public_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (organization_id, type, title, body, href)
  values (
    new.organization_id,
    'request',
    'Novo pedido de orçamento: ' || new.name,
    coalesce(
      case when new.desired_date is not null then 'Festa em ' || to_char(new.desired_date, 'DD/MM/YYYY') else null end, 'Sem data definida'
    ) || case when new.estimated_total is not null then ' · estimativa R$ ' || to_char(new.estimated_total, 'FM999G999G990D00') else '' end
      || case when new.source is not null then ' · via ' || new.source else '' end,
    '/solicitacoes'
  );
  return null;
end;
$$;
create trigger public_requests_notify after insert on public.public_requests for each row execute function app.notify_public_request();

create or replace function app.notify_event_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_customer text;
begin
  if new.origin = 'SELF_SERVICE' then
    select name into v_customer from public.customers where id = new.customer_id;
    insert into public.notifications (organization_id, type, title, body, href)
    values (new.organization_id, 'reservation',
      'Reserva online: ' || coalesce(new.title, 'festa de ' || coalesce(v_customer, 'cliente')),
      'Data ' || to_char(new.starts_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') || ' · aguardando sinal' || case when new.pix_txid is not null then ' · código ' || new.pix_txid else '' end,
      '/eventos/' || new.id);
  end if;
  return null;
end;
$$;
create trigger events_notify_insert after insert on public.events for each row execute function app.notify_event_insert();

create or replace function app.notify_contract_accepted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'ACCEPTED' and old.status is distinct from 'ACCEPTED' then
    insert into public.notifications (organization_id, type, title, body, href)
    values (new.organization_id, 'contract_accepted', 'Contrato nº ' || new.number || ' aceito', 'Por ' || coalesce(new.accepted_name, 'cliente'), '/eventos/' || new.event_id || '/contrato?c=' || new.id);
  end if;
  return null;
end;
$$;
create trigger contracts_notify_accepted after update of status on public.contracts for each row execute function app.notify_contract_accepted();

create or replace function app.notify_guest_public()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_title text;
begin
  if new.source = 'PUBLIC' then
    select coalesce(e.title, 'festa') into v_title from public.events e where e.id = new.event_id;
    insert into public.notifications (organization_id, type, title, body, href)
    values (new.organization_id, 'guest', new.name || ' confirmou presença', new.adults || ' adulto(s) e ' || new.children || ' criança(s) · ' || v_title, '/eventos/' || new.event_id);
  end if;
  return null;
end;
$$;
create trigger guests_notify_public after insert on public.guests for each row execute function app.notify_guest_public();

-- Unread count helper for the bell (cheap, RLS-scoped)
create or replace function public.unread_notifications_count()
returns int
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::int from public.notifications where read_at is null and organization_id = (select app.current_org_id())
$$;
grant execute on function public.unread_notifications_count() to authenticated;
revoke all on function public.unread_notifications_count() from anon;
