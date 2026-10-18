-- Owner app (mobile): staff cannot read organization_billing under RLS, but the "acesso pausado"
-- (docs/assinatura.md §4) applies to the whole buffet. Returns only the flag for the caller's own buffet.
create or replace function public.my_access_paused()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select b.paused_at is not null
    from public.profiles p
    join public.organization_billing b on b.organization_id = p.organization_id
    where p.id = auth.uid()
  ), false);
$$;
revoke all on function public.my_access_paused() from public, anon;
grant execute on function public.my_access_paused() to authenticated;
