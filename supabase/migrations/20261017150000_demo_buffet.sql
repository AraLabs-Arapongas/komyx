-- ============================================================
-- Komyx Buffet: the permanent demo buffet (/p/komyx-buffet)
-- ============================================================
-- Public showcase linked from the home page, sales demos (owner demo@komyx.com.br) and App Store
-- review (client phone 11900000001). The account is created by the normal signup; this migration
-- marks the org as demo and app.reset_demo_buffet() rebuilds everything except the org row and its
-- logins, with dates relative to today. pg_cron runs it every night; it is a no-op until the org exists.

alter table public.organizations add column if not exists is_demo boolean not null default false;

-- is_demo is managed by Komyx, like status/plan/notes.
drop trigger if exists organizations_protect_admin_fields on public.organizations;
create or replace function app.protect_org_admin_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.status is distinct from old.status or new.plan is distinct from old.plan or new.notes is distinct from old.notes
      or new.is_demo is distinct from old.is_demo)
     and coalesce(current_setting('request.jwt.claim.role', true), '') in ('authenticated', 'anon') then
    raise exception 'Plano, status e cobrança são gerenciados pelo Komyx.' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger organizations_protect_admin_fields
  before update of status, plan, notes, is_demo on public.organizations
  for each row execute function app.protect_org_admin_fields();

-- Admin panel labels the demo and leaves it out of the platform totals.
create or replace view public.admin_org_stats
with (security_invoker = false) as
select
  o.id as organization_id,
  (select count(*) from public.profiles p where p.organization_id = o.id) as members,
  (select count(*) from public.events e where e.organization_id = o.id) as events_total,
  (select count(*) from public.events e where e.organization_id = o.id and e.created_at > now() - interval '30 days') as events_30d,
  (select count(*) from public.events e where e.organization_id = o.id and e.origin = 'SELF_SERVICE') as self_service_events,
  (select count(*) from public.public_requests r where r.organization_id = o.id) as requests_total,
  (select coalesce(sum(p.amount), 0) from public.payments p where p.organization_id = o.id) as payments_total,
  (select max(e.created_at) from public.events e where e.organization_id = o.id) as last_event_at,
  o.is_demo
from public.organizations o
where o.kind = 'buffet';

-- No e-mail for the demo: neither the nightly rebuild nor visitors' requests on the showcase.
create or replace function app.email_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if exists (select 1 from public.organizations o where o.id = new.organization_id and o.is_demo) then
    return null;
  end if;
  begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'notify_email_url';
    select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'notify_email_secret';
    perform net.http_post(
      url := coalesce(v_url, 'http://host.docker.internal:3000/api/notifications/email'),
      body := jsonb_build_object('id', new.id),
      headers := jsonb_build_object('content-type', 'application/json', 'authorization', 'Bearer ' || coalesce(v_secret, 'komyx-local-notify-email-secret')),
      timeout_milliseconds := 10000
    );
  exception when others then
    raise warning 'email_notification %: %', new.id, sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function app.email_notification() from public, anon, authenticated;

