-- Default makes `short` optional on insert (the trigger still retries on collision).
alter table public.public_links alter column short set default app.short_code(8);
