# Assinatura da Komyx — fluxo combinado (2026-10-18)

Decisões tomadas com o Thiago. Este documento é a fonte para implementar; o que não estiver aqui é decisão do implementador, marcada no código com um comentário.

## Planos (o dono escolhe em Minha conta)

| Plano | Valor | Ciclo Asaas |
|---|---|---|
| Mensal | R$ 149 todo mês | MONTHLY |
| 3 meses | R$ 402 de uma vez | QUARTERLY |
| 6 meses | R$ 714 de uma vez | SEMIANNUALLY |
| 12 meses | R$ 1.188 de uma vez | YEARLY |

Valores vêm de `BILLING_PERIODS` em `src/lib/billing.ts` (mesmos da home). `organization_billing.monthly_price` continua valendo como preço especial negociado pelo admin (só para o mensal).

Forma de pagamento: o dono escolhe Pix, boleto ou cartão na página do Asaas (`billingType: UNDEFINED`). Nada a mudar.

## 1. Teste grátis (30 dias)

- Começa no cadastro (já existe: `organization_billing.status = 'trial'`, `due_at = fim do teste`).
- Durante o teste, se faltar **CNPJ/CPF** ou **WhatsApp** do buffet, um banner no app do dono: "Complete CNPJ/CPF e WhatsApp do buffet para continuar usando depois do teste" com link para Configurações › Empresa.
- Assim que os dois estiverem preenchidos (ao salvar Configurações › Empresa), a **cobrança automática liga sozinha** (`enableAutoBilling`, plano escolhido ou mensal). Primeira cobrança vence no último dia do teste.
- Rotina diária: buffets em teste que já têm os dados e ainda não têm assinatura → liga (rede de segurança).
- Se o teste acabar sem os dados: o atraso conta como fatura vencida (item 4), com o banner pedindo os dados.

## 2. Escolher e trocar de plano (Minha conta)

- Cartão "Seu plano" com os 4 planos e o atual marcado; botão "Assinar agora" para quem quer assinar antes do fim do teste.
- **Troca vale na próxima renovação**: o que já foi pago segue até o fim; o plano novo começa no dia seguinte. Até lá aparece "A partir de DD/MM: plano X" com "Desfazer".
- Implementação: guardar `pending_period` em `organization_billing`; na renovação (ou ao trocar, atualizando a assinatura no Asaas com novo `cycle`/`value` e `nextDueDate` = fim do período pago) aplicar. Sem reembolso nem diferença.
- Sem "começar agora" com crédito por enquanto.

## 3. Avisos de atraso

- Fatura vencida e não paga: faixa no app do dono + e-mail nos dias **1, 5 e 9** de atraso:
  - dia 1 e 5 (amarelo): "Sua mensalidade venceu em DD/MM. Pague até DD/MM para não pausar o acesso."
  - dia 9 (vermelho): "Amanhã seu acesso será pausado."
- Todo aviso termina com: "Precisa de ajuda? Fale com a gente pelo WhatsApp ou contato@komyx.com.br" (WhatsApp = `SUPPORT_WHATSAPP`).
- E-mails editáveis em Admin › E-mails (novas chaves de template). Não mandar o mesmo aviso duas vezes (registrar o envio).

## 4. Suspensão no dia 10

- Rotina diária: fatura aberta vencida há **10 dias** → buffet fica em **acesso pausado** (marcar em `organization_billing`, não confundir com a suspensão manual do admin em `organizations.status`).
- **Página pública continua no ar** e recebe pedidos de orçamento. **Reserva online com Pix fica pausada** enquanto o acesso estiver pausado (o cliente vê só o pedido de orçamento).
- E-mails de "novo pedido" continuam saindo; o link leva à tela de acesso pausado.
- O app do dono vira a tela **"Seu acesso está pausado"**:
  - pedidos que chegaram, pela metade (nome cortado "Ana S•••", data, pessoas, valor) e o total em reais esperando resposta;
  - próximas festas (só leitura: data, horário, nome, convidados) — compromisso com o cliente dele;
  - pagamento na própria tela (link do Asaas da fatura em aberto, e o Pix se houver);
  - contato de ajuda.
- **Volta sozinho** quando o webhook do Asaas confirma o pagamento (tira o "pausado").
- Buffets de demonstração nunca são cobrados nem pausados.

## 5. Cancelamento (Minha conta › Cancelar assinatura, já existe a base)

- **Até 7 dias depois de um pagamento**: devolve aquele pagamento inteiro; acesso termina no cancelamento.
- **Mensal**: sem reembolso; usa até o fim do mês pago.
- **3, 6 ou 12 meses**: o dono escolhe na tela:
  - usar até o fim do período, sem reembolso; ou
  - reembolso = **pago − (meses usados × R$ 149)**, mês começado conta como usado, nunca negativo; acesso até o fim do último mês contado.
- Exemplo na tela: "Você está no 5º mês. Se cancelar agora, devolvemos R$ 443,00 e você usa o Komyx até 07/03. Ou continue até 07/10/2027 sem reembolso."
- Estorno pelo Asaas (`POST /payments/{id}/refund` com `value`); se não der (boleto), o admin vê "Reembolsar R$ X por Pix" em Admin › Cobrança com o valor já calculado. Tudo na Auditoria.
- Cancelar desliga a assinatura no Asaas (`disableAutoBilling`).

## 6. Termos de uso

Cláusula em português simples em `/termos` com: teste de 30 dias, planos, renovação automática, troca na renovação, atraso e pausa no dia 10, cancelamento e reembolso (fórmula e exemplo). O Thiago revisa (ou um advogado).

