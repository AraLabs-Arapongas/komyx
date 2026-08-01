-- "Regras de estorno" era texto livre e não entrava em nenhum cálculo.
-- Vira a política do escritório, que o sistema usa como padrão na hora da
-- desistência: perguntar sempre, cobrar tudo de volta, ou só cancelar o que
-- ainda não foi pago.
alter table config_financeira
  add column politica_estorno text not null default 'perguntar'
    check (politica_estorno in ('perguntar', 'tudo', 'proximas'));

alter table config_financeira drop column regras_estorno;
