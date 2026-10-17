# Komyx · pendências

## Produção (depende do Thiago)
- [ ] Gerar secret (`openssl rand -hex 32`) → Vercel `NOTIFY_EMAIL_SECRET`
- [ ] Vault no Supabase: `notify_email_url` (https://www.komyx.com.br/api/notifications/email) e `notify_email_secret`
- [ ] `supabase db push` (migrations 20261017120000 e 20261017130000)
- [ ] Push dos commits locais (logo depois do db push)
- [ ] Testar aviso por e-mail com um pedido de orçamento real

## App
- [ ] Instalar EAS Update (`expo-updates`) na próxima versão da loja, para mudanças só de JS irem sem revisão
- [ ] Próxima versão leva: Aprovado/Recusado + resposta do buffet, prévia do valor ao pedir mais pessoas, app do dono aprovando pelo servidor

## Produto
- [ ] Cobrança dos planos (escolher provedor: Asaas, Mercado Pago, Stripe…)
- [ ] Conciliação do Pix (provedor com API)
- [ ] Reenvio de e-mail de aviso que falhar
- [ ] Buffet real como vitrine → voltar botão "Ver uma página de buffet" na home
- [ ] Endereço inventado sem login mostra `/login` em vez da 404

## Ao enviar versão para a Apple
- `scripts/apple-review.sh up | pbcopy` → SQL Editor; senha no App Review; Test Phone Number 5511999990002=123456
- Depois da aprovação: `scripts/apple-review.sh down | pbcopy` e tirar o número de teste
