-- ============================================================
-- Buffet SaaS - initial schema
-- Multi-tenant: every operational table carries organization_id
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- Private schema for helper functions (not exposed via API)
create schema if not exists app;
revoke all on schema app from public, anon, authenticated;
grant usage on schema app to authenticated, service_role;

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------
create type public.user_role as enum ('owner', 'staff');
create type public.event_status as enum ('PRE_RESERVED', 'CONFIRMED', 'DONE', 'CANCELLED', 'EXPIRED');
create type public.quote_status as enum ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED');
create type public.discount_type as enum ('AMOUNT', 'PERCENT');
create type public.quote_item_kind as enum ('PACKAGE', 'ADDON', 'EXTRA_PARTICIPANTS', 'CUSTOM');
create type public.payment_method as enum ('PIX', 'CASH', 'CARD', 'TRANSFER', 'OTHER');
create type public.guest_source as enum ('MANUAL', 'PUBLIC');
create type public.public_link_type as enum ('GUEST_CONFIRM', 'QUOTE');
create type public.public_request_status as enum ('NEW', 'CONVERTED', 'ARCHIVED');

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  logo_url text,
  cover_url text,
  whatsapp text,
  address text,
  instagram text,
  description text,
  default_event_duration_minutes int not null default 240 check (default_event_duration_minutes between 30 and 1440),
  pre_reservation_validity_hours int not null default 48 check (pre_reservation_validity_hours between 1 and 720),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text not null,
  role public.user_role not null default 'staff',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_organization_idx on public.profiles(organization_id);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  whatsapp text not null check (whatsapp ~ '^[0-9]{10,13}$'),
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customers_org_name_idx on public.customers(organization_id, lower(name));
create index customers_org_whatsapp_idx on public.customers(organization_id, whatsapp);

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  base_price numeric(12,2) not null default 0 check (base_price >= 0),
  included_participants int not null default 0 check (included_participants >= 0),
  additional_participant_price numeric(12,2) not null default 0 check (additional_participant_price >= 0),
  description text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index packages_org_idx on public.packages(organization_id, active);

create table public.package_addons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  price numeric(12,2) not null default 0 check (price >= 0),
  description text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index package_addons_org_idx on public.package_addons(organization_id, active);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  title text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  space text not null default '',
  status public.event_status not null default 'PRE_RESERVED',
  package_id uuid references public.packages(id) on delete set null,
  estimated_participants int check (estimated_participants is null or estimated_participants >= 0),
  notes text,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  done_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_time_order check (ends_at > starts_at),
  constraint events_pre_reservation_expires check (status <> 'PRE_RESERVED' or expires_at is not null),
  -- Hard guarantee: confirmed events never overlap in the same org/space.
  constraint events_confirmed_no_overlap exclude using gist (
    organization_id with =,
    space with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'CONFIRMED')
);
create index events_org_starts_idx on public.events(organization_id, starts_at);
create index events_org_status_idx on public.events(organization_id, status);
create index events_customer_idx on public.events(customer_id);

create table public.event_status_history (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  from_status public.event_status,
  to_status public.event_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);
create index event_status_history_event_idx on public.event_status_history(event_id);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  package_id uuid references public.packages(id) on delete set null,
  participants int not null default 0 check (participants >= 0),
  discount_type public.discount_type not null default 'AMOUNT',
  discount_value numeric(12,2) not null default 0 check (discount_value >= 0),
  subtotal numeric(12,2) not null default 0,
  discount_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status public.quote_status not null default 'DRAFT',
  notes text,
  sent_at timestamptz,
  decided_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quotes_event_idx on public.quotes(event_id, created_at desc);
