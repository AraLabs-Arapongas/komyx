-- Client party panel (app "Minha festa"): the party owner sees everything about the party and
-- acts on what is theirs (guest list, asks to the buffet). Everything is keyed by the active
-- RESERVATION link token; changes that affect price go through change requests the buffet confirms.

alter type public.guest_source add value if not exists 'CLIENT';

-- Requests from the client that need the buffet's confirmation (extra items, more people, "I paid").
create table if not exists public.event_change_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  kind text not null check (kind in ('EXTRA', 'PEOPLE', 'PAYMENT_NOTICE', 'OTHER')),
  message text,
  payload jsonb,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id)
);
create index if not exists event_change_requests_event_idx on public.event_change_requests(event_id, status);
alter table public.event_change_requests enable row level security;
drop policy if exists "org members read change requests" on public.event_change_requests;
create policy "org members read change requests" on public.event_change_requests for select to authenticated using (organization_id = app.current_org_id());
drop policy if exists "org members decide change requests" on public.event_change_requests;
create policy "org members decide change requests" on public.event_change_requests for update to authenticated using (organization_id = app.current_org_id()) with check (organization_id = app.current_org_id());
grant select, update on public.event_change_requests to authenticated, service_role;

-- The buffet gets a notification for every request.
create or replace function app.notify_change_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_customer text;
begin
  select coalesce(e.title, 'festa de ' || c.name), c.name into v_title, v_customer
  from public.events e join public.customers c on c.id = e.customer_id where e.id = new.event_id;
  insert into public.notifications (organization_id, type, title, body, href)
  values (
    new.organization_id, 'client_request',
    case new.kind when 'EXTRA' then 'Pedido de extra' when 'PEOPLE' then 'Mudança de pessoas' when 'PAYMENT_NOTICE' then 'Cliente avisou pagamento' else 'Pedido do cliente' end || ' · ' || v_title,
    coalesce(new.message, '') || case when new.payload ? 'description' then ' · ' || (new.payload ->> 'description') else '' end,
    '/eventos/' || new.event_id
  );
  return null;
end;
$$;
drop trigger if exists event_change_requests_notify on public.event_change_requests;
create trigger event_change_requests_notify after insert on public.event_change_requests for each row execute function app.notify_change_request();

-- Resolve an active RESERVATION token to its event.
create or replace function app.reservation_event(p_token text)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select event_id from public.public_links where token = p_token and type = 'RESERVATION' and active and (expires_at is null or expires_at > now()) limit 1
$$;

-- Richer payload: extras, invite token, guests with ids, pending requests and the addon catalog.
create or replace function public.reservation_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_result jsonb;
begin
  if p_token is null or length(p_token) < 20 then return null; end if;
  v_event_id := app.reservation_event(p_token);
  if v_event_id is null then return null; end if;

  select jsonb_build_object(
    'event', jsonb_build_object(
      'id', e.id, 'title', e.title, 'starts_at', e.starts_at, 'ends_at', e.ends_at, 'status', e.status,
      'expires_at', e.expires_at, 'adults', e.adults, 'children', e.children, 'celebrant_name', e.celebrant_name, 'celebrant_age', e.celebrant_age,
      'pix_txid', e.pix_txid, 'invite_title', e.invite_title, 'invite_message', e.invite_message, 'invite_image_url', e.invite_image_url,
      'theme', (select t.name from public.party_themes t where t.id = e.theme_id),
      'customer', jsonb_build_object('name', c.name, 'whatsapp', c.whatsapp)
    ),
    'org', jsonb_build_object(
      'name', o.name, 'legal_name', o.legal_name, 'city', o.city, 'slug', o.slug, 'logo_url', o.logo_url,
      'whatsapp', o.whatsapp, 'pix_key', o.pix_key, 'address', o.address, 'show_prices_public', o.show_prices_public,
      'pre_reservation_validity_hours', o.pre_reservation_validity_hours
    ),
    'quote', (
      select jsonb_build_object(
        'id', q.id, 'status', q.status, 'total', q.total, 'decided_at', q.decided_at,
        'items', coalesce((select jsonb_agg(jsonb_build_object('description', i.description, 'quantity', i.quantity, 'unit_price', i.unit_price, 'total', i.total) order by i.sort_order) from public.quote_items i where i.quote_id = q.id), '[]'::jsonb),
        'installments', coalesce((select jsonb_agg(jsonb_build_object('label', s.label, 'percent', s.percent, 'amount', s.amount, 'rule', s.rule, 'days_before', s.days_before, 'due_date', s.due_date, 'sequence', s.sequence) order by s.sequence) from public.quote_installments s where s.quote_id = q.id), '[]'::jsonb)
      )
      from public.quotes q where q.event_id = e.id order by q.created_at desc limit 1
    ),
    'extras', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'description', x.description, 'quantity', x.quantity, 'unit_price', x.unit_price, 'total', x.total) order by x.created_at) from public.event_extras x where x.event_id = e.id), '[]'::jsonb),
    'contract', (select jsonb_build_object('number', k.number, 'status', k.status, 'token', k.token) from public.contracts k where k.event_id = e.id and k.status in ('SENT', 'ACCEPTED') order by k.created_at desc limit 1),
    'quote_token', (select l.token from public.public_links l where l.event_id = e.id and l.type = 'QUOTE' and l.active limit 1),
    'guest_token', (select l.token from public.public_links l where l.event_id = e.id and l.type = 'GUEST_CONFIRM' and l.active limit 1),
    'invite_token', (select l.token from public.public_links l where l.event_id = e.id and l.type = 'INVITE_EDIT' and l.active limit 1),
    'paid', coalesce((select sum(p.amount) from public.payments p where p.event_id = e.id), 0),
    'guests', coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'adults', g.adults, 'children', g.children, 'source', g.source, 'checked_in', g.checked_in_at is not null, 'notes', g.notes) order by g.created_at) from public.guests g where g.event_id = e.id), '[]'::jsonb),
    'requests', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'kind', r.kind, 'message', r.message, 'payload', r.payload, 'status', r.status, 'created_at', r.created_at) order by r.created_at desc) from (select * from public.event_change_requests r where r.event_id = e.id order by r.created_at desc limit 20) r), '[]'::jsonb),
    'addons', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'price', a.price, 'description', a.description) order by a.sort_order, a.name) from public.package_addons a where a.organization_id = e.organization_id and a.active), '[]'::jsonb)
  ) into v_result
  from public.events e
  join public.customers c on c.id = e.customer_id
  join public.organizations o on o.id = e.organization_id
  where e.id = v_event_id;
  return v_result;
