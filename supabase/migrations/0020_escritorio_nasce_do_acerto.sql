-- =========================================================================
-- Escritório deixa de ser self-service.
--
-- Criar era livre e o painel do dono abria inteiro com `assinatura_status`
-- nulo: o status só pintava a tarja "aguardando ativação" e não trancava
-- nada. Na prática, qualquer conta criava um escritório, convidava a equipe e
-- usava o Enterprise sem passar por cobrança nenhuma.
--
-- A alternativa seria trancar o painel depois de criado, e ela é pior: a
-- pessoa cadastra a equipe inteira para encontrar uma porta fechada no fim.
-- Agora o escritório nasce do acerto comercial — a tela do app pede contato,
-- e quem cria é o admin.
--
-- Tirar o botão não bastaria: `criar_escritorio` é RPC do PostgREST, e quem
-- soubesse o nome dela chamaria direto. A porta que importa é esta.
-- =========================================================================

revoke execute on function criar_escritorio(text) from authenticated;

-- ---------- o caminho do admin ----------
/*
 * Cria o escritório para alguém, pelo e-mail.
 *
 * Existe porque `criar_escritorio` deriva o dono de `auth.uid()`, que é nulo
 * quando quem chama é a service_role — sem esta, o admin teria que fazer os
 * dois inserts na mão e lembrar do segundo. Esquecer a linha de membro deixa
 * o escritório sem dono visível: `meu_escritorio()` procura o vínculo, não a
 * coluna `dono_id`.
 *
 * Nasce ativa: se o admin está criando, o acerto já aconteceu.
 */
create or replace function criar_escritorio_para(p_email text, p_nome text, p_meses int default 1)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_dono uuid; v_id uuid;
begin
  select id into v_dono from auth.users where lower(email) = lower(trim(p_email));
  if v_dono is null then raise exception 'conta_nao_encontrada: %', p_email; end if;
  if coalesce(trim(p_nome), '') = '' then raise exception 'nome_obrigatorio'; end if;
  if exists (select 1 from escritorios where dono_id = v_dono)
     or exists (select 1 from membros_escritorio
                where corretor_id = v_dono and saiu_em is null) then
    raise exception 'ja_tem_escritorio';
  end if;

  insert into escritorios (nome, dono_id, assinatura_status, assinatura_ate)
  values (trim(p_nome), v_dono, 'ativa',
          -- três dias de folga sobre o mês pago: a renovação atrasa e ninguém
          -- perde o painel por causa de um boleto que compensou no dia 2
          now() + (p_meses || ' months')::interval + interval '3 days')
  returning id into v_id;

  insert into membros_escritorio (escritorio_id, corretor_id, papel)
  values (v_id, v_dono, 'dono');

  return v_id;
end $$;

-- só a service_role: é função de bastidor, não de produto
revoke execute on function criar_escritorio_para(text, text, int) from anon, authenticated, public;
