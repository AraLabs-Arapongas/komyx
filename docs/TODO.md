# Komyx · pendências

## Produção (depende do Thiago)
- [ ] Gerar secret (`openssl rand -hex 32`) → Vercel `NOTIFY_EMAIL_SECRET`
- [ ] Vault no Supabase: `notify_email_url` (https://www.komyx.com.br/api/notifications/email) e `notify_email_secret`
- [ ] Criar a conta demo pelo cadastro do site: buffet "Komyx Buffet", e-mail demo@komyx.com.br (slug `komyx-buffet`)
- [ ] `supabase db push` (migrations 20261017120000, 20261017130000 e 20261017150000); se a conta demo veio depois, `select app.reset_demo_buffet();` no SQL Editor
- [ ] Configurar Test Phone Number 5511900000001 no Supabase (para o app do cliente demo e a Apple)
- [ ] Push dos commits locais (logo depois do db push)
- [ ] Testar aviso por e-mail com um pedido de orçamento real

## App
- [ ] Instalar EAS Update (`expo-updates`) na próxima versão da loja, para mudanças só de JS irem sem revisão
- [ ] Próxima versão leva: Aprovado/Recusado + resposta do buffet, prévia do valor ao pedir mais pessoas, app do dono aprovando pelo servidor

## Produto
- [ ] Cobrança dos planos (escolher provedor: Asaas, Mercado Pago, Stripe…)
- [ ] Conciliação do Pix (provedor com API)
- [ ] Reenvio de e-mail de aviso que falhar
- [ ] Endereço inventado sem login mostra `/login` em vez da 404

## Ao enviar versão para a Apple
- `scripts/apple-review.sh` mostra o passo a passo: `select app.reset_demo_buffet();`, login demo@komyx.com.br, cliente 11900000001
