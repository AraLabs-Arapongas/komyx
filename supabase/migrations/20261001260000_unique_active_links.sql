-- One active public link per (event, type). Older duplicates stay valid but inactive ones are deactivated.
with ranked as (
  select id, row_number() over (partition by event_id, type order by created_at asc) as rn
  from public.public_links where active
)
update public.public_links l set active = false from ranked r where l.id = r.id and r.rn > 1;

create unique index if not exists public_links_one_active_per_type on public.public_links(event_id, type) where active;
