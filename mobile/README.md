# Festeja · app (Expo / React Native)

App para **dona e equipe do buffet** (login) e para **clientes** (sem conta). Fala direto com o mesmo Supabase do Festeja web; as policies RLS por organização protegem os dados e o lado do cliente usa só funções `security definer` por token.

## Rodar

```bash
cd mobile
cp .env.example .env        # ajuste o IP da sua máquina na rede (ipconfig getifaddr en0)
npm install
npx expo start              # tecle i (simulador iOS), a (Android) ou leia o QR no Expo Go
```

- Supabase local precisa estar de pé (`supabase start` na raiz). A chave publishable é a mesma do `.env.local` da raiz.
- No celular físico, o IP em `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_WEB_URL` tem que ser o IP LAN do Mac (não `localhost`).
- Tela "Entrar" única: e-mail → senha (buffet); celular → código por SMS (cliente). Contas de teste (só em dev): dona@festabuffet.test / ana@festabuffet.test · senha `senha12345`; clientes 11999990002 (Roberto) e 11999990001 (Carla) · código `123456` (test_otp do Supabase local).
- Deep links: `festeja://r/<token>` abre a reserva, `festeja://g/<token>` abre o convite.

## O que tem

**Buffet**
- Início: resumo do dia, ações urgentes (confirmar / liberar data / WhatsApp), novas solicitações com resposta no WhatsApp, hoje, próximos 7 dias, a receber.
- Agenda: lista por mês, cores por status.
- Evento: status e ações, cliente (WhatsApp, ligar, enviar página da reserva), parcelas com status e botão **Recebida**, recebimentos, convidados com check-in, pedidos extras, links para a web (orçamento, contrato, portaria).
- Solicitações, Notificações, Menu (plano, fatura, página pública, sair).

**Cliente**
- Minhas festas: após o código SMS, lista todas as festas do número em qualquer buffet. Reserva: status, prazo do sinal, **Pix com QR e copia-e-cola**, orçamento, parcelas pagas/em aberto, contrato (aceite na web), link permanente. Links `/r/` e `/g/` colados na tela Entrar abrem direto.
- Convite: imagem/título/mensagem e confirmação de presença.

## Estrutura

```
app/                 rotas (Expo Router)
  entrar              e-mail+senha (buffet) ou celular+SMS (cliente)
  (app)/(tabs)/      home, agenda, solicitacoes, menu
  (app)/eventos/[id] detalhe do evento
  (app)/notificacoes
  cliente/           index (minhas festas), reserva/[token], convite/[token]
  r/[token], g/[token]   redirecionam para as telas do cliente (deep link)
src/lib/             supabase, auth, format, labels, pix, installments, queries, client
src/ui/              theme, components
```

Funções SQL usadas pelo cliente: `my_reservations` (telefone autenticado), `reservation_by_token`, `guest_link`, `confirm_guest`. SMS: Supabase phone auth + hook `send_sms` → `src/app/api/auth/send-sms` → Comtele (`SMS_PROVIDER`, `COMTELE_API_KEY` no `.env.local` da raiz).
