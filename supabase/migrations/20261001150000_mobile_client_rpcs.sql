-- RPCs for the mobile app's client side (no login). All SECURITY DEFINER, exposing only what the
-- equivalent public web pages already show, keyed by the same tokens.

-- Find a reservation by WhatsApp + party date (any buffet, or a given slug). Returns the RESERVATION token.
create or replace function public.find_reservation(p_whatsapp text, p_date date, p_slug text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_digits text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
  v_event_id uuid;
  v_org_id uuid;
  v_token text;
begin
  if length(v_digits) < 10 then return null; end if;
  select e.id, e.organization_id into v_event_id, v_org_id
  from public.events e
  join public.customers c on c.id = e.customer_id
  join public.organizations o on o.id = e.organization_id
  where c.whatsapp = v_digits
    and (e.starts_at at time zone 'America/Sao_Paulo')::date = p_date
    and (p_slug is null or o.slug = p_slug)
    and e.status <> 'CANCELLED'
  order by e.created_at desc
  limit 1;
  if v_event_id is null then return null; end if;

  select token into v_token from public.public_links
  where event_id = v_event_id and type = 'RESERVATION' and active
  limit 1;
  if v_token is null then
    insert into public.public_links (organization_id, event_id, type) values (v_org_id, v_event_id, 'RESERVATION')
    returning token into v_token;
  end if;
  return v_token;
end;
$$;
revoke all on function public.find_reservation(text, date, text) from public;
grant execute on function public.find_reservation(text, date, text) to anon, authenticated, service_role;

-- Everything the client reservation screen needs, by RESERVATION token.
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
  select event_id into v_event_id from public.public_links
  where token = p_token and type = 'RESERVATION' and active limit 1;
  if v_event_id is null then return null; end if;

  select jsonb_build_object(
    'event', jsonb_build_object(
      'id', e.id, 'title', e.title, 'starts_at', e.starts_at, 'ends_at', e.ends_at, 'status', e.status,
      'expires_at', e.expires_at, 'adults', e.adults, 'children', e.children, 'celebrant_name', e.celebrant_name,
      'pix_txid', e.pix_txid, 'invite_title', e.invite_title, 'invite_message', e.invite_message, 'invite_image_url', e.invite_image_url,
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
    'contract', (select jsonb_build_object('number', k.number, 'status', k.status, 'token', k.token) from public.contracts k where k.event_id = e.id and k.status in ('SENT', 'ACCEPTED') order by k.created_at desc limit 1),
    'quote_token', (select l.token from public.public_links l where l.event_id = e.id and l.type = 'QUOTE' and l.active limit 1),
    'guest_token', (select l.token from public.public_links l where l.event_id = e.id and l.type = 'GUEST_CONFIRM' and l.active limit 1),
    'paid', coalesce((select sum(p.amount) from public.payments p where p.event_id = e.id), 0),
    'guests', coalesce((select jsonb_agg(jsonb_build_object('name', g.name, 'adults', g.adults, 'children', g.children) order by g.created_at) from public.guests g where g.event_id = e.id), '[]'::jsonb)
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

-- Invitation + RSVP by GUEST_CONFIRM token.
create or replace function public.guest_link(p_token text)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'event', jsonb_build_object('title', e.title, 'starts_at', e.starts_at, 'ends_at', e.ends_at, 'status', e.status,
      'celebrant_name', e.celebrant_name, 'celebrant_age', e.celebrant_age,
      'invite_title', e.invite_title, 'invite_message', e.invite_message, 'invite_image_url', e.invite_image_url,
      'customer_name', c.name),
    'org', jsonb_build_object('name', o.name, 'address', o.address, 'city', o.city, 'whatsapp', o.whatsapp, 'logo_url', o.logo_url),
    'expired', (l.expires_at is not null and l.expires_at < now())
  )
  from public.public_links l
  join public.events e on e.id = l.event_id
  join public.customers c on c.id = e.customer_id
  join public.organizations o on o.id = e.organization_id
  where l.token = p_token and l.type = 'GUEST_CONFIRM' and l.active
  limit 1
$$;
revoke all on function public.guest_link(text) from public;
grant execute on function public.guest_link(text) to anon, authenticated, service_role;

create or replace function public.confirm_guest(p_token text, p_name text, p_adults int, p_children int, p_notes text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link record;
begin
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Informe o nome.'; end if;
  if coalesce(p_adults, 0) < 0 or coalesce(p_children, 0) < 0 or coalesce(p_adults, 0) + coalesce(p_children, 0) = 0 then raise exception 'Informe quantas pessoas vão.'; end if;
  select l.organization_id, l.event_id, l.expires_at, e.status into v_link
  from public.public_links l join public.events e on e.id = l.event_id
  where l.token = p_token and l.type = 'GUEST_CONFIRM' and l.active limit 1;
  if v_link is null then raise exception 'Este link não está mais disponível.'; end if;
  if v_link.expires_at is not null and v_link.expires_at < now() then raise exception 'Este link expirou.'; end if;
  if v_link.status = 'CANCELLED' then raise exception 'Este evento foi cancelado.'; end if;
  insert into public.guests (organization_id, event_id, name, adults, children, notes, source)
  values (v_link.organization_id, v_link.event_id, trim(p_name), coalesce(p_adults, 0), coalesce(p_children, 0), nullif(trim(coalesce(p_notes, '')), ''), 'PUBLIC');
end;
$$;
revoke all on function public.confirm_guest(text, text, int, int, text) from public;
grant execute on function public.confirm_guest(text, text, int, int, text) to anon, authenticated, service_role;
