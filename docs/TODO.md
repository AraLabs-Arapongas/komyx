# Komyx · pendências

## Produção (depende do Thiago)
- [ ] Definir a senha de apple@komyx.com.br (Buffet Revisão) em www.komyx.com.br/esqueci-senha

## App (próxima versão na loja)
- [ ] Instalar EAS Update (`expo-updates`), para mudanças só de JS irem sem revisão
- [ ] Levar: Aprovado/Recusado + resposta do buffet, prévia do valor ao pedir mais pessoas, app do dono aprovando pelo servidor
- [ ] App Review: dono apple@komyx.com.br + senha; cliente 11900000010, código 123456 (válido até 17/10/2027)

## Produto
- [ ] Cobrança dos planos (escolher provedor: Asaas, Mercado Pago, Stripe…)
- [ ] Conciliação do Pix (provedor com API)
- [ ] Reenvio de e-mail de aviso que falhar
- [ ] Endereço inventado sem login mostra `/login` em vez da 404
- [ ] Hero no celular: nos estilos Bolha/Colagem/Confete a foto fica abaixo do texto (decidir se sobe)

## Feito recentemente
- Aviso por e-mail de pedido testado em produção (chega em demo@komyx.com.br); valor em R$ 4.200,00 e origem com rótulo
- Select próprio nas páginas públicas (FestaSelect) e máscara (11) 99999-9999 em todos os campos de WhatsApp

## Demos (prontos)
- Komyx Buffet (/p/komyx-buffet): vitrine e vendas · dono demo@komyx.com.br · cliente 11900000001 / 123456
- Buffet Revisão (sem página pública): App Store · dono apple@komyx.com.br · cliente 11900000010 / 123456
- Os dois voltam ao original toda noite (03:30) por `app.reset_demo_buffet()`, sem e-mail; ações reais no Komyx Buffet avisam por e-mail; fotos no Storage `org-media/<org>/demo/`
