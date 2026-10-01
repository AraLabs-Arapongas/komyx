-- Festeja plans and premium site customization
create type public.org_plan as enum ('basic', 'premium');

alter table public.organizations
  add column plan public.org_plan not null default 'basic',
  add column show_prices_public boolean not null default true,
  -- Premium: {"primary":"#e8356d","accent":"#ffc43d","ink":"#1b1f3a","paper":"#fffdf7","font":"festa"}
  add column theme jsonb not null default '{}'::jsonb;
