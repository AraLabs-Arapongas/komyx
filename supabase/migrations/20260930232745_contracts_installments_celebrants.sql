-- ============================================================
-- Contracts, payment plans (installments), celebrants (birthdays),
-- self-service quote requests
-- ============================================================

-- ------------------------------------------------------------
-- Organization: legal data, default payment plan, contract template
-- ------------------------------------------------------------
alter table public.organizations
  add column legal_name text,
  add column document text,               -- CNPJ/CPF
  add column city text,
  add column pix_key text,
  add column payment_plan jsonb not null default '[
    {"label": "Sinal na aceitação", "percent": 30, "rule": "ON_ACCEPT", "days_before": null},
    {"label": "Saldo", "percent": 70, "rule": "DAYS_BEFORE_EVENT", "days_before": 7}
  ]'::jsonb,
  add column contract_template text not null default $tpl$CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE BUFFET

CONTRATADA: {{buffet_razao}}, {{buffet_documento}}, com sede em {{buffet_endereco}}, WhatsApp {{buffet_whatsapp}}.

CONTRATANTE: {{cliente_nome}}, {{cliente_documento}}, WhatsApp {{cliente_whatsapp}}{{cliente_email}}.

1. OBJETO
A CONTRATADA prestará serviços de buffet para o evento "{{evento_titulo}}" no dia {{evento_data}}, das {{evento_inicio}} às {{evento_fim}}, para até {{evento_participantes}} participantes, conforme pacote {{pacote}}.

2. ITENS CONTRATADOS
{{itens}}

3. VALOR E FORMA DE PAGAMENTO
O valor total é de {{valor_total}}, a ser pago da seguinte forma:
{{plano_pagamento}}
{{pix}}

4. PARTICIPANTES EXCEDENTES
Participantes além do contratado serão cobrados conforme tabela vigente do pacote, apurados no dia do evento.

5. CANCELAMENTO E REMARCAÇÃO
Em caso de cancelamento pelo CONTRATANTE com mais de 30 dias de antecedência, será retido o sinal. Com menos de 30 dias, serão retidos 50% do valor total. Remarcações dependem de disponibilidade de agenda.

6. RESPONSABILIDADES
A CONTRATADA se responsabiliza pela qualidade dos alimentos e serviços. O CONTRATANTE se responsabiliza pela conduta dos convidados e por danos causados ao espaço.

7. FORO
Fica eleito o foro da comarca de {{buffet_cidade}} para dirimir quaisquer dúvidas.

{{buffet_cidade}}, {{data_geracao}}.


_______________________________________
{{buffet_razao}} (CONTRATADA)


_______________________________________
{{cliente_nome}} (CONTRATANTE)
$tpl$;

-- Customer document for contracts
alter table public.customers add column document text;

-- ------------------------------------------------------------
-- Celebrants: birthdays to re-engage next year
-- ------------------------------------------------------------
create table public.celebrants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  name text not null check (length(trim(name)) > 0),
  birth_date date not null,
  notes text,
  created_at timestamptz not null default now()
);
create index celebrants_org_birthday_idx on public.celebrants(organization_id, (extract(month from birth_date)), (extract(day from birth_date)));
create index celebrants_customer_idx on public.celebrants(customer_id);

-- ------------------------------------------------------------
-- Quote installments (payment plan)
-- ------------------------------------------------------------
create type public.installment_rule as enum ('ON_ACCEPT', 'DAYS_BEFORE_EVENT', 'FIXED_DATE');

create table public.quote_installments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  sequence int not null default 1,
  label text not null,
  percent numeric(5,2) not null check (percent >= 0 and percent <= 100),
  amount numeric(12,2) not null default 0,
  rule public.installment_rule not null default 'DAYS_BEFORE_EVENT',
  days_before int check (days_before is null or days_before >= 0),
  due_date date,
  created_at timestamptz not null default now()
);
create index quote_installments_quote_idx on public.quote_installments(quote_id, sequence);

