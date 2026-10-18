-- Komyx monthly fees through Asaas: one Asaas customer + monthly subscription per buffet. Asaas creates
-- each month's charge (Pix, boleto or card) and sends reminders; its webhook mirrors the charges into
-- billing_invoices and settles them. Manual invoices keep working (provider 'manual').
alter table public.organization_billing
  add column if not exists provider_customer_id text,
  add column if not exists provider_subscription_id text,
  add column if not exists auto_billing boolean not null default false;

alter table public.billing_invoices
  add column if not exists provider text not null default 'manual' check (provider in ('manual', 'asaas')),
  add column if not exists external_id text,
  add column if not exists payment_url text;
create unique index if not exists billing_invoices_external_idx on public.billing_invoices (provider, external_id) where external_id is not null;

-- Every webhook call, for idempotency (Asaas retries) and for /admin/saude.
create table if not exists public.billing_webhook_events (
  id text primary key,
  provider text not null,
  event text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);
alter table public.billing_webhook_events enable row level security;
revoke all on public.billing_webhook_events from anon, authenticated;
grant select, insert, update, delete on public.billing_webhook_events to service_role;
