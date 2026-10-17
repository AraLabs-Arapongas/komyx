-- Demo buffets (Komyx Buffet and Buffet Revisão) are located at Praça Mauá, in Arapongas/PR.
do $$
declare d text;
begin
  d := pg_get_functiondef('app.reset_demo_org(text, text, text, boolean)'::regprocedure);
  d := replace(d, 'address = ''Rua dos Balões, 250 - Vila Mariana, São Paulo/SP'',', 'address = ''Praça Mauá - Centro, Arapongas - PR'',');
  d := replace(d, 'city = ''São Paulo/SP'',', 'city = ''Arapongas/PR'',');
  if position('Arapongas - PR' in d) = 0 then raise exception 'demo address not found in reset_demo_org'; end if;
  execute d;
end $$;
select app.reset_demo_buffet();
