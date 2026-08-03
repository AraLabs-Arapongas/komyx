-- =========================================================================
-- O corretor passa a enxergar as metas — a dele e a da casa.
--
-- Quem entra por convite não configura comissão: a política é do escritório.
-- Sobrava para ele uma tela de ajustes que ele não pode ajustar. No lugar
-- dela entram os dois números que o escritório definiu e que dizem respeito
-- ao mês dele.
--
-- A meta da casa é do time inteiro, então aparece com o realizado do time.
-- Não é vazamento novo: `volume_do_escritorio` já devolve esse agregado ao
-- membro desde a fase 4, porque a faixa de comissão dele depende dele.
-- =========================================================================

-- ---------- metas_vigentes deixa de responder a estranhos ----------
/*
 * `security definer` sem dono é porta aberta: a função roda como o criador,
 * recebe o escritório por parâmetro e não perguntava quem estava chamando.
 * Qualquer conta autenticada que soubesse (ou adivinhasse) um uuid lia as
 * metas de um escritório alheio.
 *
 * O dono passa pelo mesmo filtro: `criar_escritorio` insere a linha de membro
 * dele com papel 'dono', então `painel_do_dono` continua funcionando.
 */
create or replace function metas_vigentes(p_escritorio uuid, p_ano int, p_mes int)
returns table (corretor_id uuid, valor_centavos bigint, vigente_de date)
language sql stable security definer set search_path = public as $$
  select distinct on (m.corretor_id) m.corretor_id, m.valor_centavos, m.vigente_de
  from metas_escritorio m
  where m.escritorio_id = p_escritorio
    and m.vigente_de <= make_date(p_ano, p_mes, 1)
    and exists (
      select 1 from membros_escritorio v
      where v.escritorio_id = p_escritorio
        and v.corretor_id = auth.uid()
        and v.saiu_em is null
    )
  order by m.corretor_id, m.vigente_de desc
$$;

-- ---------- o que o membro vê ----------
/*
 * As duas metas do mês e os dois realizados, numa chamada.
 *
 * Definer porque a meta da casa tem `corretor_id` nulo e a policy do membro é
 * `corretor_id = auth.uid()` — ele nunca a alcançaria lendo a tabela. O que
 * sai daqui é sempre agregado: valores de meta e somas, nunca a venda de um
 * colega.
 *
 * Devolve nulo para quem não está em escritório nenhum, e a tela não desenha.
 */
create or replace function minhas_metas(p_ano int, p_mes int)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_escritorio uuid;
  v_nome text;
  v_ref date := make_date(p_ano, p_mes, 1);
  v_resultado jsonb;
begin
  select m.escritorio_id, e.nome into v_escritorio, v_nome
  from membros_escritorio m
  join escritorios e on e.id = m.escritorio_id
  where m.corretor_id = auth.uid() and m.saiu_em is null;

  if v_escritorio is null then return null; end if;

  with metas as (
    -- a última salva até este mês, para cada escopo. `distinct on` trata o
    -- nulo (a meta da casa) como um grupo próprio, que é o que se quer
    select distinct on (m.corretor_id) m.corretor_id, m.valor_centavos, m.vigente_de
    from metas_escritorio m
    where m.escritorio_id = v_escritorio
      and m.vigente_de <= v_ref
      and (m.corretor_id is null or m.corretor_id = auth.uid())
    order by m.corretor_id, m.vigente_de desc
  ),
  equipe as (
    -- mesmo recorte do painel do dono: a venda só conta no período do vínculo
    select v.corretor_id, v.valor_carta_centavos
    from membros_escritorio m
    join vendas v on v.corretor_id = m.corretor_id
    join competencias c on c.id = v.competencia_id and c.ano = p_ano and c.mes = p_mes
    where m.escritorio_id = v_escritorio
      and m.saiu_em is null
      and v.status = 'confirmada'
      and v.data_venda >= (m.entrou_em at time zone 'America/Sao_Paulo')::date
  )
  select jsonb_build_object(
    'escritorio', v_nome,
    'minhaMetaCentavos', (select valor_centavos from metas where corretor_id = auth.uid()),
    'minhaVigenteDe', (select vigente_de from metas where corretor_id = auth.uid()),
    'metaCasaCentavos', (select valor_centavos from metas where corretor_id is null),
    'metaCasaVigenteDe', (select vigente_de from metas where corretor_id is null),
    'meuTotalCentavos', (select coalesce(sum(valor_carta_centavos), 0)
      from equipe where corretor_id = auth.uid()),
    'totalEscritorioCentavos', (select coalesce(sum(valor_carta_centavos), 0) from equipe)
  ) into v_resultado;

  return v_resultado;
end $$;

revoke execute on function minhas_metas(int, int) from anon, public;
grant execute on function minhas_metas(int, int) to authenticated;
