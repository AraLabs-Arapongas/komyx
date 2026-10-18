-- Komyx subscription flow (docs/assinatura.md): plan choice (1, 3, 6 or 12 months) with changes on the
-- next renewal, late notices on days 1/5/9, "acesso pausado" on day 10, cancellation with refunds.
-- Everything here is written by the service role (server actions, Asaas webhook, daily job route).

-- Plan in force (months per charge) and the change scheduled for the next renewal.
alter table public.organization_billing
  add column if not exists billing_period smallint not null default 1 check (billing_period in (1, 3, 6, 12)),
  add column if not exists pending_period smallint check (pending_period in (1, 3, 6, 12)),
  -- First day of the new plan (= due_at when the change was made).
  add column if not exists pending_from date,
  -- Day 10 of a late payment: the owner app shows "Seu acesso está pausado". Not organizations.status
  -- (that is the admin's manual suspension). Cleared by the payment webhook.
  add column if not exists paused_at timestamptz,
  -- The admin turned auto billing off: saving Configurações › Empresa must not turn it back on.
  add column if not exists auto_billing_disabled_at timestamptz;

-- Months paid by each invoice (period_start → period_end).
alter table public.billing_invoices
  add column if not exists months smallint not null default 1 check (months in (1, 3, 6, 12));

-- Late notices already sent, one per late episode (overdue_since) and day (1, 5, 9; 10 = paused).
create table if not exists public.billing_notices (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  overdue_since date not null,
  day smallint not null check (day in (1, 5, 9, 10)),
  email_status text not null default 'sent' check (email_status in ('sent', 'failed', 'skipped')),
  created_at timestamptz not null default now(),
  primary key (organization_id, overdue_since, day)
);
alter table public.billing_notices enable row level security;
revoke all on public.billing_notices from anon, authenticated;
grant select, insert, update, delete on public.billing_notices to service_role;

-- Refunds on cancellation. Through Asaas when possible ('requested' → 'done' by the webhook);
-- otherwise the admin pays it by Pix from /admin/cobranca ('manual' → 'done').
create table if not exists public.billing_refunds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid references public.billing_invoices(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  -- full_7_days: whole payment back within 7 days; prorata: paid − months used × R$ 149.
  reason text not null check (reason in ('full_7_days', 'prorata')),
  status text not null default 'manual' check (status in ('requested', 'manual', 'done', 'cancelled')),
  method text check (method in ('asaas', 'pix')),
  error text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  done_at timestamptz,
  done_by uuid references public.profiles(id) on delete set null
);
create index if not exists billing_refunds_org_idx on public.billing_refunds (organization_id, created_at desc);
create index if not exists billing_refunds_open_idx on public.billing_refunds (created_at) where status in ('requested', 'manual');
alter table public.billing_refunds enable row level security;
revoke all on public.billing_refunds from anon, authenticated;
grant select on public.billing_refunds to authenticated;
grant select, insert, update, delete on public.billing_refunds to service_role;
create policy "owner reads own refunds" on public.billing_refunds for select to authenticated
  using (organization_id = (select app.current_org_id()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'owner'));

-- Editable copy for the late notices (Admin › E-mails). Same text as DEFAULT_TEMPLATES in template-copy.ts.
insert into public.email_templates (key, name, description, subject, title, intro, button, outro) values
  ('billing_overdue', 'Mensalidade vencida (dias 1 e 5)', 'Para o dono quando a mensalidade do Komyx venceu e não foi paga. {{vencimento}} é o vencimento e {{prazo}} o último dia antes de pausar.',
   'Sua mensalidade do Komyx venceu · {{buffet}}', 'Sua mensalidade venceu',
   'Sua mensalidade venceu em {{vencimento}}. Pague até {{prazo}} para não pausar o acesso do {{buffet}}.', 'Pagar agora',
   'Precisa de ajuda? Fale com a gente pelo WhatsApp {{whatsapp}} ou contato@komyx.com.br.'),
  ('billing_last_warning', 'Último aviso antes de pausar (dia 9)', 'Para o dono no 9º dia de atraso. {{vencimento}} é o vencimento.',
   'Amanhã seu acesso ao Komyx será pausado · {{buffet}}', 'Amanhã seu acesso será pausado',
   'A mensalidade que venceu em {{vencimento}} continua em aberto. Pague hoje para o {{buffet}} continuar usando o Komyx sem interrupção.', 'Pagar agora',
   'Precisa de ajuda? Fale com a gente pelo WhatsApp {{whatsapp}} ou contato@komyx.com.br.'),
  ('billing_paused', 'Acesso pausado (dia 10)', 'Para o dono quando o acesso é pausado por falta de pagamento. A página pública continua no ar.',
   'Seu acesso ao Komyx está pausado · {{buffet}}', 'Seu acesso está pausado',
   'A mensalidade que venceu em {{vencimento}} não foi paga e o acesso do {{buffet}} ao Komyx foi pausado. Sua página pública continua no ar recebendo pedidos. Assim que o pagamento for confirmado, tudo volta sozinho.', 'Pagar e voltar a usar',
   'Precisa de ajuda? Fale com a gente pelo WhatsApp {{whatsapp}} ou contato@komyx.com.br.')
on conflict (key) do nothing;

-- Daily billing job: pg_cron → pg_net → Next route /api/billing/asaas/daily (Asaas calls and e-mails
-- need the app). No new Vault secret: the URL is derived from notify_email_url (same host) and the
-- shared secret is notify_email_secret (NOTIFY_EMAIL_SECRET in the app). Locally both fall back to the
-- dev server, like app.email_notification().
create or replace function app.run_billing_daily()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'notify_email_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'notify_email_secret';
  v_url := coalesce(regexp_replace(v_url, '/api/.*$', ''), 'http://host.docker.internal:3000') || '/api/billing/asaas/daily';
  perform net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object('content-type', 'application/json', 'authorization', 'Bearer ' || coalesce(v_secret, 'komyx-local-notify-email-secret')),
    timeout_milliseconds := 60000
  );
end;
$$;
revoke all on function app.run_billing_daily() from public, anon, authenticated;

-- 11:00 UTC = 08:00 in Brasília: notices arrive in the morning, after flag-overdue-billing (09:00 UTC).
do $$
begin
  perform cron.unschedule('billing-daily') where exists (select 1 from cron.job where jobname = 'billing-daily');
  perform cron.schedule('billing-daily', '0 11 * * *', $c$select app.run_billing_daily()$c$);
end $$;
