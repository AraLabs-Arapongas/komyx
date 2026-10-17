-- Demo e-mails: the nightly rebuild stays quiet, but real actions on the showcase (a visitor asks
-- for a quote or reserves, the demo client asks for something in the app) e-mail demo@komyx.com.br
-- like any buffet. Buffet Revisão (no public page, App Store) never e-mails.
create or replace function app.email_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  -- Set by app.reset_demo_buffet() for its own transaction only.
  if coalesce(current_setting('app.demo_reset', true), '') = 'on' then
    return null;
  end if;
  if exists (select 1 from public.organizations o where o.id = new.organization_id and o.is_demo and not o.public_page) then
    return null;
  end if;
  begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'notify_email_url';
    select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'notify_email_secret';
    perform net.http_post(
      url := coalesce(v_url, 'http://host.docker.internal:3000/api/notifications/email'),
      body := jsonb_build_object('id', new.id),
      headers := jsonb_build_object('content-type', 'application/json', 'authorization', 'Bearer ' || coalesce(v_secret, 'komyx-local-notify-email-secret')),
      timeout_milliseconds := 10000
    );
  exception when others then
    raise warning 'email_notification %: %', new.id, sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function app.email_notification() from public, anon, authenticated;

create or replace function app.reset_demo_buffet()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.demo_reset', 'on', true);
  perform app.reset_demo_org('komyx-buffet', '11900000001', 'komyx-buffet-demo', true);
  perform app.reset_demo_org('buffet-revisao', '11900000010', 'buffet-revisao-demo', false);
  perform set_config('app.demo_reset', 'off', true);
end;
$$;
revoke all on function app.reset_demo_buffet() from public, anon, authenticated;
