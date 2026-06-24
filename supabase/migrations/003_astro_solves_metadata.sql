alter table public.astro_solve_questions
  add column if not exists user_profile_id uuid references public.user_profiles(id) on delete cascade,
  add column if not exists astrology_context jsonb not null default '{}'::jsonb,
  add column if not exists model text,
  add column if not exists prompt_version text not null default 'astro-solve-v1';

create index if not exists astro_questions_prompt_user_idx
  on public.astro_solve_questions(user_key, prompt_version, created_at desc);
