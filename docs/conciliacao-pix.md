# Conciliação do Pix dos buffets — opções para decidir

## O problema

Hoje o cliente paga o sinal e as parcelas direto na chave Pix do buffet. O Komyx gera o QR com um identificador
(ex.: `FESTADAVI0000006`), mas **não fica sabendo** quando o dinheiro cai: o dono confere o extrato e clica em
"Recebi o sinal". Conciliação = o Komyx saber sozinho que o Pix caiu e dar baixa.

Para isso, o Pix precisa ser gerado por um **provedor com API** (e webhook) numa conta **do buffet** — o dinheiro é dele,
não da Komyx.

## Opções

### A) Subconta Asaas criada pela Komyx (recomendada)
A conta Asaas da Komyx cria uma **subconta** para cada buffet (API `POST /accounts`), com o CNPJ/CPF e os dados
bancários dele. Cada cobrança de festa vira uma cobrança Pix na subconta; o webhook avisa o Komyx; baixa automática.
- O dinheiro cai na subconta do buffet e ele saca para o banco dele (ou saque automático).
- **Onboarding**: o buffet manda documentos e o Asaas aprova a subconta (KYC) — leva de horas a dias.
- **Taxa**: Pix recebido ~R$ 1–2 por cobrança (conferir tabela da subconta). Decidir: o buffet paga, ou a Komyx absorve no plano.
- **Bônus**: dá para a Komyx ganhar uma pequena taxa por transação (split), se quiser no futuro.
- Mesma integração que já fizemos para a mensalidade → menos código novo.

### B) O buffet traz a própria conta (Asaas, Mercado Pago, Efí…)
O dono cola a chave de API da conta dele em Configurações; o Komyx gera os Pix por ela.
- Sem onboarding pela Komyx, mas cada provedor é uma integração diferente (mais código) e guardar a chave do buffet com segurança (Vault criptografado).
- Suporte mais difícil: cada buffet com um provedor.

### C) Continuar manual, com menos atrito
Sem provedor: o QR continua na chave do buffet, e o dono confirma com um toque (como hoje), com o aviso "Já paguei" do
cliente trazendo o valor (já feito). Zero custo, zero onboarding — mas não é automático.

## Perguntas para você

1. A, B ou C? (Recomendo A.)
2. Se A: quem paga a taxa do Pix — o buffet (descontada do valor) ou a Komyx?
3. Obrigatório para todo buffet, ou opcional ("Receber Pix automático" em Configurações)?
4. Quer, no futuro, uma taxa da Komyx por transação (split)? Isso muda o contrato/termos.
