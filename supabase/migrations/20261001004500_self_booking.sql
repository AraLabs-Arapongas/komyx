-- Clients may hold a date by themselves from the public page (pre-reservation with expiry).
alter table public.organizations add column self_booking_enabled boolean not null default true;
alter table public.events add column origin text not null default 'STAFF'; -- STAFF | SELF_SERVICE
