-- Cadastro de cliente deixa de ser só um nome, sem virar CRM.
alter table clientes add column if not exists email text;
alter table clientes add column if not exists cidade text;

-- Dados que o corretor tem em mãos na hora da venda e hoje ficavam de fora.
alter table vendas add column if not exists numero_contrato text;
alter table vendas add column if not exists tags text[] not null default '{}';

-- Histórico de tudo que mexe em dinheiro. Mesmo com um usuário só, é o que
-- permite responder "por que essa comissão mudou?" meses depois.
create table if not exists eventos (
  id uuid primary key default gen_random_uuid(),
  corretor_id uuid not null references profiles(id),
  entidade text not null,
  entidade_id uuid not null,
  acao text not null check (acao in ('criou', 'alterou', 'removeu')),
  antes jsonb,
  depois jsonb,
  criado_em timestamptz not null default now()
);
create index if not exists eventos_entidade on eventos (corretor_id, entidade, entidade_id, criado_em desc);
create index if not exists eventos_recentes on eventos (corretor_id, criado_em desc);

alter table eventos enable row level security;
drop policy if exists "own rows" on eventos;
create policy "own rows" on eventos for all
  using (corretor_id = auth.uid()) with check (corretor_id = auth.uid());

-- Registrado por gatilho, e não pelo código da aplicação: assim nenhuma
-- alteração escapa do histórico, venha de onde vier.
create or replace function registrar_evento() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_corretor uuid;
  v_acao text;
begin
  if tg_op = 'INSERT' then
    v_corretor := new.corretor_id; v_acao := 'criou';
  elsif tg_op = 'UPDATE' then
    v_corretor := new.corretor_id; v_acao := 'alterou';
  else
    v_corretor := old.corretor_id; v_acao := 'removeu';
  end if;

  -- update que não mudou nada (recálculo que chegou ao mesmo número) não vira linha
  if tg_op = 'UPDATE' and to_jsonb(old) - 'updated_at' = to_jsonb(new) - 'updated_at' then
    return new;
  end if;

  insert into eventos (corretor_id, entidade, entidade_id, acao, antes, depois)
  values (
    v_corretor, tg_table_name,
    case when tg_op = 'DELETE' then old.id else new.id end,
    v_acao,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return case when tg_op = 'DELETE' then old else new end;
end $$;

drop trigger if exists auditoria on vendas;
create trigger auditoria after insert or update or delete on vendas
  for each row execute function registrar_evento();

drop trigger if exists auditoria on comissoes;
create trigger auditoria after insert or update or delete on comissoes
  for each row execute function registrar_evento();

drop trigger if exists auditoria on recebimentos;
create trigger auditoria after insert or update or delete on recebimentos
  for each row execute function registrar_evento();

drop trigger if exists auditoria on config_financeira;
create trigger auditoria after insert or update or delete on config_financeira
  for each row execute function registrar_evento();
