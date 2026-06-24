create table if not exists public.more_guidance_readings (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid references public.user_profiles(id) on delete cascade,
  user_key text not null,
  reading_date date not null,
  timezone text not null default 'Asia/Kolkata',
  astrology_context jsonb not null default '{}'::jsonb,
  guidance jsonb not null,
  model text,
  prompt_version text not null default 'more-guidance-v1',
  created_at timestamptz not null default now(),
  unique(user_key, reading_date, prompt_version)
);

create index if not exists more_guidance_readings_user_date_idx
  on public.more_guidance_readings(user_key, reading_date desc);

alter table public.more_guidance_readings enable row level security;

create policy "service role manages more_guidance_readings"
  on public.more_guidance_readings for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
