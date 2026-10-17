-- ============================================================
-- Email for every in-app notification
-- ============================================================
-- All notifications are created inside Postgres (triggers on public_requests, events, contracts,
-- event_change_requests), so one AFTER INSERT trigger on notifications covers web, public pages
-- and the mobile RPCs alike. It queues a pg_net POST (async, sent after commit) to the Next.js
-- route /api/notifications/email, which picks the recipients and sends through the email provider.
-- Any failure here only raises a warning: the original action never fails because of email.
--
-- Target URL and shared secret come from Vault (production: create `notify_email_url` and
-- `notify_email_secret`); without them it falls back to the local dev server and its local secret.

create extension if not exists pg_net with schema extensions;

-- Per-user opt-out ("Receber avisos por e-mail" in Minha conta).
alter table public.profiles add column if not exists email_notifications boolean not null default true;

-- Set by the route when it claims a notification, so a repeated call never sends twice.
alter table public.notifications add column if not exists emailed_at timestamptz;

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

drop trigger if exists notifications_email on public.notifications;
create trigger notifications_email after insert on public.notifications for each row execute function app.email_notification();
