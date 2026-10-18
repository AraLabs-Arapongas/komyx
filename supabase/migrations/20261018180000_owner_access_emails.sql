-- Passwords are never e-mailed: a buffet created by the admin gets a "create your password" link, and a
-- password set by the admin is temporary (the person creates their own at the next sign-in) and only
-- announced by e-mail.
insert into public.email_templates (key, name, description, subject, title, intro, button, outro) values
  ('welcome_owner', 'Boas-vindas ao dono', 'Quando a Komyx cria um buffet pelo admin. {{quem}} é o primeiro nome do responsável; o botão leva para criar a senha.',
   'Seu acesso ao Komyx · {{buffet}}', 'Bem-vindo ao Komyx',
   'Oi, {{quem}}! O {{buffet}} já está no Komyx. Toque no botão para criar sua senha e entrar.',
   'Criar minha senha', 'O link vale por 1 hora. Se expirar, use "Esqueci minha senha" na tela de entrada.'),
  ('password_set_by_admin', 'Senha provisória pelo suporte', 'Quando o admin redefine a senha de alguém. Não contém a senha: avisa e pede para criar uma nova no próximo acesso.',
   'Sua senha do Komyx foi redefinida', 'Sua senha foi redefinida',
   'Oi, {{quem}}! O suporte da Komyx definiu uma senha provisória para sua conta do {{buffet}}. Ao entrar com ela, você vai criar a sua senha.',
   'Entrar no Komyx', 'Se você não pediu isso, responda este e-mail ou fale com a gente pelo WhatsApp.')
on conflict (key) do nothing;
