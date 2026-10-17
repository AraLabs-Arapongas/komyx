-- A double tap (slow network, impatient click) must not record the same money twice. The same amount
-- with the same note on the same party within 30 seconds is refused, from the web and the app alike.
-- The nightly demo reset inserts its seed payments freely.
create or replace function app.payments_no_double_submit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.demo_reset', true), '') = 'on' then return new; end if;
  if exists (
    select 1 from public.payments p
    where p.event_id = new.event_id and p.amount = new.amount
      and coalesce(p.notes, '') = coalesce(new.notes, '')
      and p.created_at > now() - interval '30 seconds'
  ) then
    raise exception 'Esse pagamento acabou de ser registrado.' using errcode = 'P0001', hint = 'DUPLICATE_PAYMENT';
  end if;
  return new;
end;
$$;
create trigger payments_no_double_submit before insert on public.payments for each row execute function app.payments_no_double_submit();
