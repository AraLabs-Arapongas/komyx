-- Quem chega pela landing e ainda não quer criar conta.
--
-- O cadastro é grátis e leva menos de um minuto, então a maior parte do
-- funil deve ir direto para lá. Esta tabela existe para o corretor que está
-- só olhando: ele deixa o e-mail e a gente volta a falar com ele.
create table leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  -- de onde veio: permite saber qual bloco da página converte
  origem text not null default 'landing',
  created_at timestamptz not null default now()
);

-- o mesmo e-mail não vira dois leads
create unique index leads_email_unico on leads (lower(email));

alter table leads enable row level security;

-- Qualquer visitante pode se inscrever — é uma página pública.
create policy "qualquer um se inscreve" on leads
  for insert to anon, authenticated with check (true);

-- Ninguém lê pelo app. A lista é dado de marketing, não do produto: sai pelo
-- painel do Supabase, com a chave de serviço. Sem política de select, nem o
-- corretor autenticado enxerga os e-mails dos outros.
