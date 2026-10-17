-- These tables were granted to authenticated only. Production gives service_role everything by
-- default privileges, a fresh local database does not: the public quote wizard (admin client) saw no
-- menu locally. Grant explicitly so both behave the same.
grant select, insert, update, delete on public.package_menu_groups, public.package_menu_items, public.quote_menu_choices,
  public.payment_reversals, public.event_change_requests to service_role;
