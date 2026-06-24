# SoulGuru Production Roadmap

This project is being built toward the stack shown in the product planning image:

- Supabase: backend database and daily reading cache
- Vercel: deployment
- GitHub: version control
- Clerk: auth
- Razorpay: paid memberships
- Resend: email
- Cloudflare: DNS
- PostHog: analytics
- Sentry: error tracking
- Upstash: Redis for rate limiting and fast cache
- Pinecone: vector memory/search for long-term guidance context

## Completed Foundation

- Mobile-first React app
- Android Capacitor project and debug APK
- Vercel-compatible API route for Soul Guru readings
- Supabase schema for users, cached readings, subscriptions, saved advice, and Astro Solves
- Supabase schema for idempotent Razorpay payment events and subscription provider metadata
- Daily Soul Guru cache service with Supabase lookup/upsert
- Optional Upstash-backed rate limit helper for paid/AI endpoints
- Razorpay order route and signature-verified webhook route
- Resend helper for subscription confirmation emails
- Optional PostHog and Sentry frontend hooks with privacy-safe user properties
- Astronomy-based birth/transit context replacing hash-only astrology
- More Guidance page with 3-month tracking, reading history, and saved advice

## Next Implementation Steps

1. Create Supabase project and apply `supabase/migrations/001_initial_schema.sql`.
2. Apply `supabase/migrations/002_payment_events.sql`.
3. Deploy to Vercel with `OPENAI_API_KEY`, `OPENAI_MODEL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.
4. Add Clerk auth and map Clerk user IDs to `user_profiles.auth_user_id`.
5. Configure Razorpay dashboard webhook for `/api/razorpay-webhook` and test payment event replay.
6. Add server-side Astro Solves endpoint with subscription quota enforcement.
7. Add Resend transactional emails for OTP/account in addition to membership confirmations.
8. Configure Sentry, PostHog, and Upstash production environment variables.
9. Add Pinecone only after there is enough saved guidance/history to make retrieval useful.
