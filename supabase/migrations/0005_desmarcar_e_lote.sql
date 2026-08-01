-- Desfaz a marcação de um recebimento: um clique errado não pode ser definitivo.
create or replace function desmarcar_recebido(p_recebimento_id uuid)
returns void language plpgsql security invoker as $$
declare v_comissao_id uuid;
begin
  update recebimentos set status = 'previsto', data_recebimento = null
  where id = p_recebimento_id and status = 'recebido'
  returning comissao_id into v_comissao_id;
  if v_comissao_id is null then
    raise exception 'recebimento_indisponivel';
  end if;
  perform 1 from comissoes where id = v_comissao_id for update;
  update comissoes set
    status = case
      when exists (select 1 from recebimentos
                   where comissao_id = v_comissao_id and status = 'recebido')
        then 'parcial'
      else 'prevista' end,
    updated_at = now()
  where id = v_comissao_id;
end $$;

-- Confirma de uma vez todas as parcelas já vencidas: é o que o corretor faz no
-- dia do pagamento, quando o dinheiro cai de uma vez só.
create or replace function marcar_recebidos_vencidos(p_ate date, p_data date)
returns integer language plpgsql security invoker as $$
declare v_ids uuid[];
begin
  select array_agg(id) into v_ids from recebimentos
  where corretor_id = auth.uid() and status = 'previsto' and data_prevista <= p_ate;

  if v_ids is null then return 0; end if;

  update recebimentos set status = 'recebido', data_recebimento = p_data
  where id = any(v_ids);

  update comissoes set
    status = case when exists (
      select 1 from recebimentos r
      where r.comissao_id = comissoes.id and r.status = 'previsto')
      then 'parcial' else 'recebida' end,
    updated_at = now()
  where id in (select distinct comissao_id from recebimentos where id = any(v_ids));

  return array_length(v_ids, 1);
end $$;
