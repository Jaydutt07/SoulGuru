alter table public.saved_guidance
  add column if not exists user_profile_id uuid references public.user_profiles(id) on delete cascade;

create index if not exists saved_guidance_profile_created_idx
  on public.saved_guidance(user_profile_id, created_at desc);
