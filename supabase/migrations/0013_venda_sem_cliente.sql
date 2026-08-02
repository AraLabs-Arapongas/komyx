-- Venda pode nascer sem cliente.
--
-- O corretor fecha na rua e registra na hora, com o valor na cabeça e o resto
-- ainda no papel. Exigir o cliente logo no começo obrigava a inventar cadastro
-- só para conseguir salvar — o que suja a base de clientes para sempre por
-- causa de uma pressa de trinta segundos.
--
-- O valor da carta e a data continuam obrigatórios: são o que o motor precisa
-- para calcular comissão. O nome entra depois, editando a venda.
alter table vendas alter column cliente_id drop not null;
