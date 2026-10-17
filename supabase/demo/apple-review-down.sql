-- Removes the App Store review demo from production after approval (scripts/apple-review.sh down).
-- Everything that belongs to the demo buffets (events, customers, contracts, payments, links,
-- notifications...) goes by cascade. Real buffets and the platform org are untouched.
begin;
delete from public.organizations where slug in ('festa-cia-buffet', 'alegria-kids-buffet');
delete from auth.users where id in (
  '11111111-1111-1111-1111-111111111111', -- dona@festabuffet.test
  '22222222-2222-2222-2222-222222222222', -- ana@festabuffet.test
  '33333333-3333-3333-3333-333333333333', -- admin@komyx.test
  '44444444-4444-4444-4444-444444444444'  -- joao@alegriakids.test
);
-- Client logins created by the reviewer with the seed phones (no profile, phone only).
delete from auth.users where phone in ('5511999990001', '5511999990002', '5511999990003', '5511999990004', '5511999990005');
commit;

select o.slug, o.kind from public.organizations o order by 1;
