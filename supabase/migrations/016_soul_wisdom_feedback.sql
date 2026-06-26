create table if not exists public.soul_wisdom_feedback (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid references public.user_profiles(id) on delete set null,
  user_key text not null,
  daily_reading_id uuid,
  reading_date date not null,
  prompt_version text not null default 'soul-wisdom-v21',
  reading_hash text not null,
  rating text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_key, reading_date, prompt_version),
  constraint soul_wisdom_feedback_user_key_hashed_chk check (user_key ~ '^sgu_[a-f0-9]{32}$'),
  constraint soul_wisdom_feedback_rating_chk check (rating in ('accurate', 'missed')),
  constraint soul_wisdom_feedback_reading_hash_chk check (reading_hash ~ '^swr_[a-f0-9]{32}$'),
  constraint soul_wisdom_feedback_reason_length_chk check (reason is null or char_length(reason) <= 180)
);

create index if not exists soul_wisdom_feedback_user_date_idx
  on public.soul_wisdom_feedback(user_key, reading_date);

create index if not exists soul_wisdom_feedback_rating_created_idx
  on public.soul_wisdom_feedback(rating, created_at);

alter table public.soul_wisdom_feedback enable row level security;

create policy "service role manages soul_wisdom_feedback"
  on public.soul_wisdom_feedback for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
