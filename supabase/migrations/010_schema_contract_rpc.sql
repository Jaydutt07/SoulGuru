create or replace function public.soulguru_schema_contract()
returns jsonb
language sql
security definer
set search_path = public, pg_catalog
as $$
  with columns_by_table as (
    select
      table_name,
      jsonb_agg(column_name order by ordinal_position) as columns
    from information_schema.columns
    where table_schema = 'public'
    group by table_name
  ),
  indexes_by_name as (
    select
      indexname,
      indexdef
    from pg_indexes
    where schemaname = 'public'
  )
  select jsonb_build_object(
    'columns', coalesce((select jsonb_object_agg(table_name, columns) from columns_by_table), '{}'::jsonb),
    'indexes', coalesce((select jsonb_object_agg(indexname, indexdef) from indexes_by_name), '{}'::jsonb)
  );
$$;

revoke all on function public.soulguru_schema_contract() from public;
revoke all on function public.soulguru_schema_contract() from anon;
revoke all on function public.soulguru_schema_contract() from authenticated;
grant execute on function public.soulguru_schema_contract() to service_role;
