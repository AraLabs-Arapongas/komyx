-- Buffets with an open invoice past its due date become 'overdue' every morning, even if no admin
-- opens /admin/cobranca (the page does the same flip on load).
create or replace function app.flag_overdue_billing()
returns integer
language sql
security definer
set search_path = ''
as $$
  with flipped as (
    update public.organization_billing b set status = 'overdue', updated_at = now()
    where b.status <> 'overdue'
      and exists (select 1 from public.billing_invoices i where i.organization_id = b.organization_id and i.status = 'open' and i.due_at < current_date)
    returning 1
  )
  select count(*)::int from flipped;
$$;

do $$
begin
  perform cron.unschedule('flag-overdue-billing') where exists (select 1 from cron.job where jobname = 'flag-overdue-billing');
  perform cron.schedule('flag-overdue-billing', '0 9 * * *', $c$select app.flag_overdue_billing()$c$);
end $$;
