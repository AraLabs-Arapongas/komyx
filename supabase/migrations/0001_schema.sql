create extension if not exists "pgcrypto";

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  telefone text,
  created_at timestamptz not null default now()
);

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, nome) values (new.id, coalesce(new.raw_user_meta_data->>'nome', ''));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function handle_new_user();

create table clientes (
  id uuid primary key default gen_random_uuid(),
  corretor_id uuid not null references profiles(id),
  nome text not null,
  telefone text,
  documento text,
  observacoes text,
  created_at timestamptz not null default now()
);

create table config_financeira (
  id uuid primary key default gen_random_uuid(),
  corretor_id uuid not null references profiles(id),
  nome_politica text not null default 'Política padrão',
  faixas jsonb not null,                -- [{min,max,percentual,parcelas}] centavos/pontos percentuais
  dia_fechamento int not null check (dia_fechamento between 1 and 31),
  dia_primeiro_pagamento int not null check (dia_primeiro_pagamento between 1 and 31),
  regras_estorno text,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index uma_config_ativa on config_financeira (corretor_id) where ativa;

create table competencias (
  id uuid primary key default gen_random_uuid(),
  corretor_id uuid not null references profiles(id),
  ano int not null,
  mes int not null check (mes between 1 and 12),
  status text not null default 'aberta' check (status in ('aberta','fechada')),
  config_snapshot jsonb,
  unique (corretor_id, ano, mes)
);

create table vendas (
  id uuid primary key default gen_random_uuid(),
  corretor_id uuid not null references profiles(id),
  cliente_id uuid not null references clientes(id),
  competencia_id uuid not null references competencias(id),
  valor_carta_centavos bigint not null check (valor_carta_centavos > 0),
  administradora text not null,
  grupo text not null,
  cota text not null,
  data_venda date not null,
  observacoes text,
  status text not null default 'confirmada'
    check (status in ('rascunho','confirmada','cancelada','estornada','arquivada')),
  motivo_cancelamento text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table comissoes (
  id uuid primary key default gen_random_uuid(),
  corretor_id uuid not null references profiles(id),
  venda_id uuid not null unique references vendas(id),
  percentual numeric not null,
  faixa_aplicada jsonb not null,
  valor_centavos bigint not null,
  n_parcelas int not null,
  status text not null default 'prevista'
    check (status in ('prevista','parcial','recebida','cancelada','estornada')),
  updated_at timestamptz not null default now()
);

create table recebimentos (
  id uuid primary key default gen_random_uuid(),
  corretor_id uuid not null references profiles(id),
  comissao_id uuid not null references comissoes(id),
  numero_parcela int not null,
  valor_centavos bigint not null,
  data_prevista date not null,
  data_recebimento date,
  status text not null default 'previsto'
    check (status in ('previsto','recebido','cancelado','estornado'))
);
create index recebimentos_comissao on recebimentos (comissao_id);
create index vendas_competencia on vendas (competencia_id);
