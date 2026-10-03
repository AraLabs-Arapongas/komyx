# Komyx — SaaS para buffet

Sistema simples para **vender, organizar e realizar festas**: agenda, reservas, clientes, pacotes (adultos/crianças), orçamentos com plano de pagamento, contrato automático em PDF, convite personalizável, portaria com check-in, aniversariantes, página pública com orçamento self-service e PWA. Centrado no evento; multiempresa desde o início.

## Stack

- Next.js 16 (App Router, Server Actions, Turbopack) + TypeScript + Tailwind CSS 4
- Supabase (Postgres, Auth, Storage) com Row Level Security por `organization_id`
- Supabase CLI + Docker para desenvolvimento local

## Rodando localmente

Pré-requisitos: Node 20+, pnpm, Docker, Supabase CLI.

```bash
pnpm install
# Banco: só produção (projeto ggvkgxxadvhekmvccceu). Não há Supabase local.
# Migrações: supabase db push (linkado ao projeto). Seed: supabase/seed.sql via SQL editor/MCP.
pnpm dev                # http://localhost:3000
```

`.env.local` (veja `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://ggvkgxxadvhekmvccceu.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Studio local: http://127.0.0.1:54823

### Dados de exemplo

`supabase db reset` aplica as migrations e o `supabase/seed.sql`:

| Usuário | Senha | Papel |
| --- | --- | --- |
| dona@festabuffet.test | senha12345 | owner (Festa & Cia, premium) |
| ana@festabuffet.test | senha12345 | staff |
| admin@komyx.test | senha12345 | admin da plataforma (`/admin`) |
| joao@alegriakids.test | senha12345 | owner de outro buffet (plano básico) |

Fluxos detalhados (dona, cliente, admin): [docs/FLUXOS.md](docs/FLUXOS.md).

Página pública de exemplo: `/p/festa-cia-buffet` (orçamento self-service em `/p/festa-cia-buffet/orcamento?src=instagram`). Link de convidados: `/g/demo-guest-link-julia-0123456789abcdef`.

## Fluxos além do MVP original

- **Orçamento**: aba `/orcamentos`, PDF (`/eventos/[id]/orcamento/pdf`), link público `/q/[token]` (+ `/pdf`). Pacotes têm adultos/crianças inclusos e preço por extra; o orçamento recalcula linhas de pacote/extras a partir dos participantes.
- **Plano de pagamento**: parcelas por % (no aceite, X dias antes da festa ou data fixa). Padrão por buffet em Configurações; cada orçamento pode ajustar. Valores recalculam por trigger.
- **Contrato**: gerado do modelo editável do buffet com `{{placeholders}}` (dados do buffet, cliente, evento, itens, plano). Versões numeradas, PDF (`/eventos/[id]/contrato/pdf`), link público `/c/[token]` com aceite (nome + data/hora; não é assinatura certificada).
- **Convite**: cliente edita imagem e texto em `/i/[token]`; convidados veem o convite e confirmam (adultos/crianças) em `/g/[token]`.
- **Portaria**: `/d/[token]` marca chegadas por nome ou quantidade, adiciona convidado que chegou sem confirmar e registra pedidos extras (somam ao saldo).
- **Aniversariantes**: data de nascimento do aniversariante vira lista em `/aniversariantes` com mensagem de promoção pronta no WhatsApp.
- **Origem do lead**: `?src=instagram` no link da bio (ou campo no formulário) é gravado na solicitação e no cliente.
- **Self-service**: `/p/[slug]/orcamento` monta pacote + pessoas + adicionais com total ao vivo; ao converter em reserva o orçamento é criado automaticamente.

## Estrutura

```
supabase/migrations/   schema, triggers, RLS, view financeira
supabase/seed.sql      dados locais
src/app/(auth)         login / cadastro
src/app/(app)          área autenticada (home, agenda, eventos, clientes, pacotes, configurações, solicitações)
src/app/p/[slug]       página pública do buffet + formulário de interesse
src/app/g/[token]      confirmação pública de convidados
src/app/q/[token]      orçamento público
src/lib/actions        server actions (zod + supabase)
src/lib/supabase       clients (server, browser, admin) e proxy de sessão
```

## Regras de negócio (no banco)

- **Disponibilidade**: trigger impede sobreposição de eventos na mesma empresa/espaço. Confirmados nunca se sobrepõem (exclusion constraint). Reservas bloqueiam só enquanto `expires_at > now()`. Realizados/cancelados/expirados não bloqueiam.
- **Expiração**: `expire_pre_reservations()` roda por pg_cron a cada 5 min e ao abrir Home/Agenda.
- **Conversão sem duplicar**: confirmar muda o mesmo registro de `PRE_RESERVED` para `CONFIRMED`. Aceitar orçamento confirma o evento.
- **Orçamento**: totais calculados por trigger (`subtotal`, desconto em R$ ou %, `total`). Estados: rascunho, enviado, aceito, recusado.
- **Pagamentos**: view `event_financials` soma pagamentos e expõe total, pago, saldo e status (não pago / parcial / pago).
- **Links públicos**: token aleatório de 48 hex, revogável; páginas públicas rodam no servidor com a chave de serviço e só leem o mínimo.
- **Permissões**: `owner` gerencia empresa, equipe, pacotes; `staff` opera clientes, eventos, orçamentos, convidados e pagamentos. Todas as tabelas têm RLS por `organization_id`. `anon` não tem acesso direto.

## Testes end-to-end (Playwright)

Cobrem os três fluxos de `docs/FLUXOS.md` contra o dev server e o Supabase local. Cada spec apaga o que cria (service role) no `afterAll`.

```bash
pnpm test:e2e        # roda tudo (usa o dev server se já estiver no ar)
pnpm test:e2e:ui     # modo interativo
```

| Spec | Cobre |
| --- | --- |
| `tests/e2e/owner.spec.ts` | dona: reserva com pacote/extras → orçamento (adicional, enviado, aceito, PDF) → contrato preenchido → pagamento e saldo → convidado e link RSVP; staff bloqueado em Configurações |
| `tests/e2e/client.spec.ts` | cliente: página pública, wizard de 5 passos com calendário, reserva autônoma (Pix/QR/código), página `/r/`, RSVP + `.ics`, aceite de contrato + PDF |
| `tests/e2e/admin.spec.ts` | admin: dono comum bloqueado; cria buffet + dono, suspende (404 público, `/suspenso`), reativa, checklist do dono, slug travado |

## Vídeos de demonstração (legendados)

Gravação automática de cada fluxo com legenda na tela (Playwright + overlay). Saída em `videos/` (`.webm` e `.mp4`, ignorados pelo git).

```bash
pnpm demo:videos   # 01-dona-do-buffet, 02-cliente, 03-admin-komyx
```

Specs em `tests/demo/*.demo.ts`; os dados criados são apagados ao fim de cada gravação.

## Fluxo de migrations

```bash
supabase migration new <nome>   # cria arquivo
supabase db reset               # reaplica tudo + seed
supabase gen types typescript --local > src/lib/database.types.ts
```

## Login do cliente por SMS

Clientes entram no app com o celular: o Supabase gera o código e chama o hook `send_sms` (rota `/api/auth/send-sms`), que envia pela Comtele. Variáveis em `.env.local`: `SMS_PROVIDER` (`comtele` ou `log`), `COMTELE_API_KEY`, `COMTELE_ROUTE`, `SEND_SMS_HOOK_SECRET` (igual ao `[auth.hook.send_sms].secrets` do `supabase/config.toml`). Em dev os telefones do seed usam o código fixo `123456` (`[auth.sms.test_otp]`), sem envio.

## App mobile (Expo)

Em `mobile/` há o app React Native para dona/equipe (login) e clientes (sem conta). Veja [mobile/README.md](mobile/README.md). Usa o mesmo Supabase; o cliente entra com o celular (código por SMS via Comtele, hook `send_sms` do Supabase) e o lado cliente passa por funções `security definer` (`my_reservations`, `reservation_by_token`, `guest_link`, `confirm_guest`).
