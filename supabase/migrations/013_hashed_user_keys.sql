do $$
declare
  item record;
begin
  for item in
    select * from (
      values
        ('daily_soul_readings', 'daily_soul_readings_user_key_hashed_chk'),
        ('more_guidance_subscriptions', 'more_guidance_subscriptions_user_key_hashed_chk'),
        ('saved_guidance', 'saved_guidance_user_key_hashed_chk'),
        ('astro_solve_questions', 'astro_solve_questions_user_key_hashed_chk'),
        ('more_guidance_readings', 'more_guidance_readings_user_key_hashed_chk'),
        ('shani_remedy_memberships', 'shani_remedy_memberships_user_key_hashed_chk'),
        ('shani_pandit_messages', 'shani_pandit_messages_user_key_hashed_chk')
    ) as constraints(table_name, constraint_name)
  loop
    if not exists (
      select 1
      from pg_constraint
      where conname = item.constraint_name
        and conrelid = format('public.%I', item.table_name)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I check (user_key ~ %L)',
        item.table_name,
        item.constraint_name,
        '^sgu_[a-f0-9]{32}$'
      );
    end if;
  end loop;
end $$;

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
  ),
  key_constraints_by_name as (
    select
      constraint_name,
      jsonb_build_object(
        'table', table_name,
        'type', constraint_type,
        'columns', jsonb_agg(column_name order by ordinal_position),
        'check', ''
      ) as contract
    from information_schema.key_column_usage
    join information_schema.table_constraints using (constraint_catalog, constraint_schema, constraint_name, table_schema, table_name)
    where table_schema = 'public'
      and constraint_type in ('PRIMARY KEY', 'UNIQUE')
    group by constraint_name, table_name, constraint_type
  ),
  check_constraints_by_name as (
    select
      table_constraints.constraint_name,
      jsonb_build_object(
        'table', table_constraints.table_name,
        'type', table_constraints.constraint_type,
        'columns', '[]'::jsonb,
        'check', check_constraints.check_clause
      ) as contract
    from information_schema.table_constraints
    join information_schema.check_constraints
      using (constraint_catalog, constraint_schema, constraint_name)
    where table_constraints.table_schema = 'public'
      and table_constraints.constraint_type = 'CHECK'
  ),
  constraints_by_name as (
    select * from key_constraints_by_name
    union all
    select * from check_constraints_by_name
  )
  select jsonb_build_object(
    'columns', coalesce((select jsonb_object_agg(table_name, columns) from columns_by_table), '{}'::jsonb),
    'indexes', coalesce((select jsonb_object_agg(indexname, indexdef) from indexes_by_name), '{}'::jsonb),
    'constraints', coalesce((select jsonb_object_agg(constraint_name, contract) from constraints_by_name), '{}'::jsonb)
  );
$$;

revoke all on function public.soulguru_schema_contract() from public;
revoke all on function public.soulguru_schema_contract() from anon;
revoke all on function public.soulguru_schema_contract() from authenticated;
grant execute on function public.soulguru_schema_contract() to service_role;
