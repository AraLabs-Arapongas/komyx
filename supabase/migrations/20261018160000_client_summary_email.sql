-- The client may leave an e-mail on the public quote to get a summary of what they chose (and the app).
alter table public.public_requests add column if not exists email text check (email is null or length(email) <= 200);

insert into public.email_templates (key, name, description, subject, title, intro, button, outro) values
  ('client_summary_request', 'Resumo para o cliente (pedido)', 'Para o cliente que deixou o e-mail ao pedir orçamento. {{quem}} é o primeiro nome. O resumo da festa e o bloco do app entram sozinhos.',
   'Recebemos seu pedido · {{buffet}}', 'Recebemos seu pedido',
   'Oi, {{quem}}! O {{buffet}} recebeu seu pedido de orçamento e responde em breve pelo WhatsApp. Confira o que você escolheu:',
   'Falar com o buffet', 'Você recebe este e-mail porque pediu um orçamento na página do {{buffet}}.'),
  ('client_summary_reservation', 'Resumo para o cliente (reserva)', 'Para o cliente que reservou a data pela página. {{quem}} é o primeiro nome e {{detalhes}} o prazo para pagar o sinal. O resumo e o bloco do app entram sozinhos.',
   'Data reservada · {{buffet}}', 'Sua data está reservada',
   'Oi, {{quem}}! Sua data no {{buffet}} está segura. {{detalhes}} Confira o resumo:',
   'Ver minha reserva', 'Guarde este e-mail: o link da reserva tem o Pix, o orçamento e o contrato.')
on conflict (key) do nothing;
