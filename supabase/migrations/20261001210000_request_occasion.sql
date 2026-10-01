-- Requests carry the occasion; the celebrant only makes sense for birthdays.
alter table public.public_requests add column if not exists occasion text
  check (occasion is null or occasion in ('BIRTHDAY', 'GENDER_REVEAL', 'CORPORATE', 'WEDDING', 'OTHER'));
alter table public.events add column if not exists occasion text
  check (occasion is null or occasion in ('BIRTHDAY', 'GENDER_REVEAL', 'CORPORATE', 'WEDDING', 'OTHER'));
