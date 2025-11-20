-- Cleanup legacy overloaded admin access functions to eliminate ambiguity
-- Safe to run multiple times; drops any public.check_admin_access(*) variants.

do $$
declare
  r record;
begin
  for r in
    select n.nspname as schema_name,
           p.proname as function_name,
           oidvectortypes(p.proargtypes) as argtypes
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'check_admin_access'
  loop
    raise notice 'Dropping function %.%(%).', r.schema_name, r.function_name, r.argtypes;
    execute format('drop function if exists %I.%I(%s) cascade', r.schema_name, r.function_name, r.argtypes);
  end loop;
end $$;
