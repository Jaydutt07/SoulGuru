alter table public.more_guidance_subscriptions
  add column if not exists provider text,
  add column if not exists provider_payment_id text,
  add column if not exists provider_subscription_id text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.payment_events (
  provider_event_id text primary key,
  provider text not null,
  event_name text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists payment_events_provider_created_idx
  on public.payment_events(provider, created_at desc);

create index if not exists subscriptions_provider_payment_idx
  on public.more_guidance_subscriptions(provider, provider_payment_id);

alter table public.payment_events enable row level security;

create policy "service role manages payment_events"
  on public.payment_events for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
