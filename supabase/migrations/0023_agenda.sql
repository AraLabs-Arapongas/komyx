-- =========================================================================
-- Agenda de compromissos.
--
-- O produto sabia quanto entra e quando, mas não sabia o que o corretor
-- precisa FAZER para que entre: ligar para o cliente que sumiu, passar no
-- escritório, levar o documento. Isso vivia no WhatsApp e no papel.
--
-- É a agenda de tarefas, não a de recebimentos — que por isso deixou de se
-- chamar Agenda e virou Recebimentos.
-- =========================================================================

create table compromissos (
  id uuid primary key default gen_random_uuid(),
  corretor_id uuid not null references profiles(id),

  -- o compromisso pode não ser sobre ninguém ("passar no cartório"), e o
  -- cliente pode ser apagado sem levar junto a tarefa que existe por conta
  -- própria — daí o set null em vez de cascade
  cliente_id uuid references clientes(id) on delete set null,

  titulo text not null check (length(trim(titulo)) > 0),
  data date not null,
  -- nulo = é do dia, sem hora marcada. "Ligar pro João hoje" não tem hora, e
  -- obrigar um horário faria o corretor inventar um que não vai cumprir
  hora time,
  nota text not null default '',
  -- nulo = pendente. Guarda QUANDO foi concluído, não um booleano: a data é
  -- o que permite dizer "feito ontem" e o booleano não
  concluido_em timestamptz,

  created_at timestamptz not null default now()
);

create index compromissos_do_corretor on compromissos (corretor_id, data);
-- para a ficha do cliente listar os compromissos dele
create index compromissos_do_cliente on compromissos (cliente_id) where cliente_id is not null;
-- o que está em aberto é a pergunta de toda abertura do app
create index compromissos_pendentes on compromissos (corretor_id, data)
  where concluido_em is null;

-- sem `updated_at`: nenhuma tabela deste schema tem gatilho que a mantenha, e
-- coluna que só guarda a data de criação com nome de "última alteração" mente
-- para quem for lê-la um dia

alter table compromissos enable row level security;

-- o dono da linha manda nela, como em todo o resto do app
create policy "own rows" on compromissos for all
  using (corretor_id = auth.uid()) with check (corretor_id = auth.uid());

/*
 * O dono do escritório LÊ a agenda da equipe. Só lê.
 *
 * Mesmo corte temporal das vendas: compromisso com data fora do período do
 * vínculo não aparece. Quem entrou ontem não entrega a agenda do ano passado,
 * e quem sai leva o futuro consigo.
 *
 * Sem policy de update: coordenar não é escrever na agenda dos outros. Se um
 * dia o dono for atribuir tarefa, isso é outra coisa — tem autor, tem
 * responsável, e provavelmente tem recusa.
 */
create policy "dono do escritorio le" on compromissos for select
  using (exists (
    select 1 from membros_escritorio m
    where m.escritorio_id = meu_escritorio_como_dono()
      and m.corretor_id = compromissos.corretor_id
      and compromissos.data >= (m.entrou_em at time zone 'America/Sao_Paulo')::date
      and (m.saiu_em is null
           or compromissos.data < (m.saiu_em at time zone 'America/Sao_Paulo')::date)
  ));

-- o Supabase dá ALL por default a tabela nova: sem isto, anon insere
revoke all on compromissos from anon, authenticated;
grant select, insert, update, delete on compromissos to authenticated;

/*
 * Fora do `registrar_evento` de propósito.
 *
 * A auditoria existe para defender comissão: quando um escritório questiona
 * um valor de quatro meses atrás, o histórico é a prova. Compromisso não é
 * dinheiro — e cada "liguei pro João" no feed de atividade afogaria justamente
 * os eventos que precisam ser encontrados.
 */
