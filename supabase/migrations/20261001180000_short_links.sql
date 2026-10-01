-- Short public links: /o/<8 chars> redirects to the long public page of the same link.
-- Tokens stay random (base62), never sequential.

create or replace function app.short_code(p_len int default 8)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_chars constant text := 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/l/I
  v_bytes bytea := extensions.gen_random_bytes(p_len);
  v_out text := '';
  i int;
begin
  for i in 0..p_len - 1 loop
    v_out := v_out || substr(v_chars, (get_byte(v_bytes, i) % length(v_chars)) + 1, 1);
  end loop;
  return v_out;
end;
$$;

alter table public.public_links add column if not exists short text;

-- Backfill, retrying on the rare collision.
do $$
declare r record; v text;
begin
  for r in select id from public.public_links where short is null loop
    loop
      v := app.short_code(8);
      exit when not exists (select 1 from public.public_links where short = v);
    end loop;
    update public.public_links set short = v where id = r.id;
  end loop;
end $$;

alter table public.public_links alter column short set not null;
create unique index if not exists public_links_short_idx on public.public_links(short);

create or replace function app.public_links_set_short()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.short is null then
    loop
      new.short := app.short_code(8);
      exit when not exists (select 1 from public.public_links where short = new.short);
    end loop;
  end if;
  return new;
end;
$$;
drop trigger if exists public_links_set_short on public.public_links;
create trigger public_links_set_short before insert on public.public_links for each row execute function app.public_links_set_short();
