-- Server-side customer search + paging for the Clientes table. Matches name (accent/case-insensitive,
-- partial) or WhatsApp digits (ignores spaces, dashes, parentheses). Returns one page plus the total.
create extension if not exists unaccent with schema extensions;

create or replace function app.fold(p text)
returns text
language sql
immutable
set search_path = ''
as $$ select lower(extensions.unaccent(coalesce(p, ''))) $$;

create or replace function public.search_customers(
  p_q text default '',
  p_page int default 1,
  p_size int default 25,
  p_sort text default 'name',
  p_dir text default 'asc'
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_org uuid := app.current_org_id();
  v_q text := coalesce(trim(p_q), '');
  v_digits text := regexp_replace(v_q, '\D', '', 'g');
  v_size int := greatest(1, least(coalesce(p_size, 25), 100));
  v_page int := greatest(1, coalesce(p_page, 1));
  v_total int;
  v_rows jsonb;
begin
  with base as (
    select c.id, c.name, c.whatsapp, c.email, c.source, c.created_at,
      (select count(*) from public.events e where e.customer_id = c.id and e.status <> 'CANCELLED') as events_count,
      (select jsonb_build_object('id', e.id, 'title', e.title, 'starts_at', e.starts_at, 'status', e.status, 'future', true)
         from public.events e where e.customer_id = c.id and e.status in ('QUOTE','PRE_RESERVED','CONFIRMED') and e.ends_at >= now()
         order by e.starts_at asc limit 1) as next_event,
      (select jsonb_build_object('id', e.id, 'title', e.title, 'starts_at', e.starts_at, 'status', e.status, 'future', false)
         from public.events e where e.customer_id = c.id and e.status <> 'CANCELLED' and e.ends_at < now()
         order by e.starts_at desc limit 1) as last_event
    from public.customers c
    where c.organization_id = v_org
      and (
        v_q = ''
        or app.fold(c.name) like '%' || app.fold(v_q) || '%'
        or (length(v_digits) >= 3 and c.whatsapp like '%' || v_digits || '%')
      )
  ), ranked as (
    select b.*, coalesce(b.next_event, b.last_event) as ref_event from base b
  ), ordered as (
    select r.*, row_number() over (order by
      case when p_sort = 'name' and p_dir = 'asc' then app.fold(r.name) end asc,
      case when p_sort = 'name' and p_dir = 'desc' then app.fold(r.name) end desc,
      case when p_sort = 'whatsapp' and p_dir = 'asc' then r.whatsapp end asc,
      case when p_sort = 'whatsapp' and p_dir = 'desc' then r.whatsapp end desc,
      case when p_sort = 'event' and p_dir = 'asc' then (r.ref_event ->> 'starts_at') end asc nulls last,
      case when p_sort = 'event' and p_dir = 'desc' then (r.ref_event ->> 'starts_at') end desc nulls last,
      case when p_sort = 'events' and p_dir = 'asc' then r.events_count end asc,
      case when p_sort = 'events' and p_dir = 'desc' then r.events_count end desc,
      app.fold(r.name) asc) as rn
    from ranked r
  )
  select (select count(*) from ordered),
         (select coalesce(jsonb_agg(to_jsonb(o) - 'rn' order by o.rn), '[]'::jsonb)
            from ordered o where o.rn > (v_page - 1) * v_size and o.rn <= v_page * v_size)
  into v_total, v_rows;

  return jsonb_build_object('total', v_total, 'page', v_page, 'size', v_size, 'rows', v_rows);
end;
$$;
revoke all on function public.search_customers(text, int, int, text, text) from public, anon;
grant execute on function public.search_customers(text, int, int, text, text) to authenticated, service_role;
grant execute on function app.fold(text) to authenticated, service_role;

-- Fast prefix/substring search on folded names and on phone digits for large customer bases.
create index if not exists customers_name_fold_idx on public.customers (app.fold(name));
create index if not exists customers_whatsapp_idx on public.customers (whatsapp);
