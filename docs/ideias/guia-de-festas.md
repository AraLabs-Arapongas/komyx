# Guia de festas da cidade

Status: ideia, ainda sem código. Registrada em 03/10/2026.

## O que é

Uma página por cidade (ex.: "Festas em Londrina") listando os buffets que usam o Komyx. O Komyx deixa de ser só ferramenta interna do buffet e vira canal que traz cliente, o que reforça o motivo de assinar.

É viável porque a base já existe: agenda real, pacotes com preço, cardápio por pacote, reserva com sinal por Pix e o app do cliente.

## Diferenciais

- **Busca por data livre.** "Quem tem 15/11 à tarde para 60 pessoas?" Hoje o cliente precisa perguntar a dez buffets. O Komyx sabe a agenda de verdade.
- **Comparar pacotes** dos buffets que mostram preço (`show_prices_public`). Os outros aparecem com "pedir orçamento".
- **Reservar ali mesmo.** Reaproveita o fluxo de reserva com sinal por Pix da página pública do buffet (`/p/[slug]/orcamento`).
- **Avaliações verificadas.** Só avalia quem teve festa realizada (status DONE), pelo app do cliente, depois da festa.

## Ganhos extras com o que já existe

- **Aniversários.** A tabela `celebrants` guarda a data de nascimento. Com permissão do cliente, o buffet recebe lembrete dois meses antes do próximo aniversário para oferecer a festa de novo.
- **Vitrine.** Temas (`party_themes`) e galeria do buffet viram conteúdo do guia.

## Cuidados

- **Medo de comparação.** Participação opcional, com o buffet escolhendo o que aparece: preço, agenda, avaliações.
- **Ordenação justa.** Ordenar por data livre, avaliação e tempo de resposta. Se quem paga aparece em cima, o guia perde a confiança.
- **Ovo e galinha.** Só abrir uma cidade com cinco ou mais buffets.

## Monetização (depois)

- Aparecer no guia incluso na assinatura.
- Destaque pago, bem sinalizado como destaque, ou taxa fixa por reserva vinda do guia. Evitar comissão percentual, que afasta buffet pequeno.

## Primeiro teste, quase sem código

1. Escolher uma cidade e convidar 5 a 10 buffets.
2. Publicar uma página estática otimizada para "buffet infantil em [cidade]".
3. Medir pedidos e reservas por 30 dias. Se vier lead, construir a busca por data e as avaliações.

## Decisões em aberto

- Cidade inicial.
- Marca: dentro do Komyx ou com nome próprio para o público final (ex.: "Festeja").
- Quem aparece: só clientes Komyx (recomendado, porque agenda e preço são reais) ou também buffets de fora.
