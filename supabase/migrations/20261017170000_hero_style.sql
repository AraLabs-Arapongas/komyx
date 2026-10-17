-- Hero style of the public page (/p/[slug]): the buffet picks how its photos open the page.
alter table public.organizations
  add column hero_style text not null default 'cinema'
  check (hero_style in ('cinema', 'bolha', 'colagem', 'confete'));