create index quotes_org_status_idx on public.quotes(organization_id, status);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  kind public.quote_item_kind not null default 'CUSTOM',
  addon_id uuid references public.package_addons(id) on delete set null,
  description text not null,
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  total numeric(12,2) generated always as (round(quantity * unit_price, 2)) stored,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index quote_items_quote_idx on public.quote_items(quote_id);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  participants int not null default 1 check (participants >= 1),
  source public.guest_source not null default 'MANUAL',
  notes text,
  created_at timestamptz not null default now()
);
create index guests_event_idx on public.guests(event_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  paid_at date not null default current_date,
  method public.payment_method not null default 'PIX',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index payments_event_idx on public.payments(event_id);

create table public.public_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  type public.public_link_type not null default 'GUEST_CONFIRM',
  active boolean not null default true,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index public_links_event_idx on public.public_links(event_id, type);

create table public.public_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  whatsapp text not null check (whatsapp ~ '^[0-9]{10,13}$'),
  desired_date date,
  desired_time time,
  participants int check (participants is null or participants >= 0),
  message text,
  status public.public_request_status not null default 'NEW',
  event_id uuid references public.events(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index public_requests_org_status_idx on public.public_requests(organization_id, status, created_at desc);

-- ------------------------------------------------------------
-- Helper functions (private schema)
-- ------------------------------------------------------------
create or replace function app.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organization_id from public.profiles where id = (select auth.uid())
$$;

create or replace function app.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create or replace function app.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select role = 'owner' from public.profiles where id = (select auth.uid())), false)
$$;

create or replace function app.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function app.slugify(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    lower(translate(coalesce(input, ''),
      'áàâãäåéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
      'aaaaaaeeeeiiiiooooouuuucnAAAAAAEEEEIIIIOOOOOUUUUCN')),
    '[^a-z0-9]+', '-', 'g'))
$$;

-- ------------------------------------------------------------
-- New user -> organization + profile
-- If raw_app_meta_data.organization_id is set (invited staff) join that org.
-- Otherwise create a new org from raw_user_meta_data.org_name and become owner.
-- ------------------------------------------------------------
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid;
  v_role public.user_role;
  v_name text;
  v_org_name text;
  v_slug text;
  v_base_slug text;
  v_i int := 0;
begin
  v_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1));

  if new.raw_app_meta_data ? 'organization_id' then
    v_org_id := (new.raw_app_meta_data ->> 'organization_id')::uuid;
    v_role := coalesce((new.raw_app_meta_data ->> 'role')::public.user_role, 'staff');
  else
    v_org_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'org_name'), ''), v_name || ' Buffet');
    v_base_slug := coalesce(nullif(app.slugify(v_org_name), ''), 'buffet');
    v_slug := v_base_slug;
    while exists (select 1 from public.organizations where slug = v_slug) loop
      v_i := v_i + 1;
      v_slug := v_base_slug || '-' || v_i;
    end loop;
    insert into public.organizations (name, slug) values (v_org_name, v_slug) returning id into v_org_id;
    v_role := 'owner';
  end if;

  insert into public.profiles (id, organization_id, name, email, role)
  values (new.id, v_org_id, v_name, new.email, v_role);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

-- ------------------------------------------------------------
-- Event availability + status trail
-- ------------------------------------------------------------
create or replace function app.event_blocks_agenda(p_status public.event_status, p_expires_at timestamptz)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_status = 'CONFIRMED' then true
    when p_status = 'PRE_RESERVED' then coalesce(p_expires_at > now(), false)
    else false
  end
$$;

create or replace function app.check_event_availability()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_conflict record;
begin
  -- Only validate when the event blocks the agenda.
  if not app.event_blocks_agenda(new.status, new.expires_at) then
    return new;
  end if;

  select e.id, e.title, e.status, e.starts_at, e.ends_at
    into v_conflict
  from public.events e
  where e.organization_id = new.organization_id
    and e.space = new.space
    and e.id <> new.id
    and app.event_blocks_agenda(e.status, e.expires_at)
    and tstzrange(e.starts_at, e.ends_at, '[)') && tstzrange(new.starts_at, new.ends_at, '[)')
  limit 1;

  if found then
    raise exception 'Horário indisponível: conflito com evento % (%)', coalesce(v_conflict.title, 'sem título'), v_conflict.status
      using errcode = 'P0001', hint = 'SCHEDULE_CONFLICT';
  end if;

  return new;
