alter table profiles enable row level security;
alter table clientes enable row level security;
alter table config_financeira enable row level security;
alter table competencias enable row level security;
alter table vendas enable row level security;
alter table comissoes enable row level security;
alter table recebimentos enable row level security;

create policy "own profile" on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

create policy "own rows" on clientes for all
  using (corretor_id = auth.uid()) with check (corretor_id = auth.uid());
create policy "own rows" on config_financeira for all
  using (corretor_id = auth.uid()) with check (corretor_id = auth.uid());
create policy "own rows" on competencias for all
  using (corretor_id = auth.uid()) with check (corretor_id = auth.uid());
create policy "own rows" on vendas for all
  using (corretor_id = auth.uid()) with check (corretor_id = auth.uid());
create policy "own rows" on comissoes for all
  using (corretor_id = auth.uid()) with check (corretor_id = auth.uid());
create policy "own rows" on recebimentos for all
  using (corretor_id = auth.uid()) with check (corretor_id = auth.uid());
