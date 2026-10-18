-- One buffet per Komyx subscription state, to open and look at (docs/assinatura.md). Local seed only.
-- Log in as <login>@komyx.test / senha12345. Dates are relative to the reset day; the description of
-- each buffet says what it shows. Re-running is safe: existing logins are skipped.
do $$
declare
  r record;
  v_org uuid;
  v_cust uuid;
begin
  for r in select * from (values
    ('55555555-0000-0000-0000-000000000001'::uuid, 'emdia',     'Buffet Em dia',          'Assinatura mensal paga, próxima cobrança em 20 dias. Mostra: tudo normal, sem faixa.'),
    ('55555555-0000-0000-0000-000000000002'::uuid, 'teste',     'Buffet Teste grátis',    'No teste grátis, sem CNPJ/CPF. Mostra: faixa pedindo os dados e o botão Assinar agora.'),
    ('55555555-0000-0000-0000-000000000003'::uuid, 'vencido',   'Buffet Vencido 1 dia',   'Mensalidade vencida ontem. Mostra: faixa amarela e o bloco Pagar em Minha conta.'),
    ('55555555-0000-0000-0000-000000000004'::uuid, 'vencido9',  'Buffet Vencido 9 dias',  'Mensalidade vencida há 9 dias. Mostra: faixa vermelha "amanhã seu acesso será pausado".'),
    ('55555555-0000-0000-0000-000000000005'::uuid, 'pausado',   'Buffet Pausado',         'Mensalidade vencida há 10 dias. Mostra: tela "Seu acesso está pausado"; a página pública não oferece reserva.'),
    ('55555555-0000-0000-0000-000000000006'::uuid, 'troca',     'Buffet Troca agendada',  'Plano mensal pago com troca para 12 meses na renovação. Mostra: aviso "A partir de…" com Desfazer.'),
    ('55555555-0000-0000-0000-000000000007'::uuid, 'cancelado', 'Buffet Cancelado',       'Assinatura cancelada, acesso até daqui a 10 dias. Mostra: aviso de cancelada e Reativar.')
  ) as t(id, login, org_name, about)
  loop
    continue when exists (select 1 from auth.users where id = r.id);
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', r.id, 'authenticated', 'authenticated', r.login || '@komyx.test',
      extensions.crypt('senha12345', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
      jsonb_build_object('name', 'Dono ' || r.org_name, 'org_name', r.org_name), now() - interval '60 days', now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), r.id, r.id, jsonb_build_object('sub', r.id, 'email', r.login || '@komyx.test', 'email_verified', true), 'email', now(), now(), now());

    select organization_id into v_org from public.profiles where id = r.id;
    -- Valid textbook CNPJ (Asaas refuses invalid ones); the trial buffet keeps it empty on purpose.
    update public.organizations set description = r.about, whatsapp = '11988880000', public_page = true,
      document = case when r.login = 'teste' then null else 'CNPJ 11.222.333/0001-81' end,
      legal_name = r.org_name || ' Ltda', pix_key = '11988880000',
      -- An operating buffet: the first-week checklist is done (package, Pix, photos, a party).
      gallery = '[{"url":"/demo/festa-1.jpg","caption":"Salão pronto para a festa"},{"url":"/demo/festa-2.jpg","caption":"Mesa do bolo"}]'::jsonb
    where id = v_org;
    insert into public.packages (organization_id, name, base_price, included_adults, included_children, extra_adult_price, extra_child_price, description, sort_order)
    values (v_org, 'Pacote Festa', 3500, 30, 30, 60, 40, 'Buffet completo, 4h de festa, 2 monitores.', 1);

    insert into public.organization_billing (organization_id, cycle_start, due_at, status, billing_period)
    values (v_org,
      case r.login when 'teste' then current_date - 18 when 'emdia' then current_date - 10 when 'troca' then current_date - 10 when 'cancelado' then current_date - 20
        when 'vencido' then current_date - 31 when 'vencido9' then current_date - 39 else current_date - 40 end,
      case r.login when 'teste' then current_date + 12 when 'emdia' then current_date + 20 when 'troca' then current_date + 20 when 'cancelado' then current_date + 10
        when 'vencido' then current_date - 1 when 'vencido9' then current_date - 9 else current_date - 10 end,
      case r.login when 'teste' then 'trial' else 'ok' end, 1)
    on conflict (organization_id) do update set cycle_start = excluded.cycle_start, due_at = excluded.due_at, status = excluded.status, billing_period = 1;

    -- Paid history (all but the trial), then the open invoice of the late ones.
    if r.login <> 'teste' then
      insert into public.billing_invoices (organization_id, period_start, period_end, amount, due_at, status, paid_at, method, provider, months)
      select v_org, b.cycle_start, b.due_at, 149, b.cycle_start, 'paid', b.cycle_start, 'PIX', 'manual', 1 from public.organization_billing b where b.organization_id = v_org;
    end if;
    if r.login in ('vencido', 'vencido9', 'pausado') then
      insert into public.billing_invoices (organization_id, period_start, period_end, amount, due_at, status, provider, months, notes)
      select v_org, b.due_at, b.due_at + 30, 149, b.due_at, 'open', 'manual', 1, 'Seed: fatura em atraso' from public.organization_billing b where b.organization_id = v_org;
    end if;
    if r.login = 'pausado' then
      update public.organization_billing set paused_at = now() where organization_id = v_org;
    end if;
    if r.login = 'troca' then
      update public.organization_billing set pending_period = 12, pending_from = due_at where organization_id = v_org;
    end if;
    if r.login = 'cancelado' then
      update public.organizations set status = 'cancelled', cancelled_at = now() - interval '2 days', access_until = current_date + 10 where id = v_org;
    end if;

    -- Something to see on the paused screen and in the panel: a request waiting and a confirmed party.
    insert into public.customers (organization_id, name, whatsapp) values (v_org, 'Ana Souza', '11977770000') returning id into v_cust;
    insert into public.events (organization_id, customer_id, title, starts_at, ends_at, status, adults, children)
    values (v_org, v_cust, 'Aniversário do Pedro', (current_date + 5) + time '15:00', (current_date + 5) + time '19:00', 'CONFIRMED', 30, 20);
    insert into public.public_requests (organization_id, name, whatsapp, desired_date, adults, children, estimated_total, source)
    values (v_org, 'Ana Souza', '11977770000', current_date + 40, 30, 30, 3500, 'instagram');
  end loop;
end $$;
