-- Menu in the contract ({{cardapio}}) and choices that follow the quote's package.

-- 1. When a quote changes package, picks that belong to groups of another package are dropped.
create or replace function app.quote_menu_follows_package()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.package_id is distinct from old.package_id then
    delete from public.quote_menu_choices c
    where c.quote_id = new.id
      and not exists (select 1 from public.package_menu_groups g where g.id = c.group_id and g.package_id = new.package_id);
  end if;
  return new;
end;
$$;
drop trigger if exists quote_menu_follows_package on public.quotes;
create trigger quote_menu_follows_package after update of package_id on public.quotes
  for each row execute function app.quote_menu_follows_package();

-- 2. Default contract template gains the menu section; existing templates that still have the
--    stock "2. ITENS CONTRATADOS" block get it too.
alter table public.organizations alter column contract_template set default $tpl$CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE BUFFET

CONTRATADA: {{buffet_razao}}, {{buffet_documento}}, com sede em {{buffet_endereco}}, WhatsApp {{buffet_whatsapp}}.

CONTRATANTE: {{cliente_nome}}, {{cliente_documento}}, WhatsApp {{cliente_whatsapp}}{{cliente_email}}.

1. OBJETO
A CONTRATADA prestará serviços de buffet para o evento "{{evento_titulo}}" no dia {{evento_data}}, das {{evento_inicio}} às {{evento_fim}}, para até {{evento_participantes}} participantes, conforme pacote {{pacote}}.

2. ITENS CONTRATADOS
{{itens}}

Cardápio incluído no pacote:
{{cardapio}}

3. VALOR E FORMA DE PAGAMENTO
O valor total é de {{valor_total}}, a ser pago da seguinte forma:
{{plano_pagamento}}
{{pix}}

4. PARTICIPANTES EXCEDENTES
Participantes além do contratado serão cobrados conforme tabela vigente do pacote, apurados no dia do evento.

5. CANCELAMENTO E REMARCAÇÃO
Em caso de cancelamento pelo CONTRATANTE com mais de 30 dias de antecedência, será retido o sinal. Com menos de 30 dias, serão retidos 50% do valor total. Remarcações dependem de disponibilidade de agenda.

6. RESPONSABILIDADES
A CONTRATADA se responsabiliza pela qualidade dos alimentos e serviços. O CONTRATANTE se responsabiliza pela conduta dos convidados e por danos causados ao espaço.

7. FORO
Fica eleito o foro da comarca de {{buffet_cidade}} para dirimir quaisquer dúvidas.

{{buffet_cidade}}, {{data_geracao}}.


_______________________________________
{{buffet_razao}} (CONTRATADA)


_______________________________________
{{cliente_nome}} (CONTRATANTE)
$tpl$;

update public.organizations
   set contract_template = replace(contract_template, E'2. ITENS CONTRATADOS\n{{itens}}\n', E'2. ITENS CONTRATADOS\n{{itens}}\n\nCardápio incluído no pacote:\n{{cardapio}}\n')
 where contract_template like '%{{itens}}%' and contract_template not like '%{{cardapio}}%';
