-- =========================================================================
-- Seed de demonstração do Komyx Enterprise.
--
-- Monta um escritório com equipe, política, metas, carteira de clientes,
-- quatro meses de vendas com comissões e parcelas já calculadas, e uma agenda
-- com compromissos. Serve para ver o produto cheio — o painel do dono só diz
-- alguma coisa quando existe produção para olhar.
--
-- COMO RODAR: SQL Editor do Supabase (roda como `postgres`, dono das
-- funções). `criar_escritorio_para` foi revogada de anon/authenticated/public
-- de propósito — escritório nasce do acerto comercial, não de quem chamar a
-- API.
--
-- ANTES DE RODAR: as CONTAS precisam existir. Crie cada e-mail abaixo pelo
-- /cadastro do app ou em Authentication → Add user. Este script não cria
-- conta de autenticação: senha é assunto de quem vai usá-la.
--
-- ⚠️ SÃO DADOS FICTÍCIOS. Rodando no banco de produção, eles ficam lá, ao
-- lado dos dados de cliente de verdade. Rode em projeto de teste, ou saiba
-- que vai precisar limpar depois — o bloco de limpeza está no fim do arquivo.
--
-- Idempotente: recusa rodar se o escritório já existir.
-- =========================================================================

do $$
declare
  -- ---------- PREENCHA AQUI ----------
  v_nome_escritorio text := 'Consórcios Aurora';
  v_email_dono      text := 'dono@exemplo.com';
  -- e-mail => nome de cada corretor da equipe
  v_equipe          jsonb := jsonb_build_array(
    jsonb_build_object('email', 'marina@exemplo.com',  'nome', 'Marina Bezerra'),
    jsonb_build_object('email', 'douglas@exemplo.com', 'nome', 'Douglas Prado'),
    jsonb_build_object('email', 'sheila@exemplo.com',  'nome', 'Sheila Antunes')
  );
  v_meses_de_historico int := 4;
  -- -----------------------------------

  v_escritorio uuid;
  v_dono uuid;
  v_membro jsonb;
  v_corretor uuid;
  v_config_geral uuid;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_ref date;
  v_comp uuid;
  v_cliente uuid;
  v_venda uuid;
  v_comissao uuid;
  v_faixas jsonb;
  v_faixa jsonb;
  v_total bigint;
  v_pct numeric;
  v_parcelas int;
  v_valor bigint;
  v_comissao_cent bigint;
  v_parcela_base bigint;
  i int;
  k int;
  n_vendas int;
  v_nomes text[] := array[
    'Ana Ribeiro','Rogério Pinto','Carla Menezes','Fábio Tavares','Juliana Reis',
    'Otávio Nunes','Patrícia Lima','Wagner Souza','Bianca Castro','Henrique Alves',
    'Simone Duarte','Marcelo Farias','Renata Coelho','Gustavo Pires','Letícia Ramos',
    'Eduardo Barros','Priscila Mota','Anderson Lopes','Camila Fontes','Rafael Teixeira'];
  v_admins text[] := array['Porto','Itaú','Bradesco','Rodobens','Embracon','Santander'];
  v_produtos text[] := array['Imóvel','Automóvel','Serviços','Pesados'];
