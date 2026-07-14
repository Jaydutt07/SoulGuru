create table if not exists public.shani_remedy_notifications (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid references public.shani_remedy_memberships(id) on delete cascade,
  user_key text not null,
  channel text not null default 'email',
  notification_type text not null,
  remedy_date date not null,
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  constraint shani_remedy_notifications_user_key_hashed_chk
    check (user_key ~ '^sgu_[a-f0-9]{32}$'),
  constraint shani_remedy_notifications_channel_chk
    check (channel in ('email', 'push', 'in_app')),
  constraint shani_remedy_notifications_type_chk
    check (notification_type in ('friday_preview', 'saturday_reminder')),
  constraint shani_remedy_notifications_status_chk
    check (status in ('queued', 'sent', 'skipped', 'failed'))
);

create unique index if not exists shani_remedy_notifications_once_idx
  on public.shani_remedy_notifications(membership_id, channel, notification_type, remedy_date);

create index if not exists shani_remedy_notifications_user_created_idx
  on public.shani_remedy_notifications(user_key, created_at desc);

create index if not exists shani_remedy_notifications_status_created_idx
  on public.shani_remedy_notifications(status, created_at desc);

alter table public.shani_remedy_notifications enable row level security;

create policy "service role manages shani_remedy_notifications"
  on public.shani_remedy_notifications for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
