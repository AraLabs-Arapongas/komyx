-- =========================================================================
-- O Enterprise sai do produto.
--
-- Decisão de negócio: o módulo de escritórios não vai adiante. Some inteiro —
-- tabelas, funções, políticas e as colunas que ele plantou em tabelas que
-- continuam vivas. Não há cliente pagante nem escritório real; o único dado
-- afetado é o de demonstração.
--
-- O QUE FICA, e por quê:
--
--   `compromissos` — a agenda é do corretor e existe sozinha. Só perde a
--   policy que deixava um dono ler a agenda da equipe.
--
--   A distribuição das parcelas em pontos da carta (0022). Não é do
--   Enterprise: é a unidade em que o escritório do corretor enuncia a regra
--   ("1% por mês"), e a conversão já rodou. Voltar atrás quebraria a leitura
--   de quem tem parcelas desiguais.
--
--   A correção de arredondamento do `repartir`, que era bug do engine e
--   atingia o corretor sozinho.
-- =========================================================================

-- ---------- as policies que davam visão de equipe ----------
drop policy if exists "dono do escritorio le" on vendas;
drop policy if exists "dono do escritorio le" on comissoes;
drop policy if exists "dono do escritorio le" on competencias;
drop policy if exists "dono do escritorio le" on compromissos;
drop policy if exists "dono gerencia politicas" on config_financeira;

-- o gatilho do limite de vagas some junto com a tabela dele, logo abaixo

-- ---------- as tabelas ----------
/*
 * ANTES das funções, e não depois.
 *
 * As policies destas tabelas chamam `meu_escritorio_como_dono()`: dropar a
 * função primeiro esbarra na dependência e aborta a migration no meio. Some a
 * tabela, somem as policies dela, e a função fica livre.
 */
/*
 * As quatro num comando só, com cascade: as policies se cruzam — a de
 * `escritorios` lê `membros_escritorio` e vice-versa —, então não existe
 * ordem em que uma caia sozinha. O cascade aqui alcança as policies dessas
 * tabelas e a FK que `config_financeira` mantinha para elas; a coluna que a
 * sustentava sai logo abaixo.
 */
drop table if exists metas_escritorio, convites_escritorio, membros_escritorio, escritorios cascade;

-- ---------- funções ----------
/*
 * `config_efetiva` cai junto: ela existia para resolver a disputa entre a
 * política do escritório e a do corretor. Sem escritório não há disputa — a
 * config volta a ser uma linha só, lida direto da tabela pela policy "own
 * rows". Manter a função seria manter uma indireção que não decide nada.
 */
drop function if exists config_efetiva();
drop function if exists volume_do_escritorio(int, int);
drop function if exists metas_vigentes(uuid, int, int);
drop function if exists minhas_metas(int, int);
drop function if exists vagas_ocupadas(uuid);
drop function if exists convite_cabe_no_plano();
drop function if exists painel_do_dono(int, int, int);
drop function if exists painel_escritorio(int, int);
drop function if exists historico_escritorio(int);
drop function if exists membros_do_escritorio();
drop function if exists criar_escritorio(text);
drop function if exists criar_escritorio_para(text, text, int, int);
drop function if exists ver_convite(uuid);
drop function if exists aceitar_convite(uuid);
drop function if exists remover_membro(uuid);
drop function if exists sair_do_escritorio();
drop function if exists meu_escritorio();
drop function if exists meu_escritorio_como_dono();

-- ---------- as colunas plantadas em tabelas que ficam ----------
alter table competencias
  drop column if exists config_aplicada,
  drop column if exists volume_externo_aplicado;

/*
 * config_financeira volta a ter um dono só.
 *
 * A ordem importa: o check `config_um_dono` fala das três colunas, então sai
 * antes delas. E `corretor_id` só pode voltar a ser NOT NULL depois que as
 * linhas de escritório — as únicas com ele nulo — deixarem de existir.
 */
alter table config_financeira drop constraint if exists config_um_dono;
drop index if exists uma_config_geral_ativa;
drop index if exists uma_config_especifica_ativa;
delete from config_financeira where corretor_id is null;
alter table config_financeira
  drop column if exists escritorio_id,
  drop column if exists aplica_a,
  drop column if exists faixa_por_escritorio;
alter table config_financeira alter column corretor_id set not null;
