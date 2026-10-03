-- Package menu: what each package includes, by group (Salgados, Docinhos, Bebidas…), and how
-- many items of a group the client picks (choose_count; null = everything in the group is
-- included). Quotes store the picks in quote_menu_choices.

create table if not exists public.package_menu_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  package_id uuid not null references public.packages(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  choose_count int check (choose_count is null or choose_count > 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists package_menu_groups_pkg_idx on public.package_menu_groups(package_id, sort_order);

create table if not exists public.package_menu_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  group_id uuid not null references public.package_menu_groups(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  description text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists package_menu_items_group_idx on public.package_menu_items(group_id, sort_order);

create table if not exists public.quote_menu_choices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  group_id uuid not null references public.package_menu_groups(id) on delete cascade,
  item_id uuid not null references public.package_menu_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (quote_id, item_id)
);
create index if not exists quote_menu_choices_quote_idx on public.quote_menu_choices(quote_id);

-- Snapshot of the picks made on the public quote wizard: [{group_id, item_ids}]
alter table public.public_requests add column if not exists menu jsonb;

alter table public.package_menu_groups enable row level security;
alter table public.package_menu_items enable row level security;
alter table public.quote_menu_choices enable row level security;

drop policy if exists "org members read menu groups" on public.package_menu_groups;
create policy "org members read menu groups" on public.package_menu_groups for select to authenticated using (organization_id = (select app.current_org_id()));
drop policy if exists "owner writes menu groups" on public.package_menu_groups;
create policy "owner writes menu groups" on public.package_menu_groups for all to authenticated
  using (organization_id = (select app.current_org_id()) and (select app.current_role()) = 'owner')
  with check (organization_id = (select app.current_org_id()) and (select app.current_role()) = 'owner');

drop policy if exists "org members read menu items" on public.package_menu_items;
create policy "org members read menu items" on public.package_menu_items for select to authenticated using (organization_id = (select app.current_org_id()));
drop policy if exists "owner writes menu items" on public.package_menu_items;
create policy "owner writes menu items" on public.package_menu_items for all to authenticated
  using (organization_id = (select app.current_org_id()) and (select app.current_role()) = 'owner')
  with check (organization_id = (select app.current_org_id()) and (select app.current_role()) = 'owner');

drop policy if exists "org members manage menu choices" on public.quote_menu_choices;
create policy "org members manage menu choices" on public.quote_menu_choices for all to authenticated
  using (organization_id = (select app.current_org_id()))
  with check (organization_id = (select app.current_org_id()));

grant select, insert, update, delete on public.package_menu_groups, public.package_menu_items, public.quote_menu_choices to authenticated;

/**
 * Menu of the latest quote behind a RESERVATION link, for the client's app and page:
 * [{group_id, name, choose_count, items: [{id, name, chosen}]}] — items of groups with no
 * choice are all "chosen".
 */
create or replace function public.reservation_menu(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with ev as (select app.reservation_event(p_token) as id),
  q as (select q.id, q.package_id from public.quotes q, ev where q.event_id = ev.id order by q.created_at desc limit 1)
  select coalesce(jsonb_agg(jsonb_build_object(
    'group_id', g.id, 'name', g.name, 'choose_count', g.choose_count,
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name, 'description', i.description,
        'chosen', g.choose_count is null or exists (select 1 from public.quote_menu_choices c, q where c.quote_id = q.id and c.item_id = i.id)) order by i.sort_order, i.name)
      from public.package_menu_items i where i.group_id = g.id and i.active), '[]'::jsonb)
  ) order by g.sort_order, g.name), '[]'::jsonb)
  from public.package_menu_groups g, q where g.package_id = q.package_id
$$;
revoke all on function public.reservation_menu(text) from public;
grant execute on function public.reservation_menu(text) to anon, authenticated, service_role;
