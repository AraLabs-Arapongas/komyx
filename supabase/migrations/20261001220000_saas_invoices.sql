-- Festeja subscription invoices (the SaaS charging the buffet). Separate from party payments.
create table if not exists public.saas_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  due_at date not null,
  paid_at date,
  status text not null default 'open' check (status in ('open', 'paid', 'overdue', 'cancelled')),
  method text,
  receipt_url text,
  created_at timestamptz not null default now()
);
create index if not exists saas_invoices_org_due_idx on public.saas_invoices(organization_id, due_at desc);

alter table public.saas_invoices enable row level security;
-- Owners read their own invoices; only the platform (service role) writes.
create policy "owner reads saas invoices" on public.saas_invoices for select to authenticated
  using (organization_id = app.current_org_id() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));
grant select on public.saas_invoices to authenticated;
grant all on public.saas_invoices to service_role;
