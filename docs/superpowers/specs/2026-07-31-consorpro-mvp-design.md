# ConsorPro MVP — Design Técnico

Data: 2026-07-31
Fonte de produto: PRD v0.1 (`~/Desktop/consorpro-prd/`)
Status: aprovado (seções 1-2 explícitas; demais decisões delegadas)

## 1. Resumo

SaaS single-user para corretor de consórcios substituir a planilha financeira.
MVP: Dashboard, Vendas, Recebimentos, Configuração Financeira. Sem billing
(validação primeiro), sem CRM, sem relatórios.

## 2. Stack

- **Next.js (App Router)** na Vercel — landing `/` em RSC estático; app autenticado client-first
- **Supabase** — Postgres + Auth (email+senha) + RLS
- **TanStack Query** — camada única de dados no app autenticado
  - Reads: supabase browser client (RLS) via `useQuery`
  - Writes: Server Actions → motor → RPC atômica → `invalidateQueries`
- **Tailwind v4 + shadcn/ui**, Inter, Lucide
- **Zod** — validação compartilhada (forms + server actions)
- **Vitest** — unit tests do motor
- Dinheiro: **centavos em `bigint`**, nunca float. Datas de negócio: `date`, TZ America/Sao_Paulo.

## 3. Decisões de domínio (resolvem "Perguntas em Aberto" do PRD)

| Questão | Decisão |
|---|---|
| Faixa por venda ou acumulado? | **Acumulado mensal** por competência |
| Nova faixa atingida meio do mês | **Retroativa à competência inteira** — uma faixa/percentual único por mês |
| Snapshot (RN-004) | **Por competência, não por venda.** Competência aberta usa config ativa (fluida); no fechamento grava `config_snapshot` e congela. Recálculos tardios usam o snapshot |
| Config alterada meio do mês | Recalcula a competência aberta inteira. UI avisa |
| Billing | Fora do MVP |
| Recebimento "Atrasado" | Estado derivado no read (`previsto && data < hoje`), sem cron |

## 4. Modelo de dados

Todas as tabelas com `corretor_id` + RLS (`corretor_id = auth.uid()`). Sem delete físico (RN-037).

```
profiles           1:1 auth.users — nome, telefone
clientes           nome, telefone, documento?, observacoes
config_financeira  1 ativa por corretor (RN-001)
                   faixas jsonb[{min,max,percentual,parcelas}]
                   calendario: dia_fechamento, dia_primeiro_pagamento, periodicidade
                   regras_estorno (texto/config simples no MVP)
competencias       ano, mes, status(aberta|fechada), config_snapshot jsonb?
vendas             cliente_id, valor_carta_centavos, administradora, grupo, cota,
                   data_venda, observacoes, status(rascunho|confirmada|cancelada|
                   estornada|arquivada), motivo_cancelamento?, competencia_id
comissoes          1:1 venda — percentual, faixa_aplicada jsonb, valor_centavos,
                   n_parcelas, status(prevista|parcial|recebida|cancelada|estornada)
recebimentos       comissao_id, numero_parcela, valor_centavos, data_prevista,
                   data_recebimento?, status(previsto|recebido|cancelado|estornado)
```

- Faixas em jsonb: motor lê config como valor único, snapshot é cópia trivial.
  Validação de sobreposição (RN-007) no Zod.
- Competência da venda: derivada de `data_venda` vs `dia_fechamento` (RN-013/014).

## 5. Motor de cálculo

Pacote puro `src/lib/engine/` — zero dependência de framework/DB. Coração do produto.

```ts
calcularCompetencia({ config, vendas, recebimentosExistentes }): ResultadoCalculo
```

Algoritmo:
1. Volume = Σ valor_carta das vendas confirmadas da competência
2. Faixa localizada pelo volume acumulado → percentual + n_parcelas do mês todo
3. Comissão por venda = valor_carta × percentual
4. Parcelas: valor ÷ n_parcelas; datas via calendário (competência → 1º pagamento → periodicidade); resto de centavos absorvido na última parcela
5. Reconciliação: recebimento `recebido` é **intocável**; `previsto` é substituído;
   venda cancelada → previstos cancelam, recebidos ficam (RN-035)

Gatilhos de recálculo (mesma transação):
- criar/editar/cancelar venda → recalcula competência da venda
- editar config → recalcula competência aberta
- marcar recebido → **não** recalcula (update de status; atualiza status da comissão)

Persistência: Server Action valida (Zod) → busca dados → roda motor → chama RPC
Postgres `aplicar_resultado(json)` que grava tudo atomicamente.

Fechamento de competência: lazy — primeira operação após a data de fechamento
fecha a competência anterior (grava snapshot) e abre a nova. Sem cron.

## 6. Rotas

```
/                  landing page pública (RSC estático)
/login /cadastro   Supabase Auth
/app               dashboard — gate: sem config_financeira → redirect onboarding
/app/onboarding    wizard: política → faixas → calendário → ativar (Fluxo 1)
/app/vendas        lista + busca (cliente/grupo/cota/administradora/data/valor)
/app/vendas/nova   form <30s: cliente(autocomplete/criar), valor, administradora,
                   grupo, cota, data, obs
/app/vendas/[id]   detalhe, editar, cancelar(motivo)
/app/recebimentos  lista cronológica, marcar recebido (optimistic)
/app/configuracao  política, faixas, calendário, estorno — aviso de recálculo
/app/perfil        conta, logout
```

## 7. UX/UI

- Mobile-first: bottom nav (Dashboard, Vendas, Recebimentos, Config); desktop: sidebar
- Direção visual Anexo A: interface neutra (branco/cinza/preto), **verde `#059669`
  exclusivo para valores financeiros**, radius 10px, bordas em vez de sombras, Inter 500-700
- Dashboard responde em <10s: quanto vou receber, vendi no mês, previsto/recebido/
  pendente, próximos recebimentos, ticket médio, nº vendas
- Empty states orientativos em toda tela (RN-040)
- Mensagens em linguagem simples, sem termos técnicos (ex: nada de "snapshot")
- Feedback pós-ação: "Comissão calculada", "Recebimento atualizado",
  "Novas regras recalculam o mês atual"
- PWA: manifest + installable; offline fora do MVP

## 8. Erros e validação

- Zod nos dois lados; mensagens de erro: o que houve, por quê, como resolver
- Server Actions retornam `{ok} | {error}` tipado; toast + estado de campo
- Sem config ativa → bloqueio de cadastro de venda com CTA pro onboarding (RN-021)

## 9. Testes

- Vitest no motor: troca de faixa retroativa, arredondamento de centavos,
  cancelamento com recebidos, competência fechada (snapshot), config alterada
  meio do mês, calendário (venda antes/depois do fechamento)
- Zod schemas: sobreposição de faixas, percentual ≤ 0, parcelas = 0
- E2E: fora do MVP

## 10. Fora do MVP (guardado pro roadmap)

CRM, agenda, WhatsApp, leads, IA, multiusuário, integrações, relatórios,
exportações, billing/Stripe, importação de planilha, offline.