begin
  -- aleatoriedade reproduzível: rodar duas vezes em bancos diferentes gera o
  -- mesmo escritório, o que torna qualquer comparação possível
  perform setseed(0.42);

  if exists (select 1 from escritorios where nome = v_nome_escritorio) then
    raise exception 'O escritório "%" já existe. Apague antes de semear de novo (ver o fim do arquivo).', v_nome_escritorio;
  end if;

  select id into v_dono from auth.users where lower(email) = lower(v_email_dono);
  if v_dono is null then
    raise exception 'Conta não encontrada: %. Crie a conta antes de rodar este script.', v_email_dono;
  end if;

  -- ---------- escritório e equipe ----------
  v_escritorio := criar_escritorio_para(v_email_dono, v_nome_escritorio, 12, 10);
  update profiles set nome = 'Thiago Aurora' where id = v_dono and coalesce(nome, '') = '';

  for v_membro in select * from jsonb_array_elements(v_equipe) loop
    select id into v_corretor from auth.users
      where lower(email) = lower(v_membro->>'email');
    if v_corretor is null then
      raise exception 'Conta não encontrada: %. Crie a conta antes de rodar este script.', v_membro->>'email';
    end if;
    insert into membros_escritorio (escritorio_id, corretor_id, papel, entrou_em)
    values (v_escritorio, v_corretor, 'corretor',
            -- entram no começo da janela de histórico, senão o corte temporal
            -- esconde do dono justamente as vendas que este seed criou
            (date_trunc('month', v_hoje) - (v_meses_de_historico || ' months')::interval))
    on conflict do nothing;
    update profiles set nome = v_membro->>'nome' where id = v_corretor;
  end loop;

  -- ---------- política do escritório ----------
  v_faixas := jsonb_build_array(
    jsonb_build_object('min', 0,          'max', 50000000,  'percentual', 0.4, 'parcelas', 2,
                       'distribuicao', jsonb_build_array(0.25, 0.15)),
    jsonb_build_object('min', 50000001,   'max', 150000000, 'percentual', 0.6, 'parcelas', 3,
                       'distribuicao', null),
    jsonb_build_object('min', 150000001,  'max', null,      'percentual', 0.8, 'parcelas', 3,
                       'distribuicao', null)
  );

  insert into config_financeira
    (escritorio_id, aplica_a, nome_politica, faixas, dia_fechamento, dia_primeiro_pagamento,
     politica_estorno, faixa_por_escritorio, ativa)
  values (v_escritorio, null, 'Política do escritório', v_faixas, 25, 10, 'proximas', false, true)
  returning id into v_config_geral;

  -- ---------- metas, com vigência ----------
  insert into metas_escritorio (escritorio_id, corretor_id, valor_centavos, vigente_de)
  values (v_escritorio, null, 300000000,
          date_trunc('month', v_hoje - (v_meses_de_historico || ' months')::interval)::date);
  insert into metas_escritorio (escritorio_id, corretor_id, valor_centavos, vigente_de)
  values (v_escritorio, null, 400000000, date_trunc('month', v_hoje)::date);

  for v_membro in select * from jsonb_array_elements(v_equipe) loop
    select id into v_corretor from auth.users where lower(email) = lower(v_membro->>'email');
    insert into metas_escritorio (escritorio_id, corretor_id, valor_centavos, vigente_de)
    values (v_escritorio, v_corretor, 100000000 + (random() * 60000000)::bigint,
            date_trunc('month', v_hoje - (v_meses_de_historico || ' months')::interval)::date);
  end loop;

  -- ---------- carteira, vendas, comissões e parcelas ----------
  for v_membro in select * from jsonb_array_elements(v_equipe) loop
    select id into v_corretor from auth.users where lower(email) = lower(v_membro->>'email');

    -- clientes
    for i in 1..12 loop
      insert into clientes (corretor_id, nome, telefone, documento)
      values (v_corretor,
              v_nomes[1 + ((i * 3 + length(v_membro->>'nome')) % array_length(v_nomes, 1))],
              '(43) 9' || lpad((10000000 + random() * 89999999)::bigint::text, 8, '0'),
              lpad((10000000000 + random() * 89999999999)::bigint::text, 11, '0'));
    end loop;

    -- um mês de cada vez, do mais antigo para o atual
    for k in reverse v_meses_de_historico..0 loop
      v_ref := date_trunc('month', v_hoje - (k || ' months')::interval)::date;

      insert into competencias (corretor_id, ano, mes, status, config_snapshot)
      values (v_corretor, extract(year from v_ref)::int, extract(month from v_ref)::int,
              case when k = 0 then 'aberta' else 'fechada' end,
              case when k = 0 then null else jsonb_build_object(
                'faixas', v_faixas, 'dia_fechamento', 25, 'dia_primeiro_pagamento', 10) end)
      returning id into v_comp;

      -- entre 3 e 8 vendas no mês
      n_vendas := 3 + (random() * 5)::int;
      for i in 1..n_vendas loop
        select id into v_cliente from clientes
          where corretor_id = v_corretor order by random() limit 1;

        v_valor := (25000000 + random() * 145000000)::bigint;

        insert into vendas (corretor_id, cliente_id, competencia_id, valor_carta_centavos,
                            administradora, produto, grupo, cota, data_venda, status)
        values (v_corretor, v_cliente, v_comp, v_valor,
                v_admins[1 + (random() * (array_length(v_admins, 1) - 1))::int],
                v_produtos[1 + (random() * (array_length(v_produtos, 1) - 1))::int],
                lpad((1000 + random() * 8999)::int::text, 4, '0'),
                lpad((100 + random() * 899)::int::text, 3, '0'),
                v_ref + (random() * 22)::int, 'confirmada');
      end loop;

      /*
       * A faixa é do MÊS, não da venda: é o acumulado que decide, e ele muda
       * a comissão de todas as vendas do mês quando cruza um degrau. Por isso
       * o cálculo vem depois de inserir todas — igualzinho ao engine.
       */
      select coalesce(sum(valor_carta_centavos), 0) into v_total
        from vendas where competencia_id = v_comp and status = 'confirmada';

      select f into v_faixa from jsonb_array_elements(v_faixas) f
        where (f->>'min')::bigint <= v_total
          and (f->>'max' is null or (f->>'max')::bigint >= v_total)
        limit 1;
      if v_faixa is null then
        select f into v_faixa from jsonb_array_elements(v_faixas) f
          order by (f->>'min')::bigint desc limit 1;
      end if;

      v_pct := (v_faixa->>'percentual')::numeric;
      v_parcelas := (v_faixa->>'parcelas')::int;

      for v_venda, v_valor in
        select id, valor_carta_centavos from vendas
        where competencia_id = v_comp and status = 'confirmada'
      loop
        v_comissao_cent := round(v_valor * v_pct / 100);

        insert into comissoes (corretor_id, venda_id, percentual, faixa_aplicada,
                               valor_centavos, n_parcelas, status)
        values (v_corretor, v_venda, v_pct, v_faixa, v_comissao_cent, v_parcelas,
                case when k = 0 then 'prevista' else 'recebida' end)
        returning id into v_comissao;

        -- divide igual, com o resto na última: mesma regra do `repartir`
        v_parcela_base := v_comissao_cent / v_parcelas;
        for i in 1..v_parcelas loop
          insert into recebimentos (corretor_id, comissao_id, numero_parcela, valor_centavos,
                                    data_prevista, data_recebimento, status)
          values (
            v_corretor, v_comissao, i,
            case when i = v_parcelas
                 then v_comissao_cent - v_parcela_base * (v_parcelas - 1)
                 else v_parcela_base end,
            (v_ref + interval '1 month' * i + interval '9 days')::date,
            case when (v_ref + interval '1 month' * i + interval '9 days')::date <= v_hoje
                 then (v_ref + interval '1 month' * i + interval '9 days')::date end,
            case when (v_ref + interval '1 month' * i + interval '9 days')::date <= v_hoje
                 then 'recebido' else 'previsto' end);
        end loop;
      end loop;
    end loop;

    -- ---------- agenda ----------
    insert into compromissos (corretor_id, cliente_id, titulo, data, hora, nota)
    select v_corretor,
           case when random() < 0.6
                then (select id from clientes where corretor_id = v_corretor order by random() limit 1)
                end,
           t.titulo,
           v_hoje + (random() * 25 - 6)::int,
           case when random() < 0.7 then (make_time(8 + (random() * 10)::int, 30 * (random() * 1)::int, 0)) end,
           t.nota
    from (values
      ('Ligar sobre a próxima parcela', ''),
      ('Levar documento no cartório', 'Procuração assinada'),
      ('Visitar o cliente no escritório', ''),
      ('Assembleia do grupo', 'Conferir se foi contemplado'),
      ('Retornar contato do indicado', 'Veio pela Ana'),
      ('Fechar proposta de imóvel', '')
    ) as t(titulo, nota);
  end loop;

  -- o dono coordena: agenda dele é de gestão, não de venda
  insert into compromissos (corretor_id, titulo, data, hora, nota)
  values
    (v_dono, 'Fechar o mês com a equipe', v_hoje, '17:00', 'Revisar metas de cada um'),
    (v_dono, 'Reunião com a administradora', v_hoje + 4, '10:00', ''),
    (v_dono, 'Conferir repasses do mês', v_hoje + 8, null, '');

  raise notice 'Escritório "%" criado com % corretores, % meses de histórico.',
    v_nome_escritorio, jsonb_array_length(v_equipe), v_meses_de_historico;