-- Amounts follow the quote total; the last installment absorbs rounding.
create or replace function app.recalculate_installments(p_quote_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_total numeric(12,2);
  v_sum numeric(12,2) := 0;
  v_last uuid;
  r record;
begin
  select total into v_total from public.quotes where id = p_quote_id;
  if v_total is null then return; end if;
  for r in select id, percent from public.quote_installments where quote_id = p_quote_id order by sequence, created_at loop
    update public.quote_installments set amount = round(v_total * r.percent / 100, 2) where id = r.id;
    v_sum := v_sum + round(v_total * r.percent / 100, 2);
    v_last := r.id;
  end loop;
  if v_last is not null then
    update public.quote_installments set amount = amount + (v_total - v_sum) where id = v_last;
  end if;
end;
$$;

-- Hook into quote recalculation
create or replace function app.recalculate_quote(p_quote_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_subtotal numeric(12,2);
  v_discount numeric(12,2);
  q record;
begin
  select * into q from public.quotes where id = p_quote_id;
  if not found then return; end if;

  select coalesce(sum(total), 0) into v_subtotal from public.quote_items where quote_id = p_quote_id;

  if q.discount_type = 'PERCENT' then
    v_discount := round(v_subtotal * least(q.discount_value, 100) / 100, 2);
  else
    v_discount := least(q.discount_value, v_subtotal);
  end if;

  update public.quotes
     set subtotal = v_subtotal,
         discount_total = v_discount,
         total = greatest(v_subtotal - v_discount, 0)
   where id = p_quote_id;

  perform app.recalculate_installments(p_quote_id);
end;
$$;

create or replace function app.installments_changed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform app.recalculate_installments(coalesce(new.quote_id, old.quote_id));
  return null;
end;
$$;

create trigger quote_installments_recalculate
  after insert or delete or update of percent, sequence on public.quote_installments
  for each row execute function app.installments_changed();

-- Seed installments from the org default plan when a quote is created
create or replace function app.seed_installments()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_plan jsonb;
  v_item jsonb;
  v_i int := 0;
begin
  select payment_plan into v_plan from public.organizations where id = new.organization_id;
  if v_plan is null or jsonb_typeof(v_plan) <> 'array' then return null; end if;
  for v_item in select * from jsonb_array_elements(v_plan) loop
    v_i := v_i + 1;
    insert into public.quote_installments (organization_id, quote_id, sequence, label, percent, rule, days_before)
    values (
      new.organization_id, new.id, v_i,
      coalesce(v_item ->> 'label', 'Parcela ' || v_i),
      coalesce((v_item ->> 'percent')::numeric, 0),
      coalesce((v_item ->> 'rule')::public.installment_rule, 'DAYS_BEFORE_EVENT'),
      nullif(v_item ->> 'days_before', '')::int
    );
  end loop;
  return null;
end;
$$;

create trigger quotes_seed_installments
  after insert on public.quotes
  for each row execute function app.seed_installments();

-- ------------------------------------------------------------
-- Contracts
-- ------------------------------------------------------------
create type public.contract_status as enum ('DRAFT', 'SENT', 'ACCEPTED', 'CANCELLED');

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete set null,
  number int not null,
  content text not null,
  status public.contract_status not null default 'DRAFT',
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  sent_at timestamptz,
  accepted_at timestamptz,
  accepted_name text,
  accepted_ip text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number)
);
create index contracts_event_idx on public.contracts(event_id, created_at desc);

create or replace function app.next_contract_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.number is null or new.number = 0 then
    select coalesce(max(number), 0) + 1 into new.number from public.contracts where organization_id = new.organization_id;
  end if;
  return new;
end;
$$;

alter table public.contracts alter column number set default 0;
create trigger contracts_number before insert on public.contracts for each row execute function app.next_contract_number();
create trigger contracts_set_updated_at before update on public.contracts for each row execute function app.set_updated_at();

-- ------------------------------------------------------------
-- Self-service quote payload on public requests
-- ------------------------------------------------------------
alter table public.public_requests
  add column package_id uuid references public.packages(id) on delete set null,
  add column addons jsonb,               -- [{addon_id, name, price, quantity}]
  add column estimated_total numeric(12,2),
  add column celebrant_name text,
  add column celebrant_birth_date date;

-- ------------------------------------------------------------
-- RLS + grants
-- ------------------------------------------------------------
alter table public.celebrants enable row level security;
alter table public.quote_installments enable row level security;
alter table public.contracts enable row level security;

do $$
declare t text;
begin
  foreach t in array array['celebrants','quote_installments','contracts']
  loop
    execute format($f$
      create policy "org members select %1$s" on public.%1$I for select to authenticated
        using (organization_id = (select app.current_org_id()));
      create policy "org members insert %1$s" on public.%1$I for insert to authenticated
        with check (organization_id = (select app.current_org_id()));
      create policy "org members update %1$s" on public.%1$I for update to authenticated
        using (organization_id = (select app.current_org_id()))
        with check (organization_id = (select app.current_org_id()));
      create policy "org members delete %1$s" on public.%1$I for delete to authenticated
        using (organization_id = (select app.current_org_id()));
    $f$, t);
  end loop;
end $$;

grant select, insert, update, delete on public.celebrants, public.quote_installments, public.contracts to authenticated, service_role;
revoke all on public.celebrants, public.quote_installments, public.contracts from anon;
grant execute on all functions in schema app to authenticated, service_role;

-- ============================================================
-- Part 2: adults/children split, lead source, invitations,
-- door check-in and on-site extras
-- ============================================================

-- The financial view is rebuilt at the end of this part.
drop view public.event_financials;

-- Packages: participants split by adults and children
alter table public.packages
  drop column included_participants,
  drop column additional_participant_price,
  add column included_adults int not null default 0 check (included_adults >= 0),
  add column included_children int not null default 0 check (included_children >= 0),
  add column extra_adult_price numeric(12,2) not null default 0 check (extra_adult_price >= 0),
  add column extra_child_price numeric(12,2) not null default 0 check (extra_child_price >= 0);

