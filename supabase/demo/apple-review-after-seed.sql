-- Runs right after supabase/seed.sql when preparing an App Store review (scripts/apple-review.sh up).
-- Keeps only what the reviewer needs: the Festa & Cia owner (with a fresh random password) and the
-- client phone 11999990002 (Festa da Sofia). Drops the other seed logins.
do $$
begin
  -- Seed platform admin (admin@komyx.test) and the second demo buffet: never in production.
  delete from public.organizations where slug = 'alegria-kids-buffet';
  -- The seed admin gets its own "Komyx" org from the signup trigger; where the platform org already
  -- exists that one is a stray buffet (slug komyx-1).
  delete from public.organizations o using public.profiles p
   where p.id = '33333333-3333-3333-3333-333333333333' and o.id = p.organization_id and o.kind <> 'platform';
  delete from auth.users where id in (
    '22222222-2222-2222-2222-222222222222', -- ana@festabuffet.test (staff)
    '33333333-3333-3333-3333-333333333333', -- admin@komyx.test
    '44444444-4444-4444-4444-444444444444'  -- joao@alegriakids.test
  );
  update auth.users set encrypted_password = crypt('__DEMO_PASSWORD__', gen_salt('bf'))
   where id = '11111111-1111-1111-1111-111111111111'; -- dona@festabuffet.test
end $$;

select coalesce(u.email, u.phone) login, p.role, o.slug
  from auth.users u left join public.profiles p on p.id = u.id left join public.organizations o on o.id = p.organization_id
 order by 3 nulls last, 1;
