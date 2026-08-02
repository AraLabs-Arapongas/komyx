# Komyx

Controle de comissões para corretores de consórcio. Registra a venda, aplica as
faixas do escritório, projeta as parcelas e diz quanto entra em cada mês.

Next.js 16 (App Router, Turbopack) + Supabase. O cálculo mora em
`src/lib/engine/`, em TypeScript puro e coberto por testes: dinheiro em
centavos inteiros, datas como `'YYYY-MM-DD'`, nenhuma dependência de framework.

## Rodando

```bash
npm install
npx supabase start          # Postgres + Auth locais, em Docker
cp .env.example .env.local  # preencha com o que o `supabase start` imprimiu
npm run dev
```

```bash
npm test                  # vitest: engine e domínio
npm run lint
```

As migrações ficam em `supabase/migrations/`, numeradas. Para aplicar em
produção:

```bash
npx supabase db push --linked
```

## Assinatura

O produto é pago: R$ 19,90 por mês, com 14 dias de teste que começam no
cadastro e não pedem cartão. O prazo do teste vive no banco
(`profiles.trial_termina_em`); o resto do estado é espelho do Stripe, escrito
apenas pelo webhook.

A regra de "quem pode usar" está em `src/lib/assinatura/acesso.ts` — uma função
pura, com testes. É ela que o layout do app consulta antes de renderizar.

**Enquanto o Stripe não estiver configurado, o portão não fecha.** Sem
`STRIPE_SECRET_KEY` e `STRIPE_PRICE_ID` não existe tela onde pagar, e trancar o
corretor fora do app nessa situação custa o cliente.

### Ligando o Stripe

1. **Produto e preço.** No painel do Stripe, crie o produto e um preço
   recorrente mensal de R$ 19,90 (BRL). Guarde o `price_…`.
2. **Chaves.** Developers → API keys. A secret key (`sk_…`) vai para
   `STRIPE_SECRET_KEY`.
3. **Webhook.** Developers → Webhooks → endpoint
   `https://www.komyx.com.br/api/stripe/webhook`, assinando:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `checkout.session.completed`

   O signing secret (`whsec_…`) vai para `STRIPE_WEBHOOK_SECRET`.
4. **Portal do cliente.** Settings → Billing → Customer portal: ative e permita
   cancelamento e troca de cartão. É para lá que o botão "Gerenciar assinatura"
   manda o corretor.
5. **Variáveis na Vercel.** `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`,
   `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` e
   `NEXT_PUBLIC_SITE_URL=https://www.komyx.com.br`.

Para testar localmente sem expor a máquina:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

O comando imprime um `whsec_…` próprio, que substitui o de produção no
`.env.local`.

### O que o webhook garante

A volta do checkout (`?assinou=1`) é só um texto na barra de endereço — quem
fecha o navegador antes de voltar pagou do mesmo jeito. O estado da assinatura
só muda pelo webhook, e todo evento recebido fica em `eventos_stripe`: a chave
primária é o id do evento, o que dá idempotência de graça e um lugar para olhar
quando alguém disser "paguei e não liberou".

### Uma trava que não é óbvia

A política de RLS de `profiles` é `for all using (id = auth.uid())`: o corretor
pode dar UPDATE na própria linha — e é nessa linha que mora o estado da
assinatura. Por isso a migração `0014` revoga o UPDATE amplo e devolve só
`nome` e `telefone`:

```sql
revoke update on profiles from authenticated;
grant update (nome, telefone) on profiles to authenticated;
```

Sem isso, um PATCH direto no PostgREST trocando `assinatura_status` para
`active` libera o app de graça. **Toda coluna nova de cobrança em `profiles`
nasce protegida por essa regra** — o grant lista o que é liberado, não o que é
proibido, então esquecer é o caminho seguro.

## Convenções

Estão em [AGENTS.md](AGENTS.md): código e comentários em português, interface
sempre a partir do design system, e o porquê disso.
