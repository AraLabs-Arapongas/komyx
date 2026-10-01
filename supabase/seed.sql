-- Local development seed. Runs after migrations on `supabase db reset`.
-- Creates a demo owner + staff (password: senha12345), one buffet, packages, addons, customers and events.

-- Auth users (password hash for "senha12345")
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'dona@festabuffet.test',
   crypt('senha12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Dona Maria","org_name":"Festa & Cia Buffet"}', now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"dona@festabuffet.test","email_verified":true}', 'email', now(), now(), now());

-- Staff joins the org created by the owner trigger
do $$
declare v_org uuid;
begin
  select organization_id into v_org from public.profiles where id = '11111111-1111-1111-1111-111111111111';

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'ana@festabuffet.test',
    crypt('senha12345', gen_salt('bf')), now(),
    jsonb_build_object('provider','email','providers',array['email'],'organization_id',v_org,'role','staff'),
    '{"name":"Ana Atendimento"}', now(), now(), '', '', '', '');

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"ana@festabuffet.test","email_verified":true}', 'email', now(), now(), now());

  update public.organizations
     set whatsapp = '11988887777',
         address = 'Rua das Flores, 123 - Vila Mariana, São Paulo/SP',
         instagram = 'festaeciabuffet',
         description = 'Festas infantis e comemorações com brinquedos, buffet completo e equipe de monitores. Espaço climatizado para até 120 pessoas.'
   where id = v_org;

  insert into public.packages (organization_id, name, base_price, included_adults, included_children, extra_adult_price, extra_child_price, description, sort_order) values
    (v_org, 'Pacote Bronze', 2500, 20, 20, 55, 35, 'Buffet de salgados e doces, refrigerantes e sucos, 3h de festa, 1 monitor.', 1),
    (v_org, 'Pacote Prata', 3900, 30, 30, 65, 45, 'Tudo do Bronze + mesa de frutas, bolo decorado, 4h de festa, 2 monitores.', 2),
    (v_org, 'Pacote Ouro', 5900, 40, 40, 75, 55, 'Tudo do Prata + jantar, open bar sem álcool, decoração temática e fotógrafo.', 3);

  insert into public.package_addons (organization_id, name, price, description, sort_order) values
    (v_org, 'Hora extra', 450, 'Por hora adicional de festa', 1),
    (v_org, 'Bolo cenográfico', 180, null, 2),
    (v_org, 'Recreação temática', 600, 'Personagem + brincadeiras dirigidas', 3),
    (v_org, 'Lembrancinhas', 12, 'Por unidade', 4),
    (v_org, 'Máquina de algodão-doce', 350, null, 5);

  insert into public.customers (id, organization_id, name, whatsapp, email, notes) values
    ('aaaaaaaa-0000-0000-0000-000000000001', v_org, 'Carla Mendes', '11999990001', 'carla@example.com', 'Filha Júlia, 6 anos. Alergia a amendoim.'),
    ('aaaaaaaa-0000-0000-0000-000000000002', v_org, 'Roberto Lima', '11999990002', null, null),
    ('aaaaaaaa-0000-0000-0000-000000000003', v_org, 'Fernanda Souza', '21988880003', null, 'Indicada pela Carla.'),
    ('aaaaaaaa-0000-0000-0000-000000000004', v_org, 'Paulo Andrade', '11977770004', 'paulo@example.com', null);

  -- Events relative to today
  insert into public.events (id, organization_id, customer_id, title, starts_at, ends_at, status, package_id, adults, children, celebrant_name, celebrant_age, notes, expires_at, created_by) values
    ('bbbbbbbb-0000-0000-0000-000000000001', v_org, 'aaaaaaaa-0000-0000-0000-000000000001', 'Aniversário da Júlia',
      ((current_date + 5) + time '15:00') at time zone 'America/Sao_Paulo', ((current_date + 5) + time '19:00') at time zone 'America/Sao_Paulo',
      'CONFIRMED', (select id from public.packages where organization_id = v_org and name = 'Pacote Prata'), 30, 35, 'Júlia', 6, 'Tema: Frozen. Bolo azul.', null, '11111111-1111-1111-1111-111111111111'),
    ('bbbbbbbb-0000-0000-0000-000000000002', v_org, 'aaaaaaaa-0000-0000-0000-000000000002', 'Festa do Theo',
      ((current_date + 12) + time '11:00') at time zone 'America/Sao_Paulo', ((current_date + 12) + time '15:00') at time zone 'America/Sao_Paulo',
      'PRE_RESERVED', (select id from public.packages where organization_id = v_org and name = 'Pacote Bronze'), 20, 20, 'Theo', 3, null, now() + interval '30 hours', '22222222-2222-2222-2222-222222222222'),
    ('bbbbbbbb-0000-0000-0000-000000000003', v_org, 'aaaaaaaa-0000-0000-0000-000000000003', null,
      ((current_date + 19) + time '16:00') at time zone 'America/Sao_Paulo', ((current_date + 19) + time '20:00') at time zone 'America/Sao_Paulo',
      'PRE_RESERVED', null, 50, 30, null, null, 'Quer ver o espaço antes de fechar.', now() + interval '3 days', '11111111-1111-1111-1111-111111111111'),
    ('bbbbbbbb-0000-0000-0000-000000000004', v_org, 'aaaaaaaa-0000-0000-0000-000000000004', 'Bodas de Prata',
      ((current_date - 9) + time '19:00') at time zone 'America/Sao_Paulo', ((current_date - 9) + time '23:30') at time zone 'America/Sao_Paulo',
      'DONE', (select id from public.packages where organization_id = v_org and name = 'Pacote Ouro'), 80, 10, null, null, null, null, '11111111-1111-1111-1111-111111111111'),
    ('bbbbbbbb-0000-0000-0000-000000000006', v_org, 'aaaaaaaa-0000-0000-0000-000000000003', 'Festa da firma',
      ((current_date + 30) + time '19:00') at time zone 'America/Sao_Paulo', ((current_date + 30) + time '23:00') at time zone 'America/Sao_Paulo',
      'QUOTE', (select id from public.packages where organization_id = v_org and name = 'Pacote Ouro'), 60, 0, null, null, 'Só quer o valor por enquanto; decide até sexta.', null, '11111111-1111-1111-1111-111111111111'),
    ('bbbbbbbb-0000-0000-0000-000000000005', v_org, 'aaaaaaaa-0000-0000-0000-000000000002', 'Chá revelação',
      ((current_date + 0) + time '18:00') at time zone 'America/Sao_Paulo', ((current_date + 0) + time '21:00') at time zone 'America/Sao_Paulo',
      'CONFIRMED', (select id from public.packages where organization_id = v_org and name = 'Pacote Bronze'), 25, 10, null, null, null, null, '22222222-2222-2222-2222-222222222222');

  -- Quote for Júlia (accepted) with items
  insert into public.quotes (id, organization_id, event_id, package_id, adults, children, discount_type, discount_value, status, notes, created_by)
  values ('cccccccc-0000-0000-0000-000000000001', v_org, 'bbbbbbbb-0000-0000-0000-000000000001',
    (select id from public.packages where organization_id = v_org and name = 'Pacote Prata'), 30, 35, 'AMOUNT', 200, 'ACCEPTED', 'Entrada de 30% na assinatura, restante até 2 dias antes.', '11111111-1111-1111-1111-111111111111');
  insert into public.quote_items (organization_id, quote_id, kind, description, quantity, unit_price, sort_order) values
    (v_org, 'cccccccc-0000-0000-0000-000000000001', 'PACKAGE', 'Pacote Prata', 1, 3900, 0),
    (v_org, 'cccccccc-0000-0000-0000-000000000001', 'EXTRA_PARTICIPANTS', 'Crianças adicionais (5)', 5, 45, 1),
    (v_org, 'cccccccc-0000-0000-0000-000000000001', 'ADDON', 'Recreação temática', 1, 600, 5);

  -- Quote for Theo (sent)
  insert into public.quotes (id, organization_id, event_id, package_id, adults, children, status, created_by)
  values ('cccccccc-0000-0000-0000-000000000002', v_org, 'bbbbbbbb-0000-0000-0000-000000000002',
    (select id from public.packages where organization_id = v_org and name = 'Pacote Bronze'), 20, 20, 'SENT', '22222222-2222-2222-2222-222222222222');
  insert into public.quote_items (organization_id, quote_id, kind, description, quantity, unit_price, sort_order) values
    (v_org, 'cccccccc-0000-0000-0000-000000000002', 'PACKAGE', 'Pacote Bronze', 1, 2500, 0);

  -- Quote for Bodas (accepted, fully paid)
  insert into public.quotes (id, organization_id, event_id, package_id, adults, children, status, created_by)
  values ('cccccccc-0000-0000-0000-000000000004', v_org, 'bbbbbbbb-0000-0000-0000-000000000004',
    (select id from public.packages where organization_id = v_org and name = 'Pacote Ouro'), 80, 10, 'ACCEPTED', '11111111-1111-1111-1111-111111111111');
  insert into public.quote_items (organization_id, quote_id, kind, description, quantity, unit_price, sort_order) values
    (v_org, 'cccccccc-0000-0000-0000-000000000004', 'PACKAGE', 'Pacote Ouro', 1, 5900, 0),
    (v_org, 'cccccccc-0000-0000-0000-000000000004', 'EXTRA_PARTICIPANTS', 'Adultos adicionais (40)', 40, 75, 1);

  insert into public.payments (organization_id, event_id, amount, paid_at, method, notes, created_by) values
    (v_org, 'bbbbbbbb-0000-0000-0000-000000000001', 1300, current_date - 20, 'PIX', 'Entrada 30%', '11111111-1111-1111-1111-111111111111'),
    (v_org, 'bbbbbbbb-0000-0000-0000-000000000004', 3000, current_date - 40, 'PIX', 'Entrada', '11111111-1111-1111-1111-111111111111'),
    (v_org, 'bbbbbbbb-0000-0000-0000-000000000004', 3550, current_date - 11, 'CARD', 'Saldo', '11111111-1111-1111-1111-111111111111');

  insert into public.guests (organization_id, event_id, name, adults, children, source) values
    (v_org, 'bbbbbbbb-0000-0000-0000-000000000001', 'Família Oliveira', 2, 2, 'PUBLIC'),
    (v_org, 'bbbbbbbb-0000-0000-0000-000000000001', 'Tia Lúcia', 2, 0, 'MANUAL'),
    (v_org, 'bbbbbbbb-0000-0000-0000-000000000001', 'Pedro e Bia', 2, 1, 'PUBLIC');

  insert into public.public_links (organization_id, event_id, token, type, created_by) values
    (v_org, 'bbbbbbbb-0000-0000-0000-000000000001', 'demo-guest-link-julia-0123456789abcdef', 'GUEST_CONFIRM', '11111111-1111-1111-1111-111111111111'),
    (v_org, 'bbbbbbbb-0000-0000-0000-000000000002', 'demo-quote-link-theo-0123456789abcdef', 'QUOTE', '22222222-2222-2222-2222-222222222222');

  insert into public.public_requests (organization_id, name, whatsapp, desired_date, desired_time, participants, adults, children, message, source, celebrant_name, celebrant_birth_date) values
    (v_org, 'Mariana Costa', '11966660005', current_date + 25, '15:00', 50, 20, 30, 'Aniversário de 1 ano, tema safári. Vocês têm espaço kids?', 'instagram', 'Lorenzo', current_date + 25 - interval '1 year'),
    (v_org, 'João Pereira', '11955550006', null, null, 30, 30, 0, 'Quero um orçamento para confraternização da empresa em dezembro.', 'google', null, null);

  insert into public.celebrants (organization_id, customer_id, event_id, name, birth_date) values
    (v_org, 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Júlia', (current_date + 5) - interval '6 years'),
    (v_org, 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'Theo', (current_date + 12) - interval '3 years'),
    (v_org, 'aaaaaaaa-0000-0000-0000-000000000004', null, 'Paulo', current_date + 40 - interval '50 years');

  update public.organizations set legal_name = 'Festa & Cia Eventos Ltda', document = 'CNPJ 12.345.678/0001-90', city = 'São Paulo/SP', pix_key = '12.345.678/0001-90',
    tagline = 'A festa que seu filho vai lembrar. E você vai curtir.',
    highlights = array['Espaço climatizado', 'Brinquedão e piscina de bolinhas', 'Monitores o tempo todo', 'Estacionamento gratuito', 'Cardápio para alérgicos'],
    founded_year = 2014, capacity = 120, plan = 'premium',
    billing_cycle_start = current_date - 10, billing_due_at = current_date + 20, billing_status = 'ok',
    gallery = '[{"url":"/demo/festa-1.jpg","caption":"Salão principal pronto para a festa"},{"url":"/demo/festa-2.jpg","caption":"Mesa do bolo tema safári"},{"url":"/demo/festa-3.jpg","caption":"Brinquedão com monitores"},{"url":"/demo/festa-4.jpg","caption":"Hora do parabéns"}]'::jsonb,
    testimonials = '[{"name":"Renata, mãe do Pedro","text":"Não precisei me preocupar com nada. As monitoras cuidaram das crianças e eu consegui curtir a festa do meu filho pela primeira vez."},{"name":"Carla, mãe da Júlia","text":"Fechamos pelo WhatsApp em 10 minutos e o orçamento veio certinho, sem surpresa no dia."},{"name":"Marcos, pai do Theo","text":"Comida boa de verdade, não aquele salgadinho de festa. Os adultos repetiram."}]'::jsonb
  where id = v_org;
  update public.customers set document = 'CPF 123.456.789-00', source = 'indicacao' where id = 'aaaaaaaa-0000-0000-0000-000000000001';

  -- Festeja platform admin (lives in its own org so the app shell works; flag grants /admin)
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'admin@festeja.test',
    crypt('senha12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Admin Festeja","org_name":"Festeja"}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
    '{"sub":"33333333-3333-3333-3333-333333333333","email":"admin@festeja.test","email_verified":true}', 'email', now(), now(), now());
  update public.profiles set is_platform_admin = true where id = '33333333-3333-3333-3333-333333333333';
  update public.organizations set plan = 'premium' where slug = 'festeja';

  -- A second buffet (basic plan) so the admin list has variety
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'joao@alegriakids.test',
    crypt('senha12345', gen_salt('bf')), now() - interval '20 days', '{"provider":"email","providers":["email"]}', '{"name":"João Alegria","org_name":"Alegria Kids Buffet"}', now() - interval '20 days', now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444',
    '{"sub":"44444444-4444-4444-4444-444444444444","email":"joao@alegriakids.test","email_verified":true}', 'email', now(), now(), now());
end $$;
