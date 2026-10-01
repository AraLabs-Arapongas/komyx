-- The Festeja team's own organization is the platform, not a buffet: it never shows the buffet app or admin lists.
alter table public.organizations add column if not exists kind text not null default 'buffet' check (kind in ('buffet', 'platform'));
update public.organizations set kind = 'platform' where slug = 'festeja';

create or replace view public.admin_org_stats
with (security_invoker = false) as
select
  o.id as organization_id,
  (select count(*) from public.profiles p where p.organization_id = o.id) as members,
  (select count(*) from public.events e where e.organization_id = o.id) as events_total,
  (select count(*) from public.events e where e.organization_id = o.id and e.created_at > now() - interval '30 days') as events_30d,
  (select count(*) from public.events e where e.organization_id = o.id and e.origin = 'SELF_SERVICE') as self_service_events,
  (select count(*) from public.public_requests r where r.organization_id = o.id) as requests_total,
  (select coalesce(sum(p.amount), 0) from public.payments p where p.organization_id = o.id) as payments_total,
  (select max(e.created_at) from public.events e where e.organization_id = o.id) as last_event_at
from public.organizations o
where o.kind = 'buffet';
