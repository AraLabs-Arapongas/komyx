-- Assinatura: quem pode usar o app, e até quando.
--
-- O produto passa a ser pago — R$ 19,90 por mês, com 14 dias de teste sem
-- cartão. O teste começa no cadastro e não depende do Stripe: quem entra hoje
-- usa duas semanas sem nunca ter visto uma tela de pagamento, e só então
-- decide. É por isso que `trial_termina_em` mora aqui e não lá.
--
-- O resto são espelhos do Stripe, escritos só pelo webhook. Nada aqui é fonte
-- da verdade sobre cobrança; serve para responder "libera o acesso?" sem uma
-- chamada de rede a cada carregamento de página.

alter table profiles
  -- quem já tem conta ganha 14 dias a partir de agora: são os testadores, e
  -- cobrar retroativo de quem entrou antes do preço existir seria trapaça
  add column trial_termina_em timestamptz not null default (now() + interval '14 days'),
  add column stripe_customer_id text unique,
  add column stripe_subscription_id text,
  -- o status cru do Stripe: trialing, active, past_due, canceled, unpaid...
  -- nulo enquanto o corretor nunca assinou
  add column assinatura_status text,
  -- fim do período pago atual, para a tela dizer "renova em 12 de agosto"
  add column assinatura_ate timestamptz,
  -- pediu para cancelar mas ainda está no período pago
  add column cancela_no_fim boolean not null default false;

create index profiles_stripe_customer on profiles (stripe_customer_id);

-- A política de profiles é `for all using (id = auth.uid())`, então o corretor
-- pode dar UPDATE na própria linha — e a partir de agora essa linha diz se ele
-- pagou. Sem isto, um PATCH direto no PostgREST trocando assinatura_status
-- para 'active' liberaria o app de graça.
--
-- RLS decide a linha; privilégio de coluna decide o campo. As duas colunas
-- abaixo são as únicas que o app escreve pelo usuário (tela de Conta); o resto
-- só entra pela chave de serviço, no webhook.
revoke update on profiles from authenticated;
grant update (nome, telefone) on profiles to authenticated;

-- Todo evento do Stripe que chegou, e se foi aplicado.
--
-- Serve para duas coisas. Idempotência: o Stripe reentrega o mesmo evento
-- quando a resposta demora, e a chave primária aqui é o id dele — quem já
-- passou não passa de novo. E diagnóstico: quando alguém disser "paguei e não
-- liberou", a resposta está nesta tabela, não no painel do Stripe.
create table eventos_stripe (
  id text primary key,
  tipo text not null,
  -- nulo quando o evento não achou dono (cliente do Stripe sem perfil aqui)
  corretor_id uuid references profiles(id) on delete set null,
  erro text,
  recebido_em timestamptz not null default now()
);

create index eventos_stripe_data on eventos_stripe (recebido_em desc);

alter table eventos_stripe enable row level security;
-- Sem política nenhuma: ninguém lê nem escreve pela API pública. O webhook usa
-- a chave de serviço, que passa por cima de RLS.
