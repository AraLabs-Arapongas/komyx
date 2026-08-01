-- Desistência do cliente depois da venda fechada.
--
-- Difere do cancelamento: aqui a venda existiu e gerou comissão, e o escritório
-- pode cobrar de volta o que já pagou. Quem decide isso é o corretor no momento
-- do estorno, porque cada escritório trata de um jeito.
--
-- Parcelas previstas sempre caem. As já recebidas viram 'estornado' apenas
-- quando o escritório for descontar — nesse caso deixam de contar como dinheiro
-- que entrou, sem sumir do histórico.
create or replace function estornar_venda(
  p_venda_id uuid,
  p_motivo text,
  p_cobrar_recebido boolean
)
returns void language plpgsql security invoker as $$
declare v_comissao_id uuid;
begin
  update vendas set status = 'estornada', motivo_cancelamento = p_motivo, updated_at = now()
  where id = p_venda_id and status = 'confirmada';
  if not found then
    raise exception 'venda_indisponivel';
  end if;

  select id into v_comissao_id from comissoes where venda_id = p_venda_id;
  if v_comissao_id is null then return; end if;

  update recebimentos set status = 'cancelado'
  where comissao_id = v_comissao_id and status = 'previsto';

  if p_cobrar_recebido then
    update recebimentos set status = 'estornado'
    where comissao_id = v_comissao_id and status = 'recebido';
  end if;

  update comissoes set status = 'estornada', updated_at = now() where id = v_comissao_id;
end $$;
