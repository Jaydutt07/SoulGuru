create table if not exists public.shani_remedy_memberships (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid references public.user_profiles(id) on delete cascade,
  user_key text not null,
  plan_id text not null,
  plan_name text not null,
  status text not null default 'active',
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  provider text,
  provider_payment_id text,
  provider_subscription_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.shani_pandit_messages (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid references public.user_profiles(id) on delete cascade,
  membership_id uuid references public.shani_remedy_memberships(id) on delete set null,
  user_key text not null,
  question text not null,
  answer jsonb not null,
  saade_sati_report jsonb not null default '{}'::jsonb,
  source text not null default 'local-fallback',
  model text,
  prompt_version text not null default 'shani-pandit-v1',
  created_at timestamptz not null default now()
);

create index if not exists shani_memberships_user_status_idx
  on public.shani_remedy_memberships(user_key, status, ends_at desc);

create index if not exists shani_memberships_provider_payment_idx
  on public.shani_remedy_memberships(provider, provider_payment_id);

create unique index if not exists shani_memberships_provider_payment_unique_idx
  on public.shani_remedy_memberships(provider, provider_payment_id)
  where provider_payment_id is not null;

create unique index if not exists shani_memberships_provider_subscription_unique_idx
  on public.shani_remedy_memberships(provider, provider_subscription_id)
  where provider_subscription_id is not null;

create index if not exists shani_pandit_messages_user_created_idx
  on public.shani_pandit_messages(user_key, created_at desc);

create index if not exists shani_pandit_messages_membership_created_idx
  on public.shani_pandit_messages(membership_id, created_at desc);

alter table public.shani_remedy_memberships enable row level security;
alter table public.shani_pandit_messages enable row level security;

create policy "service role manages shani_remedy_memberships"
  on public.shani_remedy_memberships for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role manages shani_pandit_messages"
  on public.shani_pandit_messages for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
