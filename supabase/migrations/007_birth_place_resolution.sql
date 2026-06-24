alter table public.user_profiles
  add column if not exists birth_timezone text,
  add column if not exists birth_timezone_offset_minutes integer,
  add column if not exists birth_place_resolved_label text,
  add column if not exists birth_place_resolution_source text;
