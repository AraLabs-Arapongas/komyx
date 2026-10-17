-- "Aparecer no Google": listed buffets go into the sitemap and are indexable; off → noindex.
alter table public.organizations add column if not exists seo_listed boolean not null default true;
