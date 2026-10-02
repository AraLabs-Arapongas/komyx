-- Launch offer: every buffet that joins now gets Premium at the Básico price, for good. New orgs start as premium.
alter table public.organizations alter column plan set default 'premium';
