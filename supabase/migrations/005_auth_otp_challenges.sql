create table if not exists public.auth_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  email text,
  purpose text not null default 'login',
  code_hash text not null,
  delivery_channel text not null default 'demo',
  attempts integer not null default 0,
  expires_at timestamptz not null,
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists auth_otp_phone_created_idx
  on public.auth_otp_challenges(phone, created_at desc);

create index if not exists auth_otp_expires_idx
  on public.auth_otp_challenges(expires_at);

alter table public.auth_otp_challenges enable row level security;

create policy "service role manages auth_otp_challenges"
  on public.auth_otp_challenges for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
