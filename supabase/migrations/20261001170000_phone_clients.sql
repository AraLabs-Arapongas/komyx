-- Clients sign in with their phone (SMS OTP). They are auth users without a profile/organization.

-- 1) New-user trigger: phone-only users (no e-mail) are clients, not buffet accounts.
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid;
  v_role public.user_role;
  v_name text;
  v_org_name text;
  v_slug text;
  v_base_slug text;
  v_i int := 0;
begin
  -- Client (phone OTP): no organization, no profile.
  if new.email is null and new.phone is not null then
    return new;
  end if;

  v_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1));

  if new.raw_app_meta_data ? 'organization_id' then
    v_org_id := (new.raw_app_meta_data ->> 'organization_id')::uuid;
    v_role := coalesce((new.raw_app_meta_data ->> 'role')::public.user_role, 'staff');
  else
    v_org_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'org_name'), ''), v_name || ' Buffet');
    v_base_slug := coalesce(nullif(app.slugify(v_org_name), ''), 'buffet');
    v_slug := v_base_slug;
    while exists (select 1 from public.organizations where slug = v_slug) loop
      v_i := v_i + 1;
      v_slug := v_base_slug || '-' || v_i;
    end loop;
    insert into public.organizations (name, slug) values (v_org_name, v_slug) returning id into v_org_id;
    v_role := 'owner';
  end if;

  insert into public.profiles (id, organization_id, name, email, role)
  values (new.id, v_org_id, v_name, new.email, v_role);

  return new;
end;
$$;

-- 2) Phone of the signed-in client, as stored in customers.whatsapp (digits, without the +55 prefix).
create or replace function app.current_client_phone()
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p is null then null
    when length(p) in (12, 13) and p like '55%' then substr(p, 3)
    else p
  end
  from (select regexp_replace(coalesce(auth.jwt() ->> 'phone', ''), '\D', '', 'g') as p) s
  where p <> ''
$$;
grant execute on function app.current_client_phone() to authenticated, service_role;

-- 3) Every party linked to the signed-in phone, in any buffet. Creates the reservation link when missing.
create or replace function public.my_reservations()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := app.current_client_phone();
  v_row record;
  v_token text;
  v_out jsonb := '[]'::jsonb;
begin
  if v_phone is null then return v_out; end if;
  for v_row in
    select e.id, e.organization_id, e.title, e.starts_at, e.ends_at, e.status, e.expires_at, e.adults, e.children, e.celebrant_name,
           c.name as customer_name, o.name as org_name, o.slug as org_slug, o.logo_url as org_logo
    from public.events e
    join public.customers c on c.id = e.customer_id
    join public.organizations o on o.id = e.organization_id
    where c.whatsapp = v_phone
      and o.status = 'active'
      and e.status <> 'CANCELLED'
    order by e.starts_at desc
  loop
    select token into v_token from public.public_links where event_id = v_row.id and type = 'RESERVATION' and active limit 1;
    if v_token is null then
      insert into public.public_links (organization_id, event_id, type) values (v_row.organization_id, v_row.id, 'RESERVATION') returning token into v_token;
    end if;
    v_out := v_out || jsonb_build_object(
      'id', v_row.id, 'title', v_row.title, 'starts_at', v_row.starts_at, 'ends_at', v_row.ends_at, 'status', v_row.status,
      'expires_at', v_row.expires_at, 'adults', v_row.adults, 'children', v_row.children, 'celebrant_name', v_row.celebrant_name,
      'customer_name', v_row.customer_name, 'org_name', v_row.org_name, 'org_slug', v_row.org_slug, 'org_logo', v_row.org_logo, 'token', v_token
    );
  end loop;
  return v_out;
end;
$$;
revoke all on function public.my_reservations() from public, anon;
grant execute on function public.my_reservations() to authenticated, service_role;

-- 4) The WhatsApp + date lookup is gone: lost the link → the buffet resends it, or the client signs in by phone.
drop function if exists public.find_reservation(text, date, text);
