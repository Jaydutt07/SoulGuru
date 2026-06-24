create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id text unique,
  phone text unique,
  email text,
  full_name text not null,
  birth_date date not null,
  birth_time time,
  birth_place text,
  birth_latitude double precision,
  birth_longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_soul_readings (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid references public.user_profiles(id) on delete cascade,
  user_key text not null,
  reading_date date not null,
  timezone text not null default 'Asia/Kolkata',
  astrology_context jsonb not null default '{}'::jsonb,
  reading jsonb not null,
  model text,
  prompt_version text not null default 'soul-wisdom-v2',
  created_at timestamptz not null default now(),
  unique(user_key, reading_date, prompt_version)
);

create table if not exists public.more_guidance_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid references public.user_profiles(id) on delete cascade,
  user_key text not null,
  plan_name text not null default 'Soul Guru + Astro Solve',
  status text not null default 'active',
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  astro_bonus_questions integer not null default 15,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_guidance (
  id uuid primary key default gen_random_uuid(),
  user_key text not null,
  daily_reading_id uuid references public.daily_soul_readings(id) on delete set null,
  note text,
  reading jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.astro_solve_questions (
  id uuid primary key default gen_random_uuid(),
  user_key text not null,
  question text not null,
  answer jsonb,
  source text not null default 'free',
  created_at timestamptz not null default now()
);

create index if not exists daily_soul_readings_user_date_idx
  on public.daily_soul_readings(user_key, reading_date desc);

create index if not exists subscriptions_user_status_idx
  on public.more_guidance_subscriptions(user_key, status, ends_at desc);

create index if not exists saved_guidance_user_created_idx
  on public.saved_guidance(user_key, created_at desc);

create index if not exists astro_questions_user_created_idx
  on public.astro_solve_questions(user_key, created_at desc);

alter table public.user_profiles enable row level security;
alter table public.daily_soul_readings enable row level security;
alter table public.more_guidance_subscriptions enable row level security;
alter table public.saved_guidance enable row level security;
alter table public.astro_solve_questions enable row level security;

create policy "service role manages user_profiles"
  on public.user_profiles for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role manages daily_soul_readings"
  on public.daily_soul_readings for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role manages subscriptions"
  on public.more_guidance_subscriptions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role manages saved_guidance"
  on public.saved_guidance for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role manages astro_solve_questions"
  on public.astro_solve_questions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
