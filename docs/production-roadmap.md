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
- Daily Soul Guru cache service with Supabase lookup/upsert
- Astronomy-based birth/transit context replacing hash-only astrology
- More Guidance page with 3-month tracking, reading history, and saved advice

## Next Implementation Steps

1. Create Supabase project and apply `supabase/migrations/001_initial_schema.sql`.
2. Deploy to Vercel with `OPENAI_API_KEY`, `OPENAI_MODEL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.
3. Add Clerk auth and map Clerk user IDs to `user_profiles.auth_user_id`.
4. Add Razorpay subscriptions:
   - checkout order API
   - webhook signature verification
   - membership activation in `more_guidance_subscriptions`
5. Add server-side Astro Solves endpoint with subscription quota enforcement.
6. Add Resend transactional emails for OTP/account and subscription confirmations.
7. Add Sentry and PostHog with privacy-safe event names.
8. Add Upstash rate limits to AI endpoints.
9. Add Pinecone only after there is enough saved guidance/history to make retrieval useful.