end;
$$;
revoke all on function public.reservation_by_token(text) from public;
grant execute on function public.reservation_by_token(text) to anon, authenticated, service_role;

-- Guest list managed by the party owner.
create or replace function public.reservation_add_guest(p_token text, p_name text, p_adults int, p_children int)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid := app.reservation_event(p_token);
  v_org uuid;
  v_id uuid;
begin
  if v_event_id is null then raise exception 'Reserva não encontrada.'; end if;
  if coalesce(length(trim(p_name)), 0) < 2 then raise exception 'Informe o nome do convidado.'; end if;
  if coalesce(p_adults, 0) + coalesce(p_children, 0) <= 0 then raise exception 'Informe quantas pessoas.'; end if;
  select organization_id into v_org from public.events where id = v_event_id;
  insert into public.guests (organization_id, event_id, name, adults, children, source)
  values (v_org, v_event_id, trim(p_name), greatest(coalesce(p_adults, 0), 0), greatest(coalesce(p_children, 0), 0), 'CLIENT')
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.reservation_add_guest(text, text, int, int) from public;
grant execute on function public.reservation_add_guest(text, text, int, int) to anon, authenticated, service_role;

create or replace function public.reservation_remove_guest(p_token text, p_guest_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid := app.reservation_event(p_token);
  v_n int;
begin
  if v_event_id is null then raise exception 'Reserva não encontrada.'; end if;
  delete from public.guests where id = p_guest_id and event_id = v_event_id and checked_in_at is null;
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;
revoke all on function public.reservation_remove_guest(text, uuid) from public;
grant execute on function public.reservation_remove_guest(text, uuid) to anon, authenticated, service_role;

-- Anything that changes price or needs a human: the buffet confirms.
create or replace function public.reservation_request_change(p_token text, p_kind text, p_message text, p_payload jsonb default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid := app.reservation_event(p_token);
  v_org uuid;
  v_id uuid;
begin
  if v_event_id is null then raise exception 'Reserva não encontrada.'; end if;
  if p_kind not in ('EXTRA', 'PEOPLE', 'PAYMENT_NOTICE', 'OTHER') then raise exception 'Tipo inválido.'; end if;
  if (select count(*) from public.event_change_requests where event_id = v_event_id and status = 'PENDING') >= 10 then raise exception 'Você já tem pedidos demais aguardando o buffet.'; end if;
  select organization_id into v_org from public.events where id = v_event_id;
  insert into public.event_change_requests (organization_id, event_id, kind, message, payload)
  values (v_org, v_event_id, p_kind, nullif(trim(coalesce(p_message, '')), ''), p_payload)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.reservation_request_change(text, text, text, jsonb) from public;
grant execute on function public.reservation_request_change(text, text, text, jsonb) to anon, authenticated, service_role;
