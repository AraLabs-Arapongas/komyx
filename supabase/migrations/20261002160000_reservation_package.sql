-- The client panel needs the contracted package (included people and extra-person prices) to
-- show how many guests are covered, how many are left and what going over costs.
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
    'package', (select jsonb_build_object('name', p.name, 'included_adults', p.included_adults, 'included_children', p.included_children, 'extra_adult_price', p.extra_adult_price, 'extra_child_price', p.extra_child_price) from public.packages p where p.id = e.package_id),
    'quote', (
      select jsonb_build_object(
        'id', q.id, 'status', q.status, 'total', q.total, 'decided_at', q.decided_at, 'adults', q.adults, 'children', q.children,
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
