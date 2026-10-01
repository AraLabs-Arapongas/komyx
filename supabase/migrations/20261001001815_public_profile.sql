-- Public page content: tagline, highlights, gallery, testimonials
alter table public.organizations
  add column tagline text,
  add column highlights text[] not null default '{}',
  add column gallery jsonb not null default '[]'::jsonb,       -- [{url, caption}]
  add column testimonials jsonb not null default '[]'::jsonb,  -- [{name, text}]
  add column founded_year int check (founded_year is null or founded_year between 1950 and 2100),
  add column capacity int check (capacity is null or capacity > 0),
  -- Buffets normally host one event per day. Owner can override per event with a confirmation.
  add column one_event_per_day boolean not null default true;

-- Busy days for the public calendar (date keys in America/Sao_Paulo). Only dates leak, never event data.
create or replace function public.busy_days(p_slug text, p_from date, p_to date)
returns setof date
language sql
stable
security definer
set search_path = ''
as $$
  select distinct (e.starts_at at time zone 'America/Sao_Paulo')::date
  from public.events e
  join public.organizations o on o.id = e.organization_id
  where o.slug = p_slug
    and app.event_blocks_agenda(e.status, e.expires_at)
    and (e.starts_at at time zone 'America/Sao_Paulo')::date between p_from and p_to
  order by 1
$$;
revoke all on function public.busy_days(text, date, date) from public, anon;
grant execute on function public.busy_days(text, date, date) to authenticated, service_role;
