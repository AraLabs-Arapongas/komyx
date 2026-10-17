-- Komyx's own to-do list, shown in /admin/pendencias (replaces docs/TODO.md). Platform admins only:
-- RLS on with no policies, read and written by the service role after requireAdmin().
create table public.platform_todos (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('voce', 'app', 'produto')),
  title text not null check (length(trim(title)) > 0),
  sort_order int not null default 0,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.platform_todos enable row level security;
revoke all on public.platform_todos from anon, authenticated;
grant select, insert, update, delete on public.platform_todos to service_role;

insert into public.platform_todos (section, title, sort_order, done_at) values
  ('voce', 'Definir a senha de apple@komyx.com.br (Buffet Revisão) em www.komyx.com.br/esqueci-senha', 1, null),
  ('voce', 'Escolher o provedor de cobrança dos planos (Asaas, Mercado Pago, Stripe…)', 2, null),
  ('app', 'Instalar EAS Update (expo-updates), para mudanças só de JS irem sem revisão', 1, null),
  ('app', 'Levar na próxima versão: Aprovado/Recusado + resposta do buffet, prévia do valor ao pedir mais pessoas, app do dono aprovando pelo servidor, idade pelo nascimento do pedido, validação do WhatsApp, textos "Recebi o sinal · confirmar" / "Confirmar sem sinal"', 2, null),
  ('app', 'App Review: dono apple@komyx.com.br + senha; cliente 11900000010, código 123456 (válido até 17/10/2027)', 3, null),
  ('produto', 'Início se atualiza sozinho com pedidos novos (o sino, que já consulta a cada 30 s, atualiza a página; e atualiza ao voltar para a aba)', 1, null),
  ('produto', 'Início mais curto: no máximo 3 pedidos em uma linha + "Ver todas"; ordem: urgente, festa de hoje, pedidos, próximos 7 dias', 2, null),
  ('produto', 'Tema no orçamento público: tocar de novo não desmarca ("Sem tema" para tirar)', 3, null),
  ('produto', 'Cobrança dos planos (depois de escolher o provedor)', 4, null),
  ('produto', 'Conciliação do Pix (provedor com API)', 5, null),
  ('produto', 'Reenvio de e-mail de aviso que falhar', 6, null),
  ('produto', 'Endereço inventado sem login mostra /login em vez da 404', 7, null),
  ('produto', 'Hero no celular: nos estilos Bolha/Colagem/Confete a foto fica abaixo do texto (decidir se sobe)', 8, null),
  ('produto', 'Aviso por e-mail de pedido testado em produção; valor em R$ 4.200,00 e origem com rótulo', 0, now()),
  ('produto', 'Select próprio nas páginas públicas e máscara (11) 99999-9999 nos campos de WhatsApp', 0, now()),
  ('produto', 'WhatsApp validado (DDD existente, celular 9 + 8 dígitos ou fixo)', 0, now()),
  ('produto', 'Orçamento público envia o cardápio; resumo completo na revisão e depois de enviar; botões bloqueados durante o envio', 0, now()),
  ('produto', 'Novo orçamento: idade pelo nascimento; ficha do cliente volta para a festa', 0, now());