-- R$ 1.234,56
create or replace function app.demo_brl(p_value numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'R$ ' || translate(to_char(coalesce(p_value, 0), 'FM999,999,990.00'), ',.', '.,')
$$;
revoke all on function app.demo_brl(numeric) from public, anon, authenticated;

-- Contract text for a demo quote, in the shape of the default contract template.
create or replace function app.demo_contract_text(p_quote uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE BUFFET' || E'\n\n'
    || 'CONTRATADA: ' || o.legal_name || ', ' || o.document || ', com sede em ' || o.address || ', WhatsApp ' || o.whatsapp || '.' || E'\n\n'
    || 'CONTRATANTE: ' || c.name || ', WhatsApp ' || c.whatsapp || coalesce(', ' || c.email, '') || '.' || E'\n\n'
    || '1. OBJETO' || E'\n'
    || 'A CONTRATADA prestará serviços de buffet para o evento "' || coalesce(e.title, 'Festa') || '" no dia '
    || to_char(e.starts_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') || ', das ' || to_char(e.starts_at at time zone 'America/Sao_Paulo', 'HH24:MI')
    || ' às ' || to_char(e.ends_at at time zone 'America/Sao_Paulo', 'HH24:MI') || ', para até ' || (q.adults + q.children) || ' participantes ('
    || q.adults || ' adultos e ' || q.children || ' crianças), conforme ' || coalesce(p.name, 'pacote personalizado') || '.' || E'\n\n'
    || '2. ITENS CONTRATADOS' || E'\n'
    || coalesce((select string_agg('- ' || i.description || case when i.quantity <> 1 and i.kind <> 'EXTRA_PARTICIPANTS' then ' (' || trim_scale(i.quantity) || ' × ' || app.demo_brl(i.unit_price) || ')' else '' end || ': ' || app.demo_brl(i.total), E'\n' order by i.sort_order, i.created_at)
       from public.quote_items i where i.quote_id = q.id), '-') || E'\n\n'
    || '3. VALOR E FORMA DE PAGAMENTO' || E'\n'
    || 'O valor total é de ' || app.demo_brl(q.total) || case when q.discount_total > 0 then ' (já com ' || app.demo_brl(q.discount_total) || ' de desconto)' else '' end || ', a ser pago da seguinte forma:' || E'\n'
    || coalesce((select string_agg('- ' || s.label || ' (' || trim_scale(s.percent) || '%): ' || app.demo_brl(s.amount)
         || case when s.rule <> 'ON_ACCEPT' and s.days_before is not null then ', até ' || s.days_before || ' dias antes do evento' else '' end, E'\n' order by s.sequence)
       from public.quote_installments s where s.quote_id = q.id), '-') || E'\n'
    || 'Pix: ' || o.pix_key || E'\n\n'
    || '4. PARTICIPANTES EXCEDENTES' || E'\n'
    || 'Participantes além do contratado serão cobrados conforme tabela vigente do pacote, apurados no dia do evento.' || E'\n\n'
    || '5. CANCELAMENTO E REMARCAÇÃO' || E'\n'
    || 'Em caso de cancelamento pelo CONTRATANTE com mais de 30 dias de antecedência, será retido o sinal. Com menos de 30 dias, serão retidos 50% do valor total. Remarcações dependem de disponibilidade de agenda.' || E'\n\n'
    || '6. RESPONSABILIDADES' || E'\n'
    || 'A CONTRATADA se responsabiliza pela qualidade dos alimentos e serviços. O CONTRATANTE se responsabiliza pela conduta dos convidados e por danos causados ao espaço.' || E'\n\n'
    || '7. FORO' || E'\n'
    || 'Fica eleito o foro da comarca de ' || o.city || ' para dirimir quaisquer dúvidas.'
  from public.quotes q
  join public.events e on e.id = q.event_id
  join public.customers c on c.id = e.customer_id
  join public.organizations o on o.id = q.organization_id
  left join public.packages p on p.id = q.package_id
  where q.id = p_quote
$$;
revoke all on function app.demo_contract_text(uuid) from public, anon, authenticated;

-- ------------------------------------------------------------
-- app.reset_demo_buffet(): rebuild the demo from scratch
-- ------------------------------------------------------------
create or replace function app.reset_demo_buffet()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_owner uuid;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_img text;
  v_base text;
  -- catalog
  p_brincar uuid; p_festejar uuid; p_celebrar uuid;
  a_hora uuid; a_recreacao uuid; a_pipoca uuid; a_lembranca uuid; a_foto uuid;
  t_safari uuid; t_mar uuid; t_circo uuid; t_astronauta uuid; t_jardim uuid; t_dino uuid;
  -- people and parties
  c_juliana uuid; c_renato uuid; c_patricia uuid; c_camila uuid; c_marcos uuid; c_fernanda uuid; c_aline uuid;
  e_lucas uuid; e_manuela uuid; e_valentina uuid; e_bernardo uuid; e_helena uuid; e_davi uuid; e_miguel uuid; e_laura uuid;
  q_lucas uuid; q_manuela uuid; q_valentina uuid; q_bernardo uuid; q_helena uuid; q_davi uuid; q_miguel uuid; q_laura uuid;
  v_pkg uuid; v_name text; v_g uuid; v_i int; v_dep numeric; v_total numeric;
  v_salgados text[] := array['Coxinha', 'Kibe', 'Bolinha de queijo', 'Esfiha de carne', 'Enroladinho de salsicha', 'Risole de frango', 'Mini pizza', 'Pão de queijo'];
  v_doces text[] := array['Brigadeiro', 'Beijinho', 'Cajuzinho', 'Bicho de pé', 'Brigadeiro de churros', 'Olho de sogra', 'Docinho de maracujá'];
  v_bebidas text[] := array['Refrigerantes', 'Suco natural de laranja', 'Suco de uva integral', 'Água com e sem gás'];
  v_quentes text[] := array['Mini hambúrguer', 'Cachorro-quente', 'Batata frita', 'Pipoca', 'Crepe', 'Mini churros'];
  v_bolo text[] := array['Chocolate com brigadeiro', 'Baunilha com doce de leite', 'Ninho com morango', 'Cenoura com chocolate'];
  v_bar text[] := array['Cerveja', 'Caipirinha de frutas', 'Drinks sem álcool', 'Espumante'];
begin
  select id into v_org from public.organizations where slug = 'komyx-buffet';
  if v_org is null then
    raise notice 'reset_demo_buffet: organização komyx-buffet ainda não existe (crie a conta demo@komyx.com.br pelo cadastro).';
    return;
  end if;
  select id into v_owner from public.profiles where organization_id = v_org order by (role = 'owner') desc, created_at limit 1;

  -- Images live in the site's public/demo/komyx-buffet. Absolute URLs when the site address is known
  -- (Vault `site_url`, or the origin of `notify_email_url`), so the mobile app can load them too.
  begin
    select rtrim(decrypted_secret, '/') into v_base from vault.decrypted_secrets where name = 'site_url';
    if v_base is null then
      select substring(decrypted_secret from '^(https?://[^/]+)') into v_base from vault.decrypted_secrets where name = 'notify_email_url';
    end if;
  exception when others then
    v_base := null;
  end;
  v_img := coalesce(v_base, '') || '/demo/komyx-buffet/';

  -- 1) Wipe everything of the org except the org row and its logins.
  delete from public.event_change_requests where organization_id = v_org;
  delete from public.event_extras where organization_id = v_org;
  delete from public.payment_reversals where organization_id = v_org;
  delete from public.payments where organization_id = v_org;
  delete from public.guests where organization_id = v_org;
  delete from public.public_links where organization_id = v_org;
  delete from public.contracts where organization_id = v_org;
  delete from public.quote_menu_choices where organization_id = v_org;
  delete from public.quote_installments where organization_id = v_org;
  delete from public.quote_items where organization_id = v_org;
  delete from public.quotes where organization_id = v_org;
  delete from public.event_status_history where organization_id = v_org;
  delete from public.public_requests where organization_id = v_org;
  delete from public.events where organization_id = v_org;
  delete from public.celebrants where organization_id = v_org;
  delete from public.customers where organization_id = v_org;
  delete from public.package_menu_items where organization_id = v_org;
  delete from public.package_menu_groups where organization_id = v_org;
  delete from public.packages where organization_id = v_org;
  delete from public.package_addons where organization_id = v_org;
  delete from public.party_themes where organization_id = v_org;
  delete from public.notifications where organization_id = v_org;
  delete from public.saas_invoices where organization_id = v_org;

  -- 2) Buffet profile (also undoes whatever a demo changed in the settings). is_demo first: it mutes the e-mails below.
  update public.organizations set
    name = 'Komyx Buffet', is_demo = true, kind = 'buffet', status = 'active', plan = 'premium',
    cancelled_at = null, cancel_reason = null, access_until = null,
    notes = 'Buffet de demonstração. Recriado toda noite por app.reset_demo_buffet().',
    tagline = 'Festa infantil com cara de festa. E você curtindo junto.',
    description = 'Salão climatizado com brinquedão de três andares, piscina de bolinhas e monitores o tempo todo. Cardápio feito na casa, decoração temática e uma equipe que cuida de tudo para você só aproveitar.',
    address = 'Rua dos Balões, 250 - Vila Mariana, São Paulo/SP',
    city = 'São Paulo/SP',
    whatsapp = '11900000000',
    instagram = 'komyxbuffet.demo',
    highlights = array['Brinquedão de 3 andares', 'Monitores o tempo todo', 'Cardápio feito na casa', 'Salão climatizado', 'Opções sem glúten e sem lactose', 'Estacionamento com manobrista'],
    capacity = 150,
    founded_year = 2012,
    testimonials = jsonb_build_array(
      jsonb_build_object('name', 'Paula, mãe da Lívia', 'text', 'Pela primeira vez consegui curtir a festa da minha filha. As monitoras cuidaram de tudo e a comida estava uma delícia.'),
      jsonb_build_object('name', 'André, pai do Rafael', 'text', 'Fechei pelo celular em poucos minutos: orçamento certinho, contrato e Pix no mesmo link. Sem surpresa no dia.'),
      jsonb_build_object('name', 'Simone, avó do Theo', 'text', 'Os convidados até hoje falam do brinquedão e do bolo. Já reservamos o próximo aniversário.')
    ),
    show_prices_public = true,
    self_booking_enabled = true,
    one_event_per_day = true,
    default_event_duration_minutes = 240,
    pre_reservation_validity_hours = 48,
    payment_plan = default,
    contract_template = default,
    theme = default,
    pix_key = 'demo@komyx.com.br',
    legal_name = 'Komyx Buffet Infantil Ltda (demonstração)',
    document = 'CNPJ 00.000.000/0001-00',
    logo_url = v_img || 'logo.png',
    cover_url = v_img || 'capa.jpg',
    cover_caption = 'Salão principal pronto para a festa',
    gallery = jsonb_build_array(
      jsonb_build_object('url', v_img || 'galeria-1.jpg', 'caption', 'Salão pronto para receber os convidados'),
      jsonb_build_object('url', v_img || 'galeria-2.jpg', 'caption', 'Mesa do bolo e dos docinhos'),
      jsonb_build_object('url', v_img || 'galeria-3.jpg', 'caption', 'Brinquedão com monitores'),
      jsonb_build_object('url', v_img || 'galeria-4.jpg', 'caption', 'Hora do parabéns'),
      jsonb_build_object('url', v_img || 'galeria-5.jpg', 'caption', 'Salgados fritos na hora'),
      jsonb_build_object('url', v_img || 'galeria-6.jpg', 'caption', 'Recreação com a turma toda')
    )
  where id = v_org;

  -- The demo is never billed: a cycle always "em dia".
  insert into public.organization_billing (organization_id, cycle_start, due_at, status, updated_at)
  values (v_org, v_today - 10, v_today + 20, 'ok', now())
  on conflict (organization_id) do update set cycle_start = excluded.cycle_start, due_at = excluded.due_at, status = excluded.status, updated_at = now();

  -- 3) Catalog: packages, menus, addons, themes.
  insert into public.packages (organization_id, name, base_price, included_adults, included_children, extra_adult_price, extra_child_price, description, sort_order)
  values (v_org, 'Pacote Brincar', 2900, 25, 25, 59, 39, 'Salgados, docinhos e bebidas à vontade, 4 horas de festa, brinquedão liberado e 2 monitores.', 1)
  returning id into p_brincar;
  insert into public.packages (organization_id, name, base_price, included_adults, included_children, extra_adult_price, extra_child_price, description, sort_order)
  values (v_org, 'Pacote Festejar', 4200, 35, 35, 69, 49, 'Tudo do Brincar + lanches quentes, bolo decorado do tema, mesa de doces montada e 3 monitores.', 2)
  returning id into p_festejar;
  insert into public.packages (organization_id, name, base_price, included_adults, included_children, extra_adult_price, extra_child_price, description, sort_order)
  values (v_org, 'Pacote Celebrar', 6400, 50, 50, 79, 59, 'Tudo do Festejar + jantar, bar de drinks, decoração temática completa, recreação dirigida e 4 monitores.', 3)
  returning id into p_celebrar;

  for v_name in select unnest(array['Pacote Brincar', 'Pacote Festejar', 'Pacote Celebrar']) loop
    v_pkg := case v_name when 'Pacote Brincar' then p_brincar when 'Pacote Festejar' then p_festejar else p_celebrar end;

    insert into public.package_menu_groups (organization_id, package_id, name, choose_count, sort_order)
    values (v_org, v_pkg, 'Salgados', case v_name when 'Pacote Brincar' then 4 when 'Pacote Festejar' then 5 else 6 end, 1) returning id into v_g;
    for v_i in 1..array_length(v_salgados, 1) loop insert into public.package_menu_items (organization_id, group_id, name, sort_order) values (v_org, v_g, v_salgados[v_i], v_i); end loop;

    insert into public.package_menu_groups (organization_id, package_id, name, choose_count, sort_order)
    values (v_org, v_pkg, 'Docinhos', case v_name when 'Pacote Brincar' then 3 when 'Pacote Festejar' then 4 else 5 end, 2) returning id into v_g;
    for v_i in 1..array_length(v_doces, 1) loop insert into public.package_menu_items (organization_id, group_id, name, sort_order) values (v_org, v_g, v_doces[v_i], v_i); end loop;

    insert into public.package_menu_groups (organization_id, package_id, name, choose_count, sort_order)
    values (v_org, v_pkg, 'Bebidas', null, 3) returning id into v_g;
    for v_i in 1..array_length(v_bebidas, 1) loop insert into public.package_menu_items (organization_id, group_id, name, sort_order) values (v_org, v_g, v_bebidas[v_i], v_i); end loop;

    if v_name <> 'Pacote Brincar' then
      insert into public.package_menu_groups (organization_id, package_id, name, choose_count, sort_order)
      values (v_org, v_pkg, 'Quentes e lanches', case v_name when 'Pacote Festejar' then 2 else 3 end, 4) returning id into v_g;
      for v_i in 1..array_length(v_quentes, 1) loop insert into public.package_menu_items (organization_id, group_id, name, sort_order) values (v_org, v_g, v_quentes[v_i], v_i); end loop;
      insert into public.package_menu_groups (organization_id, package_id, name, choose_count, sort_order)
      values (v_org, v_pkg, 'Sabor do bolo', 1, 5) returning id into v_g;
      for v_i in 1..array_length(v_bolo, 1) loop insert into public.package_menu_items (organization_id, group_id, name, sort_order) values (v_org, v_g, v_bolo[v_i], v_i); end loop;
    end if;
    if v_name = 'Pacote Celebrar' then
      insert into public.package_menu_groups (organization_id, package_id, name, choose_count, sort_order)
      values (v_org, v_pkg, 'Bar de drinks', null, 6) returning id into v_g;
      for v_i in 1..array_length(v_bar, 1) loop insert into public.package_menu_items (organization_id, group_id, name, sort_order) values (v_org, v_g, v_bar[v_i], v_i); end loop;
    end if;
  end loop;

  insert into public.package_addons (organization_id, name, price, description, sort_order) values (v_org, 'Hora extra', 490, 'Por hora adicional de festa, com a equipe completa', 1) returning id into a_hora;
  insert into public.package_addons (organization_id, name, price, description, sort_order) values (v_org, 'Recreação temática', 650, '2 recreadores fantasiados do tema e brincadeiras dirigidas', 2) returning id into a_recreacao;
  insert into public.package_addons (organization_id, name, price, description, sort_order) values (v_org, 'Carrinho de pipoca e algodão-doce', 380, 'Com monitor servindo durante a festa', 3) returning id into a_pipoca;
  insert into public.package_addons (organization_id, name, price, description, sort_order) values (v_org, 'Lembrancinhas personalizadas', 14, 'Por unidade, com o tema da festa', 4) returning id into a_lembranca;
  insert into public.package_addons (organization_id, name, price, description, sort_order) values (v_org, 'Fotógrafo (3 horas)', 890, 'Fotos tratadas entregues em até 10 dias', 5) returning id into a_foto;

  insert into public.party_themes (organization_id, name, description, photo_url, sort_order) values
    (v_org, 'Safári', 'Girafa, leão e elefante de pelúcia, folhagens e tons de verde. Bolo com os bichinhos do safári.', v_img || 'tema-safari.jpg', 1) returning id into t_safari;
  insert into public.party_themes (organization_id, name, description, photo_url, sort_order) values
    (v_org, 'Fundo do mar', 'Corais, conchas e bolhas gigantes em tons de azul. Polvo e peixinhos na mesa do bolo.', v_img || 'tema-fundo-do-mar.jpg', 2) returning id into t_mar;
  insert into public.party_themes (organization_id, name, description, photo_url, sort_order) values
    (v_org, 'Circo', 'Lona listrada, tambores, carrossel e pipoca. Vermelho, azul e muito brilho.', v_img || 'tema-circo.jpg', 3) returning id into t_circo;
  insert into public.party_themes (organization_id, name, description, photo_url, sort_order) values
    (v_org, 'Astronauta', 'Foguete, planetas e estrelas de luz. Bolo galáctico com astronauta no topo.', v_img || 'tema-astronauta.jpg', 4) returning id into t_astronauta;
  insert into public.party_themes (organization_id, name, description, photo_url, sort_order) values
    (v_org, 'Jardim encantado', 'Flores, borboletas, balanço e cogumelos. Tons de rosa e lilás com luzinhas.', v_img || 'tema-jardim.jpg', 5) returning id into t_jardim;
  insert into public.party_themes (organization_id, name, description, photo_url, sort_order) values
    (v_org, 'Dinossauros', 'Vulcão cenográfico, dinossauros gigantes e folhagens. Bolo com lava e ovo de dino.', v_img || 'tema-dinossauros.jpg', 6) returning id into t_dino;

  -- 4) Customers (11 9 0000 000x placeholders; 11900000001 is the client app demo login).
  insert into public.customers (organization_id, name, whatsapp, email, notes, source, created_at)
  values (v_org, 'Juliana Martins', '11900000001', 'juliana.martins@example.com', 'Filhos: Miguel (5) e Cecília (2). Prefere WhatsApp à noite.', 'instagram', now() - interval '26 days') returning id into c_juliana;
  insert into public.customers (organization_id, name, whatsapp, email, notes, source, created_at)
  values (v_org, 'Renato Alves', '11900000002', null, 'Cliente da casa: fez a festa do Lucas aqui.', 'indicacao', now() - interval '80 days') returning id into c_renato;
  insert into public.customers (organization_id, name, whatsapp, email, notes, source, created_at)
  values (v_org, 'Patrícia Gomes', '11900000003', 'patricia.gomes@example.com', null, 'site', now() - interval '3 hours') returning id into c_patricia;
  insert into public.customers (organization_id, name, whatsapp, email, notes, source, created_at)
  values (v_org, 'Camila Ferreira', '11900000004', null, 'Helena tem intolerância a lactose: separar docinhos sem leite.', 'google', now() - interval '15 days') returning id into c_camila;
  insert into public.customers (organization_id, name, whatsapp, email, notes, source, created_at)
  values (v_org, 'Marcos Ribeiro', '11900000005', 'marcos.ribeiro@example.com', null, 'whatsapp', now() - interval '30 days') returning id into c_marcos;
  insert into public.customers (organization_id, name, whatsapp, email, notes, source, created_at)
  values (v_org, 'Fernanda Lopes', '11900000006', null, 'Chega 1 hora antes para montar as lembrancinhas.', 'instagram', now() - interval '34 days') returning id into c_fernanda;
  insert into public.customers (organization_id, name, whatsapp, email, notes, source, created_at)
  values (v_org, 'Aline Souza', '11900000007', 'aline.souza@example.com', null, 'indicacao', now() - interval '50 days') returning id into c_aline;

  -- 5) Parties, one per day (one_event_per_day), each with its quote, payments, contract and links.

  -- Festa do Lucas: done 40 days ago, fully paid.
  insert into public.events (organization_id, customer_id, title, starts_at, ends_at, status, package_id, adults, children, celebrant_name, celebrant_age, theme_id, occasion, notes, confirmed_at, done_at, pix_txid, created_by, created_at)
  values (v_org, c_renato, 'Festa do Lucas', ((v_today - 40) + time '15:00') at time zone 'America/Sao_Paulo', ((v_today - 40) + time '19:00') at time zone 'America/Sao_Paulo',
    'DONE', p_brincar, 22, 28, 'Lucas', 4, t_safari, 'BIRTHDAY', null, now() - interval '70 days', now() - interval '40 days', 'FESTALUCAS000001', v_owner, now() - interval '75 days')
  returning id into e_lucas;
  insert into public.quotes (organization_id, event_id, package_id, adults, children, status, sent_at, decided_at, created_by, created_at)
  values (v_org, e_lucas, p_brincar, 22, 28, 'ACCEPTED', now() - interval '74 days', now() - interval '70 days', v_owner, now() - interval '75 days') returning id into q_lucas;
  insert into public.quote_items (organization_id, quote_id, kind, addon_id, description, quantity, unit_price, sort_order) values
    (v_org, q_lucas, 'PACKAGE', null, 'Pacote Brincar', 1, 2900, 0),
    (v_org, q_lucas, 'EXTRA_PARTICIPANTS', null, 'Crianças adicionais (3)', 3, 39, 2);
  select amount into v_dep from public.quote_installments where quote_id = q_lucas order by sequence limit 1;
  select total into v_total from public.quotes where id = q_lucas;
  insert into public.payments (organization_id, event_id, amount, paid_at, method, notes, created_by) values
    (v_org, e_lucas, v_dep, v_today - 70, 'PIX', 'Sinal · FESTALUCAS000001', v_owner),
    (v_org, e_lucas, v_total - v_dep, v_today - 47, 'PIX', 'Saldo', v_owner);

  -- Festa da Manuela: done last week, extras at the door, guests checked in.
  insert into public.events (organization_id, customer_id, title, starts_at, ends_at, status, package_id, adults, children, celebrant_name, celebrant_age, theme_id, occasion, notes, confirmed_at, done_at, pix_txid, created_by, created_at)
  values (v_org, c_aline, 'Festa da Manuela', ((v_today - 8) + time '16:00') at time zone 'America/Sao_Paulo', ((v_today - 8) + time '20:00') at time zone 'America/Sao_Paulo',
    'DONE', p_celebrar, 55, 50, 'Manuela', 3, t_jardim, 'BIRTHDAY', 'Balanço de flores na entrada para fotos.', now() - interval '45 days', now() - interval '8 days', 'FESTAMANUELA0002', v_owner, now() - interval '50 days')
  returning id into e_manuela;
  insert into public.quotes (organization_id, event_id, package_id, adults, children, status, sent_at, decided_at, created_by, created_at)
  values (v_org, e_manuela, p_celebrar, 55, 50, 'ACCEPTED', now() - interval '49 days', now() - interval '45 days', v_owner, now() - interval '50 days') returning id into q_manuela;
  insert into public.quote_items (organization_id, quote_id, kind, addon_id, description, quantity, unit_price, sort_order) values
    (v_org, q_manuela, 'PACKAGE', null, 'Pacote Celebrar', 1, 6400, 0),
    (v_org, q_manuela, 'EXTRA_PARTICIPANTS', null, 'Adultos adicionais (5)', 5, 79, 1),
    (v_org, q_manuela, 'ADDON', a_foto, 'Fotógrafo (3 horas)', 1, 890, 5);
  insert into public.event_extras (organization_id, event_id, addon_id, description, quantity, unit_price, source, created_by, created_at) values
    (v_org, e_manuela, null, 'Crianças a mais na portaria', 4, 59, 'DOOR', v_owner, ((v_today - 8) + time '17:10') at time zone 'America/Sao_Paulo');
  select amount into v_dep from public.quote_installments where quote_id = q_manuela order by sequence limit 1;
  select total into v_total from public.quotes where id = q_manuela;
  insert into public.payments (organization_id, event_id, amount, paid_at, method, notes, created_by) values
    (v_org, e_manuela, v_dep, v_today - 45, 'PIX', 'Sinal · FESTAMANUELA0002', v_owner),
    (v_org, e_manuela, v_total - v_dep, v_today - 15, 'TRANSFER', 'Saldo', v_owner),
    (v_org, e_manuela, 236, v_today - 8, 'CARD', 'Extras da portaria', v_owner);

  -- Festa da Valentina: TODAY, confirmed and paid, guest list ready for the door check-in.
  insert into public.events (organization_id, customer_id, title, starts_at, ends_at, status, package_id, adults, children, celebrant_name, celebrant_age, theme_id, occasion, notes, confirmed_at, pix_txid, created_by, created_at)
  values (v_org, c_fernanda, 'Festa da Valentina', (v_today + time '15:00') at time zone 'America/Sao_Paulo', (v_today + time '19:00') at time zone 'America/Sao_Paulo',
    'CONFIRMED', p_festejar, 35, 40, 'Valentina', 7, t_circo, 'BIRTHDAY', 'Parabéns às 18h. Bolo de 3 andares do circo.', now() - interval '30 days', 'FESTAVALENTI0003', v_owner, now() - interval '34 days')
  returning id into e_valentina;
  insert into public.quotes (organization_id, event_id, package_id, adults, children, status, sent_at, decided_at, created_by, created_at)
  values (v_org, e_valentina, p_festejar, 35, 40, 'ACCEPTED', now() - interval '33 days', now() - interval '30 days', v_owner, now() - interval '34 days') returning id into q_valentina;
  insert into public.quote_items (organization_id, quote_id, kind, addon_id, description, quantity, unit_price, sort_order) values
    (v_org, q_valentina, 'PACKAGE', null, 'Pacote Festejar', 1, 4200, 0),
    (v_org, q_valentina, 'EXTRA_PARTICIPANTS', null, 'Crianças adicionais (5)', 5, 49, 2),
    (v_org, q_valentina, 'ADDON', a_pipoca, 'Carrinho de pipoca e algodão-doce', 1, 380, 5);
  select amount into v_dep from public.quote_installments where quote_id = q_valentina order by sequence limit 1;
  select total into v_total from public.quotes where id = q_valentina;
  insert into public.payments (organization_id, event_id, amount, paid_at, method, notes, created_by) values
    (v_org, e_valentina, v_dep, v_today - 30, 'PIX', 'Sinal · FESTAVALENTI0003', v_owner),
    (v_org, e_valentina, v_total - v_dep, v_today - 8, 'PIX', 'Saldo · FESTAVALENTI0003', v_owner);
  insert into public.guests (organization_id, event_id, name, adults, children, source, notes) values
    (v_org, e_valentina, 'Vovó Cida e Vovô Zé', 2, 0, 'PUBLIC', null),
    (v_org, e_valentina, 'Família Duarte', 2, 2, 'PUBLIC', null),
    (v_org, e_valentina, 'Família Nogueira', 2, 3, 'PUBLIC', 'Uma criança de colo'),
    (v_org, e_valentina, 'Tia Bia e Rodrigo', 2, 1, 'MANUAL', null),
    (v_org, e_valentina, 'Turma do 2º ano (Prof. Carla)', 2, 14, 'CLIENT', null),
    (v_org, e_valentina, 'Família Prado', 2, 2, 'PUBLIC', null),
    (v_org, e_valentina, 'Madrinha Lu', 1, 0, 'PUBLIC', null),
    (v_org, e_valentina, 'Família Teixeira', 2, 2, 'PUBLIC', null),
    (v_org, e_valentina, 'Vizinhos do 42', 2, 2, 'CLIENT', null),
    (v_org, e_valentina, 'Família Barros', 3, 2, 'PUBLIC', null);

  -- Festa do Bernardo: confirmed in 4 days, fully paid.
  insert into public.events (organization_id, customer_id, title, starts_at, ends_at, status, package_id, adults, children, celebrant_name, celebrant_age, theme_id, occasion, notes, confirmed_at, pix_txid, created_by, created_at)
  values (v_org, c_marcos, 'Festa do Bernardo', ((v_today + 4) + time '16:00') at time zone 'America/Sao_Paulo', ((v_today + 4) + time '21:00') at time zone 'America/Sao_Paulo',
    'CONFIRMED', p_celebrar, 50, 50, 'Bernardo', 6, t_astronauta, 'BIRTHDAY', 'Com 1 hora extra. Foguete cenográfico na entrada.', now() - interval '26 days', 'FESTABERNAR0004', v_owner, now() - interval '30 days')
  returning id into e_bernardo;
  insert into public.quotes (organization_id, event_id, package_id, adults, children, status, sent_at, decided_at, created_by, created_at)
  values (v_org, e_bernardo, p_celebrar, 50, 50, 'ACCEPTED', now() - interval '29 days', now() - interval '26 days', v_owner, now() - interval '30 days') returning id into q_bernardo;
  insert into public.quote_items (organization_id, quote_id, kind, addon_id, description, quantity, unit_price, sort_order) values
    (v_org, q_bernardo, 'PACKAGE', null, 'Pacote Celebrar', 1, 6400, 0),
    (v_org, q_bernardo, 'ADDON', a_hora, 'Hora extra', 1, 490, 5),
    (v_org, q_bernardo, 'ADDON', a_recreacao, 'Recreação temática', 1, 650, 5);
  select amount into v_dep from public.quote_installments where quote_id = q_bernardo order by sequence limit 1;
  select total into v_total from public.quotes where id = q_bernardo;
  insert into public.payments (organization_id, event_id, amount, paid_at, method, notes, created_by) values
    (v_org, e_bernardo, v_dep, v_today - 26, 'PIX', 'Sinal · FESTABERNAR0004', v_owner),
    (v_org, e_bernardo, v_total - v_dep, v_today - 4, 'CARD', 'Saldo no cartão', v_owner);
  insert into public.guests (organization_id, event_id, name, adults, children, source) values
    (v_org, e_bernardo, 'Família Ribeiro', 4, 2, 'MANUAL'),
    (v_org, e_bernardo, 'Família Campos', 2, 2, 'PUBLIC'),
    (v_org, e_bernardo, 'Tio Fábio', 1, 0, 'PUBLIC'),
    (v_org, e_bernardo, 'Família Siqueira', 2, 1, 'PUBLIC');

  -- Festa da Helena: confirmed in 9 days, only the deposit paid (balance open, Pix).
  insert into public.events (organization_id, customer_id, title, starts_at, ends_at, status, package_id, adults, children, celebrant_name, celebrant_age, theme_id, occasion, notes, confirmed_at, pix_txid, created_by, created_at)
  values (v_org, c_camila, 'Festa da Helena', ((v_today + 9) + time '15:00') at time zone 'America/Sao_Paulo', ((v_today + 9) + time '19:00') at time zone 'America/Sao_Paulo',
    'CONFIRMED', p_festejar, 30, 35, 'Helena', 3, t_mar, 'BIRTHDAY', 'Docinhos sem lactose separados para a Helena.', now() - interval '12 days', 'FESTAHELENA00005', v_owner, now() - interval '15 days')
  returning id into e_helena;
  insert into public.quotes (organization_id, event_id, package_id, adults, children, status, sent_at, decided_at, created_by, created_at)
  values (v_org, e_helena, p_festejar, 30, 35, 'ACCEPTED', now() - interval '14 days', now() - interval '12 days', v_owner, now() - interval '15 days') returning id into q_helena;
  insert into public.quote_items (organization_id, quote_id, kind, addon_id, description, quantity, unit_price, sort_order) values
    (v_org, q_helena, 'PACKAGE', null, 'Pacote Festejar', 1, 4200, 0),
    (v_org, q_helena, 'ADDON', a_lembranca, 'Lembrancinhas personalizadas', 35, 14, 5);
  select amount into v_dep from public.quote_installments where quote_id = q_helena order by sequence limit 1;
  insert into public.payments (organization_id, event_id, amount, paid_at, method, notes, created_by) values
    (v_org, e_helena, v_dep, v_today - 12, 'PIX', 'Sinal · FESTAHELENA00005', v_owner);
  insert into public.guests (organization_id, event_id, name, adults, children, source) values
    (v_org, e_helena, 'Vovó Neusa', 1, 0, 'PUBLIC'),
    (v_org, e_helena, 'Família Pacheco', 2, 2, 'PUBLIC'),
    (v_org, e_helena, 'Dinda Carol', 2, 1, 'MANUAL');

  -- Aniversário de Davi: pre-reserved online by the client, waiting for the deposit.
  insert into public.events (organization_id, customer_id, title, starts_at, ends_at, status, package_id, adults, children, celebrant_name, celebrant_age, theme_id, occasion, notes, expires_at, origin, pix_txid, created_by, created_at)
  values (v_org, c_patricia, 'Aniversário de Davi', ((v_today + 12) + time '11:00') at time zone 'America/Sao_Paulo', ((v_today + 12) + time '15:00') at time zone 'America/Sao_Paulo',
    'PRE_RESERVED', p_brincar, 20, 25, 'Davi', 4, t_dino, 'BIRTHDAY', 'Reserva feita pelo cliente na página pública. Mensagem: Ele é apaixonado por dinossauros!', now() + interval '36 hours', 'SELF_SERVICE', 'FESTADAVI0000006', null, now() - interval '3 hours')
  returning id into e_davi;
  insert into public.quotes (organization_id, event_id, package_id, adults, children, status, sent_at, created_at)
  values (v_org, e_davi, p_brincar, 20, 25, 'SENT', now() - interval '3 hours', now() - interval '3 hours') returning id into q_davi;
  insert into public.quote_items (organization_id, quote_id, kind, addon_id, description, quantity, unit_price, sort_order) values
    (v_org, q_davi, 'PACKAGE', null, 'Pacote Brincar', 1, 2900, 0);

  -- Festa do Miguel: the party that is going well. Client phone 11900000001 (client app demo):
  -- deposit + a partial payment, contract accepted, guests confirming, personalized invite, 2 open requests.
  insert into public.events (organization_id, customer_id, title, starts_at, ends_at, status, package_id, adults, children, celebrant_name, celebrant_age, theme_id, occasion, notes, confirmed_at, pix_txid,
    invite_title, invite_message, invite_image_url, invite_updated_at, created_by, created_at)
  values (v_org, c_juliana, 'Festa do Miguel', ((v_today + 18) + time '15:00') at time zone 'America/Sao_Paulo', ((v_today + 18) + time '19:00') at time zone 'America/Sao_Paulo',
    'CONFIRMED', p_festejar, 30, 38, 'Miguel', 5, t_safari, 'BIRTHDAY', 'Bolo de girafa. Mesa de doces com bichinhos do safári.', now() - interval '20 days', 'FESTAMIGUEL00007',
    'Miguel faz 5 anos!', 'Vem com a gente para uma aventura no safári. Traga as crianças e muita energia!', v_img || 'convite-1.jpg', now() - interval '6 days', v_owner, now() - interval '24 days')
  returning id into e_miguel;
  insert into public.quotes (organization_id, event_id, package_id, adults, children, status, sent_at, decided_at, created_by, created_at)
  values (v_org, e_miguel, p_festejar, 30, 38, 'ACCEPTED', now() - interval '23 days', now() - interval '20 days', v_owner, now() - interval '24 days') returning id into q_miguel;
  insert into public.quote_items (organization_id, quote_id, kind, addon_id, description, quantity, unit_price, sort_order) values
    (v_org, q_miguel, 'PACKAGE', null, 'Pacote Festejar', 1, 4200, 0),
    (v_org, q_miguel, 'EXTRA_PARTICIPANTS', null, 'Crianças adicionais (3)', 3, 49, 2),
    (v_org, q_miguel, 'ADDON', a_recreacao, 'Recreação temática', 1, 650, 5);
  select amount into v_dep from public.quote_installments where quote_id = q_miguel order by sequence limit 1;
  insert into public.payments (organization_id, event_id, amount, paid_at, method, notes, created_by) values
    (v_org, e_miguel, v_dep, v_today - 20, 'PIX', 'Sinal · FESTAMIGUEL00007', v_owner),
    (v_org, e_miguel, 1500, v_today - 5, 'PIX', 'Parcial · FESTAMIGUEL00007', v_owner);
  insert into public.guests (organization_id, event_id, name, adults, children, source, created_at) values
    (v_org, e_miguel, 'Vovô Toninho e Vovó Rosa', 2, 0, 'PUBLIC', now() - interval '5 days'),
    (v_org, e_miguel, 'Família Andrade', 2, 2, 'PUBLIC', now() - interval '4 days'),
    (v_org, e_miguel, 'Turma da escolinha (Prof. Bia)', 1, 9, 'CLIENT', now() - interval '3 days'),
    (v_org, e_miguel, 'Tia Paula', 1, 1, 'MANUAL', now() - interval '3 days'),
    (v_org, e_miguel, 'Família Moreira', 2, 3, 'PUBLIC', now() - interval '1 day'),
    (v_org, e_miguel, 'Padrinho Léo', 2, 0, 'PUBLIC', now() - interval '5 hours');
  insert into public.event_change_requests (organization_id, event_id, kind, message, payload) values
    (v_org, e_miguel, 'PEOPLE', 'Juliana pediu 30 adultos e 45 crianças.', jsonb_build_object('adults', 30, 'children', 45)),
    (v_org, e_miguel, 'EXTRA', 'Juliana pediu Carrinho de pipoca e algodão-doce.', jsonb_build_object('addon_id', a_pipoca, 'description', 'Carrinho de pipoca e algodão-doce', 'price', 380));

  -- Aniversário da Laura: quote sent, waiting for the client (Renato is coming back after the Lucas party).
  insert into public.events (organization_id, customer_id, title, starts_at, ends_at, status, package_id, adults, children, celebrant_name, celebrant_age, theme_id, occasion, notes, created_by, created_at)
  values (v_org, c_renato, 'Aniversário da Laura', ((v_today + 35) + time '16:00') at time zone 'America/Sao_Paulo', ((v_today + 35) + time '20:00') at time zone 'America/Sao_Paulo',
    'QUOTE', p_celebrar, 55, 50, 'Laura', 7, t_jardim, 'BIRTHDAY', 'Quer visitar o salão no sábado antes de fechar.', v_owner, now() - interval '2 days')
  returning id into e_laura;
  insert into public.quotes (organization_id, event_id, package_id, adults, children, discount_type, discount_value, status, notes, sent_at, created_by, created_at)
  values (v_org, e_laura, p_celebrar, 55, 50, 'PERCENT', 5, 'SENT', '5% de desconto de cliente da casa, válido por 7 dias.', now() - interval '2 days', v_owner, now() - interval '2 days') returning id into q_laura;
  insert into public.quote_items (organization_id, quote_id, kind, addon_id, description, quantity, unit_price, sort_order) values
    (v_org, q_laura, 'PACKAGE', null, 'Pacote Celebrar', 1, 6400, 0),
    (v_org, q_laura, 'EXTRA_PARTICIPANTS', null, 'Adultos adicionais (5)', 5, 79, 1),
    (v_org, q_laura, 'ADDON', a_foto, 'Fotógrafo (3 horas)', 1, 890, 5);

  -- Menu picks: complete for most parties; Helena still has to choose the sweets.
  insert into public.quote_menu_choices (organization_id, quote_id, group_id, item_id)
  select v_org, x.quote_id, g.id, i.id
  from (values
    (q_lucas, 'Salgados', array['Coxinha', 'Bolinha de queijo', 'Mini pizza', 'Pão de queijo']),
    (q_lucas, 'Docinhos', array['Brigadeiro', 'Beijinho', 'Cajuzinho']),
    (q_manuela, 'Salgados', array['Coxinha', 'Kibe', 'Bolinha de queijo', 'Esfiha de carne', 'Risole de frango', 'Pão de queijo']),
    (q_manuela, 'Docinhos', array['Brigadeiro', 'Beijinho', 'Bicho de pé', 'Brigadeiro de churros', 'Docinho de maracujá']),
    (q_manuela, 'Quentes e lanches', array['Mini hambúrguer', 'Crepe', 'Mini churros']),
    (q_manuela, 'Sabor do bolo', array['Ninho com morango']),
    (q_valentina, 'Salgados', array['Coxinha', 'Kibe', 'Bolinha de queijo', 'Enroladinho de salsicha', 'Mini pizza']),
    (q_valentina, 'Docinhos', array['Brigadeiro', 'Beijinho', 'Cajuzinho', 'Brigadeiro de churros']),
    (q_valentina, 'Quentes e lanches', array['Cachorro-quente', 'Pipoca']),
    (q_valentina, 'Sabor do bolo', array['Chocolate com brigadeiro']),
    (q_bernardo, 'Salgados', array['Coxinha', 'Kibe', 'Bolinha de queijo', 'Esfiha de carne', 'Mini pizza', 'Pão de queijo']),
    (q_bernardo, 'Docinhos', array['Brigadeiro', 'Beijinho', 'Cajuzinho', 'Olho de sogra', 'Brigadeiro de churros']),
    (q_bernardo, 'Quentes e lanches', array['Mini hambúrguer', 'Batata frita', 'Mini churros']),
    (q_bernardo, 'Sabor do bolo', array['Cenoura com chocolate']),
    (q_helena, 'Salgados', array['Coxinha', 'Bolinha de queijo', 'Risole de frango', 'Mini pizza', 'Pão de queijo']),
    (q_helena, 'Quentes e lanches', array['Crepe', 'Pipoca']),
    (q_helena, 'Sabor do bolo', array['Baunilha com doce de leite']),
    (q_davi, 'Salgados', array['Coxinha', 'Enroladinho de salsicha', 'Mini pizza', 'Pão de queijo']),
    (q_davi, 'Docinhos', array['Brigadeiro', 'Beijinho', 'Brigadeiro de churros']),
    (q_miguel, 'Salgados', array['Coxinha', 'Kibe', 'Bolinha de queijo', 'Mini pizza', 'Pão de queijo']),
    (q_miguel, 'Docinhos', array['Brigadeiro', 'Beijinho', 'Cajuzinho', 'Bicho de pé']),
    (q_miguel, 'Quentes e lanches', array['Mini hambúrguer', 'Pipoca']),
    (q_miguel, 'Sabor do bolo', array['Chocolate com brigadeiro']),
    (q_laura, 'Salgados', array['Coxinha', 'Kibe', 'Bolinha de queijo', 'Esfiha de carne', 'Risole de frango', 'Pão de queijo']),
    (q_laura, 'Sabor do bolo', array['Ninho com morango'])
  ) as x(quote_id, group_name, items)
  join public.quotes q on q.id = x.quote_id
  join public.package_menu_groups g on g.package_id = q.package_id and g.name = x.group_name
  join public.package_menu_items i on i.group_id = g.id and i.name = any (x.items)
  on conflict do nothing;

  -- Contracts (accepted) for the confirmed and done parties, text from the final quote.
  insert into public.contracts (organization_id, event_id, quote_id, number, content, status, token, sent_at, accepted_at, accepted_name, created_by, created_at)
  select v_org, q.event_id, q.id, x.n, app.demo_contract_text(q.id), 'ACCEPTED', x.token, q.decided_at - interval '1 day', q.decided_at, c.name, v_owner, q.decided_at - interval '1 day'
  from (values
    (q_lucas, 1, 'komyx-buffet-demo-contract-lucas-0001'),
    (q_manuela, 2, 'komyx-buffet-demo-contract-manuela-0002'),
    (q_valentina, 3, 'komyx-buffet-demo-contract-valentina-0003'),
    (q_bernardo, 4, 'komyx-buffet-demo-contract-bernardo-0004'),
    (q_miguel, 5, 'komyx-buffet-demo-contract-miguel-0005'),
    (q_helena, 6, 'komyx-buffet-demo-contract-helena-0006')
  ) as x(quote_id, n, token)
  join public.quotes q on q.id = x.quote_id
  join public.events e on e.id = q.event_id
  join public.customers c on c.id = e.customer_id;

  -- Public links with fixed tokens (the client app finds Miguel's party by komyx-buffet-demo-reservation-0001).
  insert into public.public_links (organization_id, event_id, token, type, created_by) values
    (v_org, e_miguel, 'komyx-buffet-demo-reservation-0001', 'RESERVATION', v_owner),
    (v_org, e_miguel, 'komyx-buffet-demo-quote-miguel-0001', 'QUOTE', v_owner),
    (v_org, e_miguel, 'komyx-buffet-demo-guests-miguel-0001', 'GUEST_CONFIRM', v_owner),
    (v_org, e_miguel, 'komyx-buffet-demo-invite-miguel-0001', 'INVITE_EDIT', v_owner),
    (v_org, e_laura, 'komyx-buffet-demo-quote-laura-0001', 'QUOTE', v_owner),
    (v_org, e_davi, 'komyx-buffet-demo-quote-davi-0001', 'QUOTE', null),
    (v_org, e_davi, 'komyx-buffet-demo-reservation-davi-0001', 'RESERVATION', null),
    (v_org, e_helena, 'komyx-buffet-demo-reservation-helena-0001', 'RESERVATION', v_owner),
    (v_org, e_helena, 'komyx-buffet-demo-guests-helena-0001', 'GUEST_CONFIRM', v_owner),
    (v_org, e_bernardo, 'komyx-buffet-demo-reservation-bernardo-0001', 'RESERVATION', v_owner),
    (v_org, e_valentina, 'komyx-buffet-demo-reservation-valentina-0001', 'RESERVATION', v_owner),
    (v_org, e_valentina, 'komyx-buffet-demo-guests-valentina-0001', 'GUEST_CONFIRM', v_owner),
    (v_org, e_valentina, 'komyx-buffet-demo-checkin-valentina-0001', 'CHECKIN', v_owner);

  -- Guests of last week's party, checked in at the door.
  insert into public.guests (organization_id, event_id, name, adults, children, source, checked_in_at, checked_in_adults, checked_in_children) values
    (v_org, e_manuela, 'Família Souza', 4, 2, 'MANUAL', ((v_today - 8) + time '16:05') at time zone 'America/Sao_Paulo', 4, 2),
    (v_org, e_manuela, 'Família Cardoso', 2, 3, 'PUBLIC', ((v_today - 8) + time '16:20') at time zone 'America/Sao_Paulo', 2, 3),
    (v_org, e_manuela, 'Turma do berçário', 6, 8, 'CLIENT', ((v_today - 8) + time '16:35') at time zone 'America/Sao_Paulo', 6, 9),
    (v_org, e_manuela, 'Dinda Marina', 2, 1, 'PUBLIC', ((v_today - 8) + time '16:50') at time zone 'America/Sao_Paulo', 2, 1),
    (v_org, e_manuela, 'Família Lima', 2, 2, 'PUBLIC', ((v_today - 8) + time '17:05') at time zone 'America/Sao_Paulo', 2, 5);

  -- Children (birthdays): every party's celebrant + Cecília, whose birthday is coming up.
  insert into public.celebrants (organization_id, customer_id, event_id, name, birth_date) values
    (v_org, c_renato, e_lucas, 'Lucas', (v_today - 40) - interval '4 years'),
    (v_org, c_renato, e_laura, 'Laura', (v_today + 35) - interval '7 years'),
    (v_org, c_aline, e_manuela, 'Manuela', (v_today - 8) - interval '3 years'),
    (v_org, c_fernanda, e_valentina, 'Valentina', v_today - interval '7 years'),
    (v_org, c_marcos, e_bernardo, 'Bernardo', (v_today + 4) - interval '6 years'),
    (v_org, c_camila, e_helena, 'Helena', (v_today + 9) - interval '3 years'),
    (v_org, c_patricia, e_davi, 'Davi', (v_today + 12) - interval '4 years'),
    (v_org, c_juliana, e_miguel, 'Miguel', (v_today + 18) - interval '5 years'),
    (v_org, c_juliana, null, 'Cecília', (v_today + 25) - interval '2 years');

  -- 6) Quote requests from the public page (the trigger adds the notifications).
  insert into public.public_requests (organization_id, name, whatsapp, desired_date, desired_time, participants, adults, children, message, source, package_id, addons, estimated_total, celebrant_name, celebrant_birth_date, occasion, theme_id) values
    (v_org, 'Tatiane Moreira', '11900000008', v_today + 45, '15:00', 60, 25, 35, 'Oi! Queria fazer os 6 anos do Enzo com tema astronauta. Tem essa data livre?', 'instagram', p_festejar,
      jsonb_build_array(jsonb_build_object('addon_id', a_pipoca, 'name', 'Carrinho de pipoca e algodão-doce', 'price', 380, 'quantity', 1)), 4580, 'Enzo', (v_today + 45) - interval '6 years', 'BIRTHDAY', t_astronauta),
    (v_org, 'Gustavo Henrique', '11900000009', null, null, 40, 40, 0, 'Orçamento para a confraternização de fim de ano da empresa, umas 40 pessoas, sexta à noite.', 'google', null,
      null, null, null, null, 'CORPORATE', null);

  -- 7) Notifications: a past one already read, and nothing is ever e-mailed for the demo.
  insert into public.notifications (organization_id, type, title, body, href, read_at, created_at)
  select v_org, 'contract_accepted', 'Contrato nº ' || k.number || ' aceito', 'Por ' || k.accepted_name, '/eventos/' || k.event_id || '/contrato?c=' || k.id, k.accepted_at + interval '1 hour', k.accepted_at
  from public.contracts k where k.event_id = e_miguel;
  update public.notifications set emailed_at = coalesce(emailed_at, now()) where organization_id = v_org;
end;
$$;
revoke all on function app.reset_demo_buffet() from public, anon, authenticated;

-- Nightly at 03:30 in São Paulo (06:30 UTC).
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'reset-demo-buffet';
  perform cron.schedule('reset-demo-buffet', '30 6 * * *', $c$select app.reset_demo_buffet()$c$);
exception when others then
  raise notice 'pg_cron not available: %', sqlerrm;
end $$;

update public.organizations set is_demo = true where slug = 'komyx-buffet';
select app.reset_demo_buffet();
