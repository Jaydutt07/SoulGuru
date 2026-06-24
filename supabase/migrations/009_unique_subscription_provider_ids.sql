create unique index if not exists subscriptions_provider_subscription_unique_idx
  on public.more_guidance_subscriptions(provider, provider_subscription_id)
  where provider_subscription_id is not null;
