-- Priority for /admin/pendencias: 1 = most urgent; null = no priority yet (listed last).
alter table public.platform_todos add column priority smallint check (priority between 1 and 99);
