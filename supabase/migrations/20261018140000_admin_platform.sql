-- Platform admin, part 1: message log, editable e-mail templates, admin audit trail, announcements
-- to buffets, manual invoices, and two read-only helpers (cron status, funnel). Everything here is for
-- /admin and is read and written by the service role after requireAdmin(), except what owners must see
-- (their invoices, active announcements, their own dismissals).

-- Every e-mail and SMS the platform sends (or fails to): /admin/saude and the resend button.
create table public.message_log (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('email', 'sms')),
  -- notification | password_reset | sms_otp | announcement | resend | test
  kind text not null,
  organization_id uuid references public.organizations(id) on delete set null,
  notification_id uuid references public.notifications(id) on delete set null,
  -- E-mail address, or the phone masked as (43) *****-5445.
  to_address text not null,
  subject text,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  error text,
  created_at timestamptz not null default now()
);
create index message_log_created_idx on public.message_log (created_at desc);
create index message_log_failed_idx on public.message_log (created_at desc) where status = 'failed';
alter table public.message_log enable row level security;
revoke all on public.message_log from anon, authenticated;
grant select, insert, update, delete on public.message_log to service_role;

-- E-mail copy the admin can edit. Placeholders: {{buffet}}, {{quem}}, {{detalhes}}, {{link}}.
create table public.email_templates (
  key text primary key,
  name text not null,
  description text,
  subject text not null,
  title text not null,
  intro text not null,
  button text not null,
  outro text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
alter table public.email_templates enable row level security;
revoke all on public.email_templates from anon, authenticated;
grant select, insert, update, delete on public.email_templates to service_role;

insert into public.email_templates (key, name, description, subject, title, intro, button, outro) values
  ('request', 'Novo pedido de orçamento', 'Para a equipe do buffet quando chega um pedido pela página pública.',
   'Novo pedido de orçamento · {{buffet}}', 'Novo pedido de orçamento', '{{quem}} · {{detalhes}}.', 'Ver pedido',
   'Você recebe este aviso por fazer parte da equipe do {{buffet}}. Para não receber mais, desligue em Minha conta.'),
  ('reservation', 'Nova reserva online', 'Para a equipe quando um cliente reserva a data e vai pagar o sinal por Pix.',
   'Nova reserva online · {{buffet}}', 'Nova reserva online', '{{quem}} · {{detalhes}}.', 'Ver reserva',
   'Você recebe este aviso por fazer parte da equipe do {{buffet}}. Para não receber mais, desligue em Minha conta.'),
  ('contract_accepted', 'Contrato aceito', 'Para a equipe quando o cliente aceita o contrato pelo link.',
   'Contrato aceito · {{buffet}}', 'Contrato aceito', '{{quem}} · {{detalhes}}.', 'Ver contrato',
   'Você recebe este aviso por fazer parte da equipe do {{buffet}}. Para não receber mais, desligue em Minha conta.'),
  ('client_request', 'Pedido do cliente', 'Para a equipe quando o cliente pede uma mudança ou avisa um pagamento.',
   'Novo pedido do cliente · {{buffet}}', 'Novo pedido do cliente', '{{quem}} · {{detalhes}}.', 'Ver festa',
   'Você recebe este aviso por fazer parte da equipe do {{buffet}}. Para não receber mais, desligue em Minha conta.'),
  ('other', 'Outros avisos', 'Qualquer outro aviso para a equipe.',
   'Novo aviso · {{buffet}}', 'Novo aviso', '{{quem}} · {{detalhes}}.', 'Abrir no Komyx',
   'Você recebe este aviso por fazer parte da equipe do {{buffet}}. Para não receber mais, desligue em Minha conta.'),
  ('password_reset', 'Redefinir senha', 'Quando alguém pede "Esqueci minha senha" (ou o admin reenvia).',
   'Redefinir sua senha · Komyx', 'Redefinir sua senha',
   'Recebemos um pedido para criar uma nova senha da sua conta no Komyx. Toque no botão para escolher a nova senha.',
   'Criar nova senha', 'O link vale por 1 hora. Se não foi você que pediu, ignore este e-mail: sua senha continua a mesma.'),
  ('announcement', 'Aviso da Komyx', 'Avisos da plataforma enviados por e-mail aos donos dos buffets. {{quem}} é o título do aviso e {{detalhes}} o texto.',
   '{{quem}} · Komyx', '{{quem}}', '{{detalhes}}', 'Abrir o Komyx',
   'Você recebe este e-mail por ser responsável pelo {{buffet}} no Komyx.');

-- What platform admins did, for the record.
create table public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  admin_email text,
  -- e.g. org.update, org.suspend, org.plan, org.view_as, user.password_reset, template.update,
  -- announcement.create, invoice.create, invoice.paid, message.resend
  action text not null,
  organization_id uuid references public.organizations(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_created_idx on public.admin_audit (created_at desc);
create index admin_audit_org_idx on public.admin_audit (organization_id, created_at desc);
alter table public.admin_audit enable row level security;
revoke all on public.admin_audit from anon, authenticated;
grant select, insert on public.admin_audit to service_role;

-- Announcements from Komyx to the buffets: a banner in the owner app (and optionally an e-mail).
create table public.platform_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  body text not null default '',
  tone text not null default 'info' check (tone in ('info', 'success', 'warning')),
  audience text not null default 'all' check (audience in ('all', 'basic', 'premium')),
  link_url text,
  link_label text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  emailed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.platform_announcements enable row level security;
revoke all on public.platform_announcements from anon, authenticated;
grant select on public.platform_announcements to authenticated;
grant select, insert, update, delete on public.platform_announcements to service_role;
-- Signed-in members see the announcements that are live and meant for their buffet's plan.
create policy "members read live announcements" on public.platform_announcements for select to authenticated
  using (
    starts_at <= now() and (ends_at is null or ends_at > now())
    and (audience = 'all' or audience = (select o.plan::text from public.organizations o where o.id = (select app.current_org_id())))
  );

create table public.announcement_dismissals (
  announcement_id uuid not null references public.platform_announcements(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (announcement_id, profile_id)
);
alter table public.announcement_dismissals enable row level security;
revoke all on public.announcement_dismissals from anon, authenticated;
grant select, insert, delete on public.announcement_dismissals to authenticated;
grant select, insert, update, delete on public.announcement_dismissals to service_role;
create policy "own dismissals" on public.announcement_dismissals for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

-- Manual invoices until a payment provider is chosen. The owner sees their own in Minha conta.
alter table public.organization_billing add column if not exists monthly_price numeric(12,2);
create table public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  amount numeric(12,2) not null check (amount >= 0),
  due_at date not null,
  status text not null default 'open' check (status in ('open', 'paid', 'void')),
  paid_at date,
  method text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (period_end >= period_start)
);
create index billing_invoices_org_idx on public.billing_invoices (organization_id, due_at desc);
alter table public.billing_invoices enable row level security;
revoke all on public.billing_invoices from anon, authenticated;
grant select on public.billing_invoices to authenticated;
grant select, insert, update, delete on public.billing_invoices to service_role;
create policy "owner reads own invoices" on public.billing_invoices for select to authenticated
  using (organization_id = (select app.current_org_id()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'owner'));

-- Last runs of the scheduled jobs (pg_cron lives in its own schema, not exposed by the API).
create or replace function public.admin_cron_status()
returns table (jobname text, schedule text, active boolean, last_start timestamptz, last_end timestamptz, last_status text, last_message text, failures_7d bigint)
language sql
security definer
set search_path = ''
as $$
  select j.jobname::text, j.schedule::text, j.active,
    r.start_time, r.end_time, r.status::text, left(r.return_message, 500),
    (select count(*) from cron.job_run_details f where f.jobid = j.jobid and f.status = 'failed' and f.start_time > now() - interval '7 days')
  from cron.job j
  left join lateral (select * from cron.job_run_details d where d.jobid = j.jobid order by d.start_time desc limit 1) r on true
  order by j.jobname;
$$;
revoke all on function public.admin_cron_status() from public, anon, authenticated;
grant execute on function public.admin_cron_status() to service_role;

-- One row per real buffet (no demos, no platform org) with its activation milestones and sales funnel.
create or replace function public.admin_funnel()
returns table (
  organization_id uuid, name text, slug text, plan text, status text, created_at timestamptz,
  first_package_at timestamptz, public_page boolean, first_request_at timestamptz,
  first_confirmed_at timestamptz, last_activity_at timestamptz,
  requests bigint, quotes bigint, confirmed bigint, events bigint
)
language sql
security definer
set search_path = ''
as $$
  select o.id, o.name, o.slug, o.plan::text, o.status::text, o.created_at,
    (select min(p.created_at) from public.packages p where p.organization_id = o.id),
    o.public_page,
    (select min(r.created_at) from public.public_requests r where r.organization_id = o.id),
    (select min(e.updated_at) from public.events e where e.organization_id = o.id and e.status in ('CONFIRMED', 'DONE')),
    greatest(
      (select max(e.updated_at) from public.events e where e.organization_id = o.id),
      (select max(r.created_at) from public.public_requests r where r.organization_id = o.id),
      (select max(pay.created_at) from public.payments pay where pay.organization_id = o.id)
    ),
    (select count(*) from public.public_requests r where r.organization_id = o.id),
    (select count(*) from public.quotes q where q.organization_id = o.id),
    (select count(*) from public.events e where e.organization_id = o.id and e.status in ('CONFIRMED', 'DONE')),
    (select count(*) from public.events e where e.organization_id = o.id)
  from public.organizations o
  where o.kind <> 'platform' and not o.is_demo
  order by o.created_at desc;
$$;
revoke all on function public.admin_funnel() from public, anon, authenticated;
grant execute on function public.admin_funnel() to service_role;