end $$;

-- =========================================================================
-- LIMPEZA — apaga TUDO que este seed criou, menos as contas de autenticação.
-- Descomente e rode com o mesmo nome de escritório.
-- =========================================================================
-- do $$
-- declare
--   v_nome text := 'Consórcios Aurora';
--   v_escritorio uuid;
--   v_pessoas uuid[];
-- begin
--   select id into v_escritorio from escritorios where nome = v_nome;
--   if v_escritorio is null then raise notice 'Nada a limpar.'; return; end if;
--
--   select array_agg(corretor_id) into v_pessoas
--     from membros_escritorio where escritorio_id = v_escritorio;
--
--   delete from recebimentos where corretor_id = any(v_pessoas);
--   delete from comissoes    where corretor_id = any(v_pessoas);
--   delete from vendas       where corretor_id = any(v_pessoas);
--   delete from competencias where corretor_id = any(v_pessoas);
--   delete from compromissos where corretor_id = any(v_pessoas);
--   delete from clientes     where corretor_id = any(v_pessoas);
--   delete from eventos      where corretor_id = any(v_pessoas);
--   delete from metas_escritorio     where escritorio_id = v_escritorio;
--   delete from config_financeira    where escritorio_id = v_escritorio;
--   delete from convites_escritorio  where escritorio_id = v_escritorio;
--   delete from membros_escritorio   where escritorio_id = v_escritorio;
--   delete from escritorios where id = v_escritorio;
--   raise notice 'Escritório "%" e os dados da equipe foram apagados.', v_nome;
-- end $$;