## 7. Admin

- Admin › Cobrança e a aba "Plano e cobrança" do buffet mostram: plano, troca agendada, situação (em dia / atrasado X dias / pausado), próxima cobrança, e o botão de reembolso quando houver.

## Testes

Cada caminho com teste automático (e2e ou simulação dos eventos do Asaas como em `asaas-sync`): teste → assinatura → troca → atraso (dias 1/5/9) → pausa (dia 10) → pagamento → volta; cancelamento com e sem reembolso (7 dias, mensal, 12 meses no 5º mês = R$ 443).

## Implementação (2026-10-19)

**Banco** (`supabase/migrations/20261019100000_subscription_flow.sql`)
- `organization_billing`: `billing_period` (1/3/6/12, plano em vigor), `pending_period` + `pending_from` (troca agendada; `pending_from` = `due_at` na hora da troca), `paused_at` (acesso pausado pelo atraso, separado de `organizations.status`), `auto_billing_disabled_at` (admin desligou a cobrança automática: salvar Empresa não religa).
- `billing_invoices.months`: meses que a fatura paga.
- `billing_notices`: um registro por episódio de atraso (`overdue_since`) e dia (1, 5, 9, 10 = pausa). É o que impede aviso repetido.
- `billing_refunds`: reembolsos do cancelamento (`requested` → `done` pelo webhook do Asaas; `manual` → `done` quando o admin paga por Pix).
- Templates `billing_overdue` (dias 1 e 5), `billing_last_warning` (dia 9), `billing_paused` (dia 10) em Admin › E-mails. Variáveis novas: `{{vencimento}}`, `{{prazo}}`, `{{whatsapp}}`.
- Cron `billing-daily` às 11:00 UTC (08:00 de Brasília): `app.run_billing_daily()` → pg_net → `POST /api/billing/asaas/daily`. Sem segredo novo no Vault: a URL sai do host de `notify_email_url` e o segredo é o `notify_email_secret` (= `NOTIFY_EMAIL_SECRET` no app). A rota fica sob `/api/billing/asaas` porque esse prefixo já é público no proxy.

**Código**
- Regras puras (preços, meses usados, atraso, opções de cancelamento): `src/lib/billing/plans.ts`.
- Fluxo (liga sozinho, troca de plano, cancelamento, rotina diária): `src/lib/billing/subscription.ts`. Asaas: `asaas.ts` (`updateSubscription`, `refundPayment`, `getPixQrCode`, `listSubscriptionPayments`) e `asaas-sync.ts` (assinatura com o ciclo do plano; fatura do webhook com os meses do plano; `PAYMENT_REFUNDED` em fatura paga confirma o reembolso).
- Pagamento confirmado (`settle.ts`): aplica a troca agendada quando a renovação é paga e tira o "pausado" (`refreshPause`).
- Ações do dono: `src/lib/actions/subscription.ts` (`choosePlan`, `undoPlanChange`, `subscribeNow`, `cancelSubscription`, `reactivateSubscription`, `completeBillingData`). Configurações › Empresa chama `maybeAutoEnable` depois de salvar.
- Telas: faixa `src/components/shell/billing-banner.tsx` (só dono); Minha conta › Assinatura (`plan-card.tsx`, `cancel-subscription.tsx`); `/pausado`; Admin › Cobrança (plano, troca, situação, card Reembolsos com "Reembolsar R$ X por Pix"); `src/app/admin/cobranca/subscription-panel.tsx` (`<OrgSubscriptionPanel orgId>`) para a aba "Plano e cobrança" do buffet; cláusula em `/termos#assinatura`.

**Decisões do implementador**
- Atraso conta da fatura aberta mais antiga vencida, ou do fim do teste quando ele acabou sem assinatura (status ainda `trial`). Dia 1 = dia seguinte ao vencimento; "pague até" = vencimento + 9; pausa no dia 10. Se a rotina falhar um dia, ela manda o último aviso alcançado (ex.: dia 6 manda o do dia 5).
- No dia 10 também sai um e-mail "acesso pausado" (não estava no combinado).
- No teste (nada pago ainda) a troca de plano vale na hora; depois do primeiro pagamento vale na renovação. "Assinar agora" cria a assinatura já, com a primeira cobrança no fim do teste (pagar antes não perde os dias grátis).
- Teste acabou sem dados e o dono completa depois: a primeira cobrança vence no dia em que completou; o atraso continua contando desde o fim do teste até pagar.
- Até 7 dias depois de um pagamento o dono escolhe entre o reembolso integral (acesso termina na hora) e usar até o fim; em 3/6/12 meses também aparece o proporcional (só se for maior que zero). Pagamento adiantado de um período que ainda não começou: o acesso vai até o início dele.
- Reembolso por boleto (ou recusado pelo Asaas, ou fatura manual) vira "Reembolsar por Pix" no admin.
- Equipe (staff) vê a tela pausada sem o pagamento ("avise o responsável"). A tela pausada pede CNPJ/CPF e WhatsApp quando ainda não há cobrança.
- Cancelar: se o Asaas não desligar a assinatura, nada muda e o dono vê o erro.
- Reativar: tenta religar a assinatura no Asaas (primeira cobrança no fim do que está pago, ou hoje).

**Testes**: `tests/e2e/subscription-flow.spec.ts` (regras + fluxo completo com Asaas simulado no processo, incluindo R$ 443) e `tests/e2e/subscription.spec.ts` (telas, webhook real do app, admin).
