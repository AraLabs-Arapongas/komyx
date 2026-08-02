-- Toda tentativa de criar conta, dando certo ou não.
--
-- Existe por um motivo concreto: o cadastro falhava "às vezes, só no celular"
-- e não havia como saber o porquê depois do fato. O log da função na Vercel é
-- ao vivo e some; sem isto, diagnosticar exige o usuário reproduzindo na hora.
--
-- Guarda o motivo que o Supabase deu e o aparelho de onde veio. Não guarda
-- senha, e não é audit trail de segurança — é instrumento de diagnóstico do
-- funil de entrada, para apagar quando não fizer mais falta.
create table tentativas_cadastro (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ok boolean not null,
  -- código do Supabase quando recusou: user_already_exists, weak_password,
  -- over_email_send_rate_limit... nulo quando deu certo
  erro_codigo text,
  erro_status int,
  -- para separar celular de computador sem ter que perguntar
  aparelho text,
  created_at timestamptz not null default now()
);

create index tentativas_cadastro_data on tentativas_cadastro (created_at desc);

alter table tentativas_cadastro enable row level security;

-- Quem tenta se cadastrar ainda não tem sessão, então a escrita sai como anon.
-- Mesma exposição que a tabela de leads já aceita: dá para inserir linha falsa
-- pela API pública. Para um instrumento de diagnóstico isso é ruído tolerável;
-- se um dia virar dado de decisão, trocar por RPC com verificação.
create policy "qualquer tentativa se registra" on tentativas_cadastro
  for insert to anon, authenticated with check (true);

-- Sem política de select: a lista tem e-mail de quem nem conta tem. Ninguém lê
-- pelo app; sai pelo painel do Supabase, com a chave de serviço.
