-- =========================================================================
-- Komyx Enterprise, fase 1: escritório, membros, convites, acesso e painel.
--
-- A venda é conversada ("Sob medida" na landing), então NÃO há checkout: o
-- dono cria o escritório pelo app e ele nasce aguardando ativação. Quem ativa
-- é o admin do produto, via SQL, depois do acerto comercial:
--
--   update escritorios set assinatura_status = 'ativa',
--     assinatura_ate = now() + interval '1 month 3 days'
--   where nome = '<nome>';
--
-- Enquanto o escritório está ativo, os membros não pagam o plano individual.
-- =========================================================================

-- ---------- tabelas ----------

create table escritorios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  dono_id uuid not null references profiles(id),
  -- null = aguardando ativação. 'ativa' | 'encerrada', escrito SÓ pela chave
  -- de serviço: o grant lá embaixo não dá update desta coluna a ninguém.
  assinatura_status text check (assinatura_status in ('ativa', 'encerrada')),
  assinatura_ate timestamptz,
  criado_em timestamptz not null default now()
);
create unique index um_escritorio_por_dono on escritorios (dono_id);

-- O vínculo é linha própria, não coluna em profiles, porque ele tem história:
-- quem saiu continua tendo feito parte, e o painel dos meses antigos precisa
-- continuar batendo depois da saída. A linha nunca é apagada.
create table membros_escritorio (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id),
  corretor_id uuid not null references profiles(id),
  papel text not null default 'corretor' check (papel in ('dono', 'corretor')),
  entrou_em timestamptz not null default now(),
  saiu_em timestamptz
);
-- no máximo UM vínculo ativo por corretor, em qualquer escritório
create unique index um_vinculo_ativo on membros_escritorio (corretor_id) where saiu_em is null;
create index membros_por_escritorio on membros_escritorio (escritorio_id, corretor_id);

-- O convite é uma capability: quem tem o token entra. O e-mail é rótulo para
-- o dono se organizar, não trava — o link vai por WhatsApp e o corretor
-- frequentemente tem conta com outro e-mail. O SMTP embutido do Supabase
-- manda 2 e-mails por hora, então quem entrega o link é o próprio dono.
create table convites_escritorio (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id),
  email text not null,
  token uuid not null unique default gen_random_uuid(),
  status text not null default 'pendente' check (status in ('pendente', 'aceito', 'revogado')),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default (now() + interval '14 days'),
  aceito_por uuid references profiles(id),
  aceito_em timestamptz
);
create index convites_por_escritorio on convites_escritorio (escritorio_id, criado_em desc);

-- o painel do escritório agrupa por produto (imóvel, auto...); o campo no
-- formulário de venda vem depois — até lá tudo cai em "Sem produto"
alter table vendas add column produto text not null default '';

-- ---------- funções auxiliares ----------
-- security definer para quebrar a recursão de RLS (uma policy de
-- membros_escritorio que consultasse escritorios dispararia a policy de
-- escritorios que consulta membros_escritorio — 42P17). STABLE para o planner
-- avaliar uma vez por query, não por linha.

create or replace function meu_escritorio_como_dono() returns uuid
language sql stable security definer set search_path = public as $$
  select id from escritorios where dono_id = auth.uid()
$$;

-- o vínculo ativo do usuário logado, com o estado de assinatura do escritório:
-- é a única query extra que o layout do app faz por request
create or replace function meu_escritorio() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'escritorio_id', e.id, 'nome', e.nome, 'papel', m.papel,
    'assinatura_status', e.assinatura_status, 'assinatura_ate', e.assinatura_ate)
  from membros_escritorio m
  join escritorios e on e.id = m.escritorio_id
  where m.corretor_id = auth.uid() and m.saiu_em is null
$$;

