-- Guest confirmations are not worth a notification; they show on the event page.
drop trigger if exists guests_notify_public on public.guests;
drop function if exists app.notify_guest_public();
delete from public.notifications where type = 'guest';