end;
$$;

create trigger events_check_availability
  before insert or update of starts_at, ends_at, status, space, expires_at on public.events
  for each row execute function app.check_event_availability();

create or replace function app.event_status_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    if new.status = 'CONFIRMED' and new.confirmed_at is null then new.confirmed_at := now(); end if;
    if new.status = 'DONE' and new.done_at is null then new.done_at := now(); end if;
    if new.status = 'CANCELLED' and new.cancelled_at is null then new.cancelled_at := now(); end if;
  end if;
  return new;
end;
$$;

create trigger events_status_timestamps
  before insert or update of status on public.events
  for each row execute function app.event_status_timestamps();

create or replace function app.track_event_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.event_status_history (organization_id, event_id, from_status, to_status, changed_by)
    values (new.organization_id, new.id, case when tg_op = 'INSERT' then null else old.status end, new.status, auth.uid());
  end if;
  return null;
end;
$$;

create trigger events_track_status
  after insert or update of status on public.events
  for each row execute function app.track_event_status();

-- Mark expired pre-reservations. Called by the app on load and by pg_cron when available.
create or replace function public.expire_pre_reservations()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  with updated as (
    update public.events
       set status = 'EXPIRED'
     where status = 'PRE_RESERVED'
       and expires_at is not null
       and expires_at <= now()
    returning 1
  )
  select count(*) into v_count from updated;
  return coalesce(v_count, 0);
end;
$$;
revoke all on function public.expire_pre_reservations() from public, anon;
grant execute on function public.expire_pre_reservations() to authenticated, service_role;

-- ------------------------------------------------------------
-- Quote totals are computed in the database
-- ------------------------------------------------------------
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
end;
$$;

create or replace function app.quote_items_changed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform app.recalculate_quote(old.quote_id);
  else
    perform app.recalculate_quote(new.quote_id);
  end if;
  return null;
end;
$$;

create trigger quote_items_recalculate
  after insert or update or delete on public.quote_items
  for each row execute function app.quote_items_changed();

create or replace function app.quote_discount_changed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform app.recalculate_quote(new.id);
  return null;
end;
$$;

create trigger quotes_recalculate_on_discount
  after update of discount_type, discount_value on public.quotes
  for each row
  when (old.discount_type is distinct from new.discount_type or old.discount_value is distinct from new.discount_value)
  execute function app.quote_discount_changed();

create or replace function app.quote_status_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status is distinct from new.status then
    if new.status = 'SENT' and new.sent_at is null then new.sent_at := now(); end if;
    if new.status in ('ACCEPTED', 'REJECTED') then new.decided_at := now(); end if;
  end if;
  return new;
end;
$$;

create trigger quotes_status_timestamps
  before update of status on public.quotes
  for each row execute function app.quote_status_timestamps();

-- ------------------------------------------------------------
-- Financial summary per event (security_invoker => respects RLS)
-- ------------------------------------------------------------
create or replace view public.event_financials
with (security_invoker = true) as
select
  e.id as event_id,
  e.organization_id,
  q.id as quote_id,
  q.status as quote_status,
  coalesce(q.total, 0)::numeric(12,2) as quote_total,
  coalesce(p.paid_total, 0)::numeric(12,2) as paid_total,
  (coalesce(q.total, 0) - coalesce(p.paid_total, 0))::numeric(12,2) as balance,
  case
    when coalesce(p.paid_total, 0) <= 0 then 'UNPAID'
    when coalesce(p.paid_total, 0) >= coalesce(q.total, 0) and coalesce(q.total, 0) > 0 then 'PAID'
    else 'PARTIAL'
  end as payment_status,
  coalesce(g.guest_count, 0)::int as guest_count,
  coalesce(g.participants_total, 0)::int as participants_total
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
  select count(*) as guest_count, sum(participants) as participants_total from public.guests where event_id = e.id
) g on true;

-- ------------------------------------------------------------
-- updated_at triggers
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['organizations','profiles','customers','packages','package_addons','events','quotes','public_requests']
  loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function app.set_updated_at()', t, t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.packages enable row level security;
