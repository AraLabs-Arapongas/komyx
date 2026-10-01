-- Platform admin (Festeja staff) and organization lifecycle
create type public.org_status as enum ('active', 'suspended');

alter table public.organizations
  add column status public.org_status not null default 'active',
  add column notes text; -- internal notes by Festeja staff

alter table public.profiles add column is_platform_admin boolean not null default false;

-- Only the service role (admin panel) may grant/revoke platform admin.
create or replace function app.protect_platform_admin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_platform_admin is distinct from old.is_platform_admin
     and coalesce(current_setting('request.jwt.claim.role', true), '') in ('authenticated', 'anon') then
    raise exception 'Permissão de administrador só pode ser alterada pelo Festeja.' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger profiles_protect_platform_admin
  before update of is_platform_admin on public.profiles
  for each row execute function app.protect_platform_admin();

-- Status/plan are managed by Festeja, not by the buffet owner.
create or replace function app.protect_org_admin_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.status is distinct from old.status or new.plan is distinct from old.plan or new.notes is distinct from old.notes)
     and coalesce(current_setting('request.jwt.claim.role', true), '') in ('authenticated', 'anon') then
    raise exception 'Plano e status são gerenciados pelo Festeja.' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger organizations_protect_admin_fields
  before update of status, plan, notes on public.organizations
  for each row execute function app.protect_org_admin_fields();

-- Platform metrics view for the admin panel (service role only)
create view public.admin_org_stats
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
from public.organizations o;
revoke all on public.admin_org_stats from public, anon, authenticated;
grant select on public.admin_org_stats to service_role;