-- Events: adults/children + invitation content
alter table public.events
  drop column estimated_participants,
  add column adults int check (adults is null or adults >= 0),
  add column children int check (children is null or children >= 0),
  add column estimated_participants int generated always as (coalesce(adults, 0) + coalesce(children, 0)) stored,
  add column celebrant_name text,
  add column celebrant_age int check (celebrant_age is null or celebrant_age between 0 and 150),
  add column invite_image_url text,
  add column invite_title text,
  add column invite_message text,
  add column invite_updated_at timestamptz;

-- Quotes: adults/children
alter table public.quotes
  drop column participants,
  add column adults int not null default 0 check (adults >= 0),
  add column children int not null default 0 check (children >= 0),
  add column participants int generated always as (adults + children) stored;

-- Guests: adults/children, check-in
alter type public.guest_source add value if not exists 'DOOR';
alter table public.guests
  drop column participants,
  add column adults int not null default 1 check (adults >= 0),
  add column children int not null default 0 check (children >= 0),
  add column participants int generated always as (adults + children) stored,
  add column checked_in_at timestamptz,
  add column checked_in_adults int not null default 0 check (checked_in_adults >= 0),
  add column checked_in_children int not null default 0 check (checked_in_children >= 0),
  add constraint guests_has_people check (adults + children >= 1);

-- Public links: more link types
alter type public.public_link_type add value if not exists 'INVITE_EDIT';
alter type public.public_link_type add value if not exists 'CHECKIN';

-- On-site extras (orders made during the party)
create table public.event_extras (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  addon_id uuid references public.package_addons(id) on delete set null,
  description text not null check (length(trim(description)) > 0),
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  total numeric(12,2) generated always as (round(quantity * unit_price, 2)) stored,
  source text not null default 'DOOR',   -- DOOR (portaria) or STAFF
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index event_extras_event_idx on public.event_extras(event_id);

-- Lead source (where the request came from)
alter table public.public_requests
  add column source text,               -- instagram | google | whatsapp | indicacao | site | outro
  add column adults int check (adults is null or adults >= 0),
  add column children int check (children is null or children >= 0);
alter table public.customers add column source text;

-- Financial view: quote + on-site extras, check-in totals
create view public.event_financials
with (security_invoker = true) as
select
  e.id as event_id,
  e.organization_id,
  q.id as quote_id,
  q.status as quote_status,
  coalesce(q.total, 0)::numeric(12,2) as quote_total,
  coalesce(x.extras_total, 0)::numeric(12,2) as extras_total,
  (coalesce(q.total, 0) + coalesce(x.extras_total, 0))::numeric(12,2) as total,
  coalesce(p.paid_total, 0)::numeric(12,2) as paid_total,
  (coalesce(q.total, 0) + coalesce(x.extras_total, 0) - coalesce(p.paid_total, 0))::numeric(12,2) as balance,
  case
    when coalesce(p.paid_total, 0) <= 0 then 'UNPAID'
    when coalesce(p.paid_total, 0) >= (coalesce(q.total, 0) + coalesce(x.extras_total, 0)) and (coalesce(q.total, 0) + coalesce(x.extras_total, 0)) > 0 then 'PAID'
    else 'PARTIAL'
  end as payment_status,
  coalesce(g.guest_count, 0)::int as guest_count,
  coalesce(g.adults_total, 0)::int as adults_total,
  coalesce(g.children_total, 0)::int as children_total,
  coalesce(g.participants_total, 0)::int as participants_total,
  coalesce(g.checked_in_count, 0)::int as checked_in_count,
  coalesce(g.checked_in_total, 0)::int as checked_in_total
from public.events e
left join lateral (
  select id, status, total
  from public.quotes
  where event_id = e.id
  order by (status = 'ACCEPTED') desc, created_at desc
  limit 1
) q on true
left join lateral (
  select sum(amount) as paid_total from public.payments where event_id = e.id
) p on true
left join lateral (
  select sum(total) as extras_total from public.event_extras where event_id = e.id
) x on true
left join lateral (
  select count(*) as guest_count,
         sum(adults) as adults_total,
         sum(children) as children_total,
         sum(participants) as participants_total,
         count(*) filter (where checked_in_at is not null) as checked_in_count,
         sum(checked_in_adults + checked_in_children) as checked_in_total
  from public.guests where event_id = e.id
) g on true;

alter table public.event_extras enable row level security;
create policy "org members select event_extras" on public.event_extras for select to authenticated using (organization_id = (select app.current_org_id()));
create policy "org members insert event_extras" on public.event_extras for insert to authenticated with check (organization_id = (select app.current_org_id()));
create policy "org members update event_extras" on public.event_extras for update to authenticated using (organization_id = (select app.current_org_id())) with check (organization_id = (select app.current_org_id()));
create policy "org members delete event_extras" on public.event_extras for delete to authenticated using (organization_id = (select app.current_org_id()));

grant select, insert, update, delete on public.event_extras to authenticated, service_role;
grant select on public.event_financials to authenticated, service_role;
revoke all on public.event_extras, public.event_financials from anon;

-- Invite images live in the public org-media bucket under <org>/invites/<event>.<ext>; written by the server (service role).
