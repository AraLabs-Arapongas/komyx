-- =========================================================================
-- A divisão das parcelas passa a ser em pontos da carta.
--
-- Era fração da comissão, somando 100: uma faixa de 3% em três vezes se
-- escrevia 33,33 / 33,33 / 33,34. Mas o escritório não fala assim — ele diz
-- "pago 1% no mês seguinte, 1% no outro e 1% no terceiro". A conta de cabeça
-- ficava por conta do corretor, todas as vezes, e errá-la é errar o próprio
-- salário.
--
-- Agora as fatias somam a COMISSÃO da faixa: 3% em três vezes é 1, 1 e 1;
-- quem paga menos na frente escreve 0,5 / 1 / 1,5.
--
-- O ENGINE NÃO MUDA. `repartir` sempre tratou estes números como peso,
-- normalizando pela soma — [33.33, 33.33, 33.34] e [1, 1, 1] produzem
-- exatamente as mesmas parcelas. O que muda é a unidade em que se escreve, e
-- a validação que a cobra.
--
-- Por isso `competencias.config_snapshot` fica como está: é o registro do que
-- valeu num mês fechado, os pesos dele continuam corretos, e reescrever
-- histórico para trocar de unidade seria mexer em prova sem ganhar nada.
-- =========================================================================

/*
 * Converte as faixas de uma config para a unidade nova.
 *
 * Divide pela soma REAL das fatias, não por 100: se alguma linha antiga não
 * fechava exatamente em 100 (arredondamento na digitação), a proporção que
 * valia continua valendo — é ela que o engine vinha usando.
 *
 * O resto da divisão vai na última fatia, senão a soma não bate com o
 * percentual e a própria tela acusaria erro numa política que ninguém tocou.
 */
create or replace function pg_temp.reescalar_faixas(p_faixas jsonb) returns jsonb
language plpgsql immutable as $$
declare
  v_saida jsonb := '[]'::jsonb;
  v_faixa jsonb;
  v_dist jsonb;
  v_pct numeric;
  v_soma numeric;
  v_novas numeric[];
  v_total numeric;
  v_item numeric;
  i int;
begin
  for v_faixa in select * from jsonb_array_elements(p_faixas) loop
    v_dist := v_faixa->'distribuicao';

    if v_dist is null or jsonb_typeof(v_dist) <> 'array' or jsonb_array_length(v_dist) = 0 then
      v_saida := v_saida || jsonb_build_array(v_faixa);
      continue;
    end if;

    v_pct := round((v_faixa->>'percentual')::numeric, 2);
    select coalesce(sum(x::numeric), 0) into v_soma from jsonb_array_elements_text(v_dist) x;

    -- soma zero não tem proporção que preservar: volta para divisão igual
    if v_soma = 0 or v_pct <= 0 then
      v_saida := v_saida || jsonb_build_array(jsonb_set(v_faixa, '{distribuicao}', 'null'::jsonb));
      continue;
    end if;

    v_novas := array[]::numeric[];
    for v_item in select x::numeric from jsonb_array_elements_text(v_dist) x loop
      v_novas := v_novas || round(v_item * v_pct / v_soma, 2);
    end loop;

    select coalesce(sum(x), 0) into v_total from unnest(v_novas) x;
    i := array_length(v_novas, 1);
    v_novas[i] := round(v_novas[i] + (v_pct - v_total), 2);

    v_saida := v_saida || jsonb_build_array(
      jsonb_set(v_faixa, '{distribuicao}', to_jsonb(v_novas)));
  end loop;

  return v_saida;
end $$;

update config_financeira
set faixas = pg_temp.reescalar_faixas(faixas)
where faixas::text like '%distribuicao%';
