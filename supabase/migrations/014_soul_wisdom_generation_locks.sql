create table if not exists public.soul_wisdom_generation_locks (
  id uuid primary key default gen_random_uuid(),
  user_key text not null,
  reading_date date not null,
  prompt_version text not null,
  lock_owner text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(user_key, reading_date, prompt_version)
);

create index if not exists soul_wisdom_generation_locks_expiry_idx
  on public.soul_wisdom_generation_locks(expires_at);

alter table public.soul_wisdom_generation_locks enable row level security;

create policy "service role manages soul_wisdom_generation_locks"
  on public.soul_wisdom_generation_locks for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'soul_wisdom_generation_locks_user_key_hashed_chk'
      and conrelid = 'public.soul_wisdom_generation_locks'::regclass
  ) then
    alter table public.soul_wisdom_generation_locks
      add constraint soul_wisdom_generation_locks_user_key_hashed_chk
      check (user_key ~ '^sgu_[a-f0-9]{32}$');
  end if;
end $$;
