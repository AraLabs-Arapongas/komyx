# Festeja — SaaS para buffet

Sistema simples para **vender, organizar e realizar festas**: agenda, pré-reservas, clientes, pacotes, orçamentos, convidados, pagamentos básicos, página pública e PWA. Centrado no evento; multiempresa desde o início.

## Stack

- Next.js 16 (App Router, Server Actions, Turbopack) + TypeScript + Tailwind CSS 4
- Supabase (Postgres, Auth, Storage) com Row Level Security por `organization_id`
- Supabase CLI + Docker para desenvolvimento local

## Rodando localmente

Pré-requisitos: Node 20+, pnpm, Docker, Supabase CLI.

```bash
pnpm install
supabase start          # sobe Postgres/Auth/Storage/Studio nas portas 548xx
supabase status -o env  # copie API_URL, PUBLISHABLE_KEY e SECRET_KEY para .env.local
pnpm dev                # http://localhost:3000
```

`.env.local` (veja `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54821
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Studio local: http://127.0.0.1:54823

### Dados de exemplo

`supabase db reset` aplica as migrations e o `supabase/seed.sql`:

| Usuário | Senha | Papel |
| --- | --- | --- |
| dona@festabuffet.test | senha12345 | owner |
| ana@festabuffet.test | senha12345 | staff |

Página pública de exemplo: `/p/festa-cia-buffet`. Link de convidados: `/g/demo-guest-link-julia-0123456789abcdef`.

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

- **Disponibilidade**: trigger impede sobreposição de eventos na mesma empresa/espaço. Confirmados nunca se sobrepõem (exclusion constraint). Pré-reservas bloqueiam só enquanto `expires_at > now()`. Realizados/cancelados/expirados não bloqueiam.
- **Expiração**: `expire_pre_reservations()` roda por pg_cron a cada 5 min e ao abrir Home/Agenda.
- **Conversão sem duplicar**: confirmar muda o mesmo registro de `PRE_RESERVED` para `CONFIRMED`. Aceitar orçamento confirma o evento.
- **Orçamento**: totais calculados por trigger (`subtotal`, desconto em R$ ou %, `total`). Estados: rascunho, enviado, aceito, recusado.
- **Pagamentos**: view `event_financials` soma pagamentos e expõe total, pago, saldo e status (não pago / parcial / pago).
- **Links públicos**: token aleatório de 48 hex, revogável; páginas públicas rodam no servidor com a chave de serviço e só leem o mínimo.
- **Permissões**: `owner` gerencia empresa, equipe, pacotes; `staff` opera clientes, eventos, orçamentos, convidados e pagamentos. Todas as tabelas têm RLS por `organization_id`. `anon` não tem acesso direto.

## Fluxo de migrations

```bash
supabase migration new <nome>   # cria arquivo
supabase db reset               # reaplica tudo + seed
supabase gen types typescript --local > src/lib/database.types.ts
```
