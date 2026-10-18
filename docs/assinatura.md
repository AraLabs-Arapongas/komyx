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
