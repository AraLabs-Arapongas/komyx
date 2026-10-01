-- The public address (slug) is assigned by Festeja. Owners cannot change it; only the
-- service role (future admin panel) can.
create or replace function app.protect_org_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.slug is distinct from old.slug
     and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'O endereço público só pode ser alterado pelo suporte do Festeja.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger organizations_protect_slug
  before update of slug on public.organizations
  for each row execute function app.protect_org_slug();
