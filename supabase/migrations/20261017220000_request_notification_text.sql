-- New-request notification (and its e-mail): money in pt-BR (R$ 4.200,00) and the lead source's
-- label (Indicação) instead of its stored value (indicacao). Labels mirror LEAD_SOURCES in src/lib/pricing.ts.
create or replace function app.notify_public_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (organization_id, type, title, body, href)
  values (
    new.organization_id,
    'request',
    'Novo pedido de orçamento: ' || new.name,
    coalesce(
      case when new.desired_date is not null then 'Festa em ' || to_char(new.desired_date, 'DD/MM/YYYY') else null end, 'Sem data definida'
    ) || case when new.estimated_total is not null
          then ' · estimativa R$ ' || translate(to_char(new.estimated_total, 'FM999,999,990.00'), ',.', '.,') else '' end
      || case when new.source is not null then ' · via ' || case new.source
          when 'instagram' then 'Instagram' when 'google' then 'Google' when 'whatsapp' then 'WhatsApp'
          when 'indicacao' then 'indicação' when 'facebook' then 'Facebook' when 'site' then 'site'
          when 'passou_na_frente' then 'quem passou na frente' when 'outro' then 'outro canal'
          else new.source end else '' end,
    '/solicitacoes'
  );
  return null;
end;
$$;
