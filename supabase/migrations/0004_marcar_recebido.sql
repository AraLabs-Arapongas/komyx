create or replace function marcar_recebido(p_recebimento_id uuid, p_data date)
returns void language plpgsql security invoker as $$
declare v_comissao_id uuid;
begin
  update recebimentos set status = 'recebido', data_recebimento = p_data
  where id = p_recebimento_id and status = 'previsto'
  returning comissao_id into v_comissao_id;
  if v_comissao_id is null then
    raise exception 'recebimento_indisponivel';
  end if;
  update comissoes set
    status = case when exists (
      select 1 from recebimentos where comissao_id = v_comissao_id and status = 'previsto')
      then 'parcial' else 'recebida' end,
    updated_at = now()
  where id = v_comissao_id;
end $$;
