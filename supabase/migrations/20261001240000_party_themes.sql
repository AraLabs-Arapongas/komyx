-- Party themes: the buffet's catalog of decorations (name, photo, description). Clients pick one in the quote.
create table if not exists public.party_themes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  description text,
  photo_url text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists party_themes_org_idx on public.party_themes(organization_id, active, sort_order);

alter table public.party_themes enable row level security;
create policy "org members read themes" on public.party_themes for select to authenticated using (organization_id = app.current_org_id());
create policy "owner writes themes" on public.party_themes for all to authenticated
  using (organization_id = app.current_org_id() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
  with check (organization_id = app.current_org_id() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));
grant select, insert, update, delete on public.party_themes to authenticated;
grant all on public.party_themes to service_role;

alter table public.public_requests add column if not exists theme_id uuid references public.party_themes(id) on delete set null;
alter table public.events add column if not exists theme_id uuid references public.party_themes(id) on delete set null;
