-- Every new buffet starts with a free month: a billing row in 'trial' with due_at 30 days ahead.
-- The admin/support turns it into a paid cycle later. Platform orgs get no billing row.
create or replace function app.start_trial_billing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'buffet' then
    insert into public.organization_billing (organization_id, cycle_start, due_at, status)
    values (new.id, current_date, current_date + 30, 'trial')
    on conflict (organization_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists organizations_start_trial on public.organizations;
create trigger organizations_start_trial
  after insert on public.organizations
  for each row execute function app.start_trial_billing();

-- Buffets created before this migration without a billing row also get the free month from today.
insert into public.organization_billing (organization_id, cycle_start, due_at, status)
select o.id, current_date, current_date + 30, 'trial'
from public.organizations o
left join public.organization_billing b on b.organization_id = o.id
where b.organization_id is null and o.kind = 'buffet'
on conflict (organization_id) do nothing;