-- Nomes da equipe SEM policy de select em profiles: uma policy lá exporia as
-- colunas de cobrança do membro (assinatura_status, stripe_customer_id...) ao
-- dono via PostgREST — grant de coluna não discrimina por linha. A função
-- devolve só o que o painel precisa, inclusive vínculos encerrados: o painel
-- de meses passados nomeia quem já saiu.
create or replace function membros_do_escritorio()
returns table (membro_id uuid, corretor_id uuid, nome text, papel text,
               entrou_em timestamptz, saiu_em timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, m.corretor_id, p.nome, m.papel, m.entrou_em, m.saiu_em
  from membros_escritorio m
  join profiles p on p.id = m.corretor_id
  where m.escritorio_id = (select id from escritorios where dono_id = auth.uid())
  order by m.entrou_em
$$;

-- ---------- RLS ----------

alter table escritorios enable row level security;
alter table membros_escritorio enable row level security;
alter table convites_escritorio enable row level security;

create policy "dono ve o seu" on escritorios for select
  using (dono_id = auth.uid());
create policy "membro ve o seu" on escritorios for select
  using (id in (select escritorio_id from membros_escritorio
                where corretor_id = auth.uid() and saiu_em is null));
create policy "dono renomeia" on escritorios for update
  using (dono_id = auth.uid()) with check (dono_id = auth.uid());
-- insert: só via RPC criar_escritorio. delete: nunca.

-- membros: leitura para os dois lados; mutação SÓ via RPC definer, porque as
-- invariantes (um vínculo ativo, dono não sai, aceite valida token) não cabem
-- em policy
create policy "vejo meus vinculos" on membros_escritorio for select
  using (corretor_id = auth.uid());
create policy "dono ve a equipe" on membros_escritorio for select
  using (escritorio_id = meu_escritorio_como_dono());

create policy "dono ve convites" on convites_escritorio for select
  using (escritorio_id = meu_escritorio_como_dono());
create policy "dono convida" on convites_escritorio for insert
  with check (escritorio_id = meu_escritorio_como_dono());
create policy "dono revoga" on convites_escritorio for update
  using (escritorio_id = meu_escritorio_como_dono())
  with check (escritorio_id = meu_escritorio_como_dono());
-- quem abre o link não lê a tabela: usa ver_convite(token)

-- ---------- leitura do dono sobre os dados dos membros ----------
-- Políticas ADICIONAIS de select: as "own rows" existentes ficam intocadas e
-- policies permissivas somam por OR. O recorte temporal é a regra do
-- histórico: o dono lê a venda do membro se a data dela cai dentro do período
-- do vínculo — venda de antes de entrar nunca aparece, e depois da saída o
-- dono não ganha nada novo, mas os meses do período continuam batendo.
--
-- clientes e recebimentos ficam de fora de propósito: o painel devolve
-- agregados, sem nome de cliente e sem a agenda do membro.

create policy "dono do escritorio le" on vendas for select
  using (exists (
    select 1 from membros_escritorio m
    where m.escritorio_id = meu_escritorio_como_dono()
      and m.corretor_id = vendas.corretor_id
      and vendas.data_venda >= (m.entrou_em at time zone 'America/Sao_Paulo')::date
      and (m.saiu_em is null
           or vendas.data_venda < (m.saiu_em at time zone 'America/Sao_Paulo')::date)
  ));

create policy "dono do escritorio le" on comissoes for select
  using (exists (
    select 1 from vendas v
    join membros_escritorio m on m.corretor_id = v.corretor_id
    where v.id = comissoes.venda_id
      and m.escritorio_id = meu_escritorio_como_dono()
      and v.data_venda >= (m.entrou_em at time zone 'America/Sao_Paulo')::date
      and (m.saiu_em is null
           or v.data_venda < (m.saiu_em at time zone 'America/Sao_Paulo')::date)
  ));

-- competências: só metadado (ano/mes) — o painel junta venda→competência para
-- responder "produção do mês" com a mesma régua do corretor (dia_fechamento).
-- Sem recorte temporal: ano e mês não são dado sensível pós-saída.
create policy "dono do escritorio le" on competencias for select
  using (exists (
    select 1 from membros_escritorio m
    where m.escritorio_id = meu_escritorio_como_dono()
      and m.corretor_id = competencias.corretor_id
  ));

-- ---------- RPCs de membership ----------

create or replace function criar_escritorio(p_nome text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'sem_sessao'; end if;
  if coalesce(trim(p_nome), '') = '' then raise exception 'nome_obrigatorio'; end if;
  if exists (select 1 from escritorios where dono_id = auth.uid())
     or exists (select 1 from membros_escritorio
                where corretor_id = auth.uid() and saiu_em is null) then
    raise exception 'ja_tem_escritorio';
  end if;
  insert into escritorios (nome, dono_id) values (trim(p_nome), auth.uid())
    returning id into v_id;
  -- o dono também é membro, na mesma transação: sem esta linha, meu_escritorio()
  -- não acharia o vínculo do próprio dono
  insert into membros_escritorio (escritorio_id, corretor_id, papel)
    values (v_id, auth.uid(), 'dono');
  return v_id;
end $$;

-- Pública (anon + authenticated): a página do convite mostra o nome do
-- escritório antes do login. Não devolve o e-mail do convidado — enumerar
-- tokens não vaza nada além do nome.
create or replace function ver_convite(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'escritorio', e.nome,
    'status', c.status,
    'valido', c.status = 'pendente' and c.expira_em > now())
  from convites_escritorio c
  join escritorios e on e.id = c.escritorio_id
  where c.token = p_token
$$;

create or replace function aceitar_convite(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_convite convites_escritorio; v_vinculo uuid;
begin
  if auth.uid() is null then raise exception 'sem_sessao'; end if;
  -- busca por token SEM filtrar status: quem já aceitou e clica de novo no
  -- link precisa cair no ramo idempotente abaixo, não em "convite inválido"
  select * into v_convite from convites_escritorio
    where token = p_token for update;
  if not found then raise exception 'convite_invalido'; end if;

  select escritorio_id into v_vinculo from membros_escritorio
    where corretor_id = auth.uid() and saiu_em is null;
  if v_vinculo = v_convite.escritorio_id then
    -- já está no escritório deste convite: não é erro, é o segundo clique
    return jsonb_build_object('ok', true, 'ja_era_membro', true);
  end if;

  if v_convite.status <> 'pendente' or v_convite.expira_em <= now() then
    raise exception 'convite_invalido';
  end if;
  if v_vinculo is not null
     or exists (select 1 from escritorios where dono_id = auth.uid()) then
    raise exception 'ja_tem_escritorio';
  end if;

  insert into membros_escritorio (escritorio_id, corretor_id, papel)
    values (v_convite.escritorio_id, auth.uid(), 'corretor');
  update convites_escritorio set status = 'aceito', aceito_por = auth.uid(),
    aceito_em = now() where id = v_convite.id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function remover_membro(p_membro_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_papel text;
begin
  select m.papel into v_papel from membros_escritorio m
    join escritorios e on e.id = m.escritorio_id
    where m.id = p_membro_id and e.dono_id = auth.uid() and m.saiu_em is null
    for update of m;
  if not found then raise exception 'membro_indisponivel'; end if;
  if v_papel = 'dono' then raise exception 'dono_nao_sai'; end if;
  update membros_escritorio set saiu_em = now() where id = p_membro_id;
end $$;

create or replace function sair_do_escritorio() returns void
language plpgsql security definer set search_path = public as $$
begin
  update membros_escritorio set saiu_em = now()
    where corretor_id = auth.uid() and saiu_em is null and papel = 'corretor';
  if not found then raise exception 'sem_vinculo'; end if;
end $$;

-- ---------- painel do dono ----------
-- security INVOKER de propósito: quem decide o que entra na soma são as
-- policies acima, no mesmo padrão do resumo_agenda. O agregado nasce em SQL
-- porque N corretores × M vendas em JS no navegador não trafega.

create or replace function painel_escritorio(p_ano int, p_mes int) returns jsonb
language plpgsql stable security invoker set search_path = public as $$
declare v_resultado jsonb;
begin
  if meu_escritorio_como_dono() is null then raise exception 'nao_e_dono'; end if;

  with producao as (
    select v.corretor_id, v.administradora, nullif(v.produto, '') as produto,
           v.valor_carta_centavos, coalesce(co.valor_centavos, 0) as comissao_centavos
    from vendas v
    join competencias c on c.id = v.competencia_id and c.ano = p_ano and c.mes = p_mes
    left join comissoes co on co.venda_id = v.id
    where v.status = 'confirmada'
  ),
  -- um corretor pode ter saído e voltado (duas linhas de vínculo): o painel
  -- mostra a pessoa uma vez, com o estado do vínculo mais recente
  nomes as (
    select distinct on (corretor_id) corretor_id, nome, papel, saiu_em
    from membros_do_escritorio()
    order by corretor_id, entrou_em desc
  )
  select jsonb_build_object(
    'total', (select jsonb_build_object(
      'nVendas', count(*),
      'totalCentavos', coalesce(sum(valor_carta_centavos), 0),
      'comissaoCentavos', coalesce(sum(comissao_centavos), 0)) from producao),
    'porCorretor', coalesce((
      select jsonb_agg(linha order by (linha->>'totalCentavos')::bigint desc)
      from (
        select jsonb_build_object(
          'corretorId', n.corretor_id, 'nome', n.nome, 'papel', n.papel,
          'ativo', n.saiu_em is null,
          'nVendas', count(p.corretor_id),
          'totalCentavos', coalesce(sum(p.valor_carta_centavos), 0),
          'comissaoCentavos', coalesce(sum(p.comissao_centavos), 0)) as linha
        from nomes n
        left join producao p on p.corretor_id = n.corretor_id
        group by n.corretor_id, n.nome, n.papel, n.saiu_em
      ) t), '[]'::jsonb),
    'porAdministradora', coalesce((
      select jsonb_agg(linha order by (linha->>'totalCentavos')::bigint desc)
      from (
        select jsonb_build_object('administradora', administradora,
          'nVendas', count(*), 'totalCentavos', sum(valor_carta_centavos)) as linha
        from producao group by administradora
      ) t), '[]'::jsonb),
    'porProduto', coalesce((
      select jsonb_agg(linha order by (linha->>'totalCentavos')::bigint desc)
      from (
        select jsonb_build_object('produto', coalesce(produto, ''),
          'nVendas', count(*), 'totalCentavos', sum(valor_carta_centavos)) as linha
        from producao group by produto
      ) t), '[]'::jsonb)
  ) into v_resultado;
  return v_resultado;
end $$;

-- ---------- grants ----------
-- O Supabase dá ALL a anon/authenticated em tabela nova por default
-- privileges. RLS decide a linha; o grant decide o verbo e a coluna (mesmo
-- padrão da 0014). Sem estes revokes, anon insere em membros_escritorio.

revoke all on escritorios from anon, authenticated;
grant select on escritorios to authenticated;
grant update (nome) on escritorios to authenticated;

revoke all on membros_escritorio from anon, authenticated;
grant select on membros_escritorio to authenticated;

revoke all on convites_escritorio from anon, authenticated;
grant select on convites_escritorio to authenticated;
grant insert (escritorio_id, email) on convites_escritorio to authenticated;
grant update (status) on convites_escritorio to authenticated;

-- funções nascem com execute para public: revogar e liberar só o necessário
revoke execute on function meu_escritorio_como_dono() from anon, public;
revoke execute on function meu_escritorio() from anon, public;
revoke execute on function membros_do_escritorio() from anon, public;
revoke execute on function criar_escritorio(text) from anon, public;
revoke execute on function ver_convite(uuid) from public;
revoke execute on function aceitar_convite(uuid) from anon, public;
revoke execute on function remover_membro(uuid) from anon, public;
revoke execute on function sair_do_escritorio() from anon, public;
revoke execute on function painel_escritorio(int, int) from anon, public;

grant execute on function meu_escritorio_como_dono(), meu_escritorio(),
  membros_do_escritorio(), criar_escritorio(text), aceitar_convite(uuid),
  remover_membro(uuid), sair_do_escritorio(), painel_escritorio(int, int)
  to authenticated;
-- a página do convite roda antes do login
grant execute on function ver_convite(uuid) to anon, authenticated;
