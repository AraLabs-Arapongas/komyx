create or replace function aplicar_resultado(p_competencia_id uuid, p_resultado jsonb)
returns void language plpgsql security invoker as $$
declare
  c jsonb;
  r jsonb;
  v_comissao_id uuid;
begin
  -- upsert comissões
  for c in select * from jsonb_array_elements(p_resultado->'comissoes') loop
    insert into comissoes (corretor_id, venda_id, percentual, faixa_aplicada,
                           valor_centavos, n_parcelas, status, updated_at)
    values (auth.uid(), (c->>'vendaId')::uuid, (c->>'percentual')::numeric,
            c->'faixaAplicada', (c->>'valorCentavos')::bigint,
            (c->>'nParcelas')::int, c->>'status', now())
    on conflict (venda_id) do update
      set percentual = excluded.percentual,
          faixa_aplicada = excluded.faixa_aplicada,
          valor_centavos = excluded.valor_centavos,
          n_parcelas = excluded.n_parcelas,
          status = excluded.status,
          updated_at = now();
  end loop;

  -- remove previstos das comissões desta competência (recebidos ficam intactos)
  delete from recebimentos
  where status = 'previsto'
    and comissao_id in (
      select co.id from comissoes co
      join vendas v on v.id = co.venda_id
      where v.competencia_id = p_competencia_id);

  -- insere novos previstos
  for r in select * from jsonb_array_elements(p_resultado->'recebimentosPrevistos') loop
    select id into v_comissao_id from comissoes where venda_id = (r->>'vendaId')::uuid;
    insert into recebimentos (corretor_id, comissao_id, numero_parcela,
                              valor_centavos, data_prevista, status)
    values (auth.uid(), v_comissao_id, (r->>'numeroParcela')::int,
            (r->>'valorCentavos')::bigint, (r->>'dataPrevista')::date, 'previsto');
  end loop;
end $$;

create or replace function fechar_competencias_vencidas(p_snapshot jsonb, p_hoje date)
returns void language plpgsql security invoker as $$
begin
  update competencias
  set status = 'fechada', config_snapshot = p_snapshot
  where corretor_id = auth.uid()
    and status = 'aberta'
    and make_date(ano, mes, 1) < date_trunc('month', p_hoje)::date;
end $$;
