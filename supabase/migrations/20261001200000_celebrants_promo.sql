-- Birthday reminders: hide one reminder without deleting the celebrant; customers can opt out of promos.
alter table public.celebrants add column if not exists promo_muted_until date;
alter table public.customers add column if not exists marketing_opt_in boolean not null default true;
