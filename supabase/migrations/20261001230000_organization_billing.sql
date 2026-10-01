-- Billing cycle leaves the organizations row (readable by every team member) for a table only the owner can read.
create table if not exists public.organization_billing (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  cycle_start date,
  due_at date,
  status text not null default 'ok' check (status in ('ok', 'due', 'overdue', 'trial')),
  updated_at timestamptz not null default now()
);

insert into public.organization_billing (organization_id, cycle_start, due_at, status)
select id, billing_cycle_start, billing_due_at, coalesce(billing_status, 'ok') from public.organizations
on conflict (organization_id) do nothing;

alter table public.organization_billing enable row level security;
create policy "owner reads billing" on public.organization_billing for select to authenticated
  using (organization_id = app.current_org_id() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));
grant select on public.organization_billing to authenticated;
grant all on public.organization_billing to service_role;

-- Protection trigger no longer mentions the removed columns.
drop trigger if exists organizations_protect_admin_fields on public.organizations;
create or replace function app.protect_org_admin_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.status is distinct from old.status or new.plan is distinct from old.plan or new.notes is distinct from old.notes)
     and coalesce(current_setting('request.jwt.claim.role', true), '') in ('authenticated', 'anon') then
    raise exception 'Plano, status e cobrança são gerenciados pelo Festeja.' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger organizations_protect_admin_fields
  before update of status, plan, notes on public.organizations
  for each row execute function app.protect_org_admin_fields();

alter table public.organizations
  drop column if exists billing_cycle_start,
  drop column if exists billing_due_at,
  drop column if exists billing_status;
