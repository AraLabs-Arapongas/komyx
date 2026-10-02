-- Soft cancellation: the owner cancels, keeps access until the end of the paid period, can reactivate any time;
-- data stays for 90 days after access ends (purge is a platform job, not automatic yet).
alter table public.organizations
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancel_reason text,
  add column if not exists access_until date;