alter table public.package_addons enable row level security;
alter table public.events enable row level security;
alter table public.event_status_history enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.guests enable row level security;
alter table public.payments enable row level security;
alter table public.public_links enable row level security;
alter table public.public_requests enable row level security;

-- organizations: members read; owner updates
create policy "org members read organization" on public.organizations
  for select to authenticated using (id = (select app.current_org_id()));
create policy "owner updates organization" on public.organizations
  for update to authenticated
  using (id = (select app.current_org_id()) and (select app.is_owner()))
  with check (id = (select app.current_org_id()) and (select app.is_owner()));

-- profiles: members read org profiles; owner manages; user updates own name
create policy "org members read profiles" on public.profiles
  for select to authenticated using (organization_id = (select app.current_org_id()));
create policy "owner updates profiles" on public.profiles
  for update to authenticated
  using (organization_id = (select app.current_org_id()) and ((select app.is_owner()) or id = (select auth.uid())))
  with check (organization_id = (select app.current_org_id()) and role = (case when (select app.is_owner()) then role else 'staff'::public.user_role end));
create policy "owner deletes profiles" on public.profiles
  for delete to authenticated
  using (organization_id = (select app.current_org_id()) and (select app.is_owner()) and id <> (select auth.uid()));

-- owner-only config tables
create policy "org members read packages" on public.packages
  for select to authenticated using (organization_id = (select app.current_org_id()));
create policy "owner writes packages" on public.packages
  for all to authenticated
  using (organization_id = (select app.current_org_id()) and (select app.is_owner()))
  with check (organization_id = (select app.current_org_id()) and (select app.is_owner()));

create policy "org members read addons" on public.package_addons
  for select to authenticated using (organization_id = (select app.current_org_id()));
create policy "owner writes addons" on public.package_addons
  for all to authenticated
  using (organization_id = (select app.current_org_id()) and (select app.is_owner()))
  with check (organization_id = (select app.current_org_id()) and (select app.is_owner()));

-- operational tables: any member of the org
do $$
declare t text;
begin
  foreach t in array array['customers','events','quotes','quote_items','guests','payments','public_links','public_requests']
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

create policy "org members read status history" on public.event_status_history
  for select to authenticated using (organization_id = (select app.current_org_id()));

-- ------------------------------------------------------------
-- Grants. New Supabase projects do not grant table access to API roles by
-- default, so privileges are explicit here. RLS still filters every row.
-- anon has no direct access; public pages go through the server with the service role.
-- ------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant execute on all functions in schema app to authenticated, service_role;
grant execute on function public.expire_pre_reservations() to authenticated, service_role;
-- Views need explicit grants too (security_invoker => RLS of underlying tables applies).
grant select on public.event_financials to authenticated, service_role;

-- ------------------------------------------------------------
-- Storage bucket for organization media (logo, cover, photos)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('org-media', 'org-media', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "public read org media" on storage.objects
  for select to public using (bucket_id = 'org-media');
create policy "owner uploads org media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'org-media' and (select app.is_owner()) and (storage.foldername(name))[1] = (select app.current_org_id())::text);
create policy "owner updates org media" on storage.objects
  for update to authenticated
  using (bucket_id = 'org-media' and (select app.is_owner()) and (storage.foldername(name))[1] = (select app.current_org_id())::text)
  with check (bucket_id = 'org-media' and (select app.is_owner()) and (storage.foldername(name))[1] = (select app.current_org_id())::text);
create policy "owner deletes org media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'org-media' and (select app.is_owner()) and (storage.foldername(name))[1] = (select app.current_org_id())::text);

-- ------------------------------------------------------------
-- pg_cron: expire pre-reservations every 5 minutes (best effort)
-- ------------------------------------------------------------
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('expire-pre-reservations', '*/5 * * * *', $c$select public.expire_pre_reservations()$c$);
exception when others then
  raise notice 'pg_cron not available: %', sqlerrm;
end $$;
