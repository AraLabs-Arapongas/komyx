-- A policy "own rows" criada em 0008 usava `for all`, então o próprio
-- corretor conseguia INSERIR eventos falsos e APAGAR seu histórico de
-- auditoria via PostgREST (INSERT/DELETE liberados por RLS). Um log de
-- auditoria não pode ser editável por quem ele audita.
--
-- A tabela só precisa ser gravável pelo gatilho `registrar_evento`, que é
-- `security definer` e portanto ignora RLS na escrita. Corretores só devem
-- poder ler as próprias linhas.
drop policy if exists "own rows" on eventos;
create policy "select own rows" on eventos for select
  using (corretor_id = auth.uid());
