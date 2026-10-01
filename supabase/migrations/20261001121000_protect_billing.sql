-- Billing cycle is managed by Festeja
create or replace function app.protect_org_admin_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.status is distinct from old.status or new.plan is distinct from old.plan or new.notes is distinct from old.notes
      or new.billing_cycle_start is distinct from old.billing_cycle_start or new.billing_due_at is distinct from old.billing_due_at
      or new.billing_status is distinct from old.billing_status)
     and coalesce(current_setting('request.jwt.claim.role', true), '') in ('authenticated', 'anon') then
    raise exception 'Plano, status e cobrança são gerenciados pelo Festeja.' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists organizations_protect_admin_fields on public.organizations;
create trigger organizations_protect_admin_fields
  before update of status, plan, notes, billing_cycle_start, billing_due_at, billing_status on public.organizations
  for each row execute function app.protect_org_admin_fields();
