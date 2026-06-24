create unique index if not exists subscriptions_provider_payment_unique_idx
  on public.more_guidance_subscriptions(provider, provider_payment_id)
  where provider_payment_id is not null;
