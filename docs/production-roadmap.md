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
- Server-backed profile sync route for account birth details
- Server-backed OTP challenge route with Supabase storage and optional SMS/email delivery
- Supabase schema for idempotent Razorpay payment events and subscription provider metadata
- Daily Soul Guru cache service with Supabase lookup/upsert
- Optional Upstash-backed rate limit helper for paid/AI endpoints
- Razorpay order route and signature-verified webhook route
- Resend helper for subscription confirmation emails
- Optional PostHog and Sentry frontend hooks with privacy-safe user properties
- Server-side Astro Solves route with OpenAI answer generation, quota checks, and Supabase storage
- Optional Clerk Bearer-token verification for AI/payment routes with production auth enforcement switch
- Optional Pinecone vector memory route with OpenAI embeddings for saved guidance, daily readings, and Astro Solves context
- Server-backed More Guidance dashboard and saved advice persistence
- Backend-connected APK guardrail that validates `VITE_API_BASE_URL` before mobile builds
- Astronomy-based birth/transit context replacing hash-only astrology
- More Guidance page with 3-month tracking, reading history, and saved advice

## Next Implementation Steps

1. Create Supabase project and apply `supabase/migrations/001_initial_schema.sql`.
2. Apply `supabase/migrations/002_payment_events.sql`.
3. Apply `supabase/migrations/003_astro_solves_metadata.sql`.
4. Apply `supabase/migrations/004_saved_guidance_profile.sql`.
5. Apply `supabase/migrations/005_auth_otp_challenges.sql`.
6. Deploy to Vercel with `OPENAI_API_KEY`, `OPENAI_MODEL`, `ASTRO_SOLVE_MODEL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.
7. Configure OTP delivery through `OTP_SMS_WEBHOOK_URL` or Resend email fallback.
8. Set `VITE_API_BASE_URL` to the deployed Vercel URL and run `npm run android:apk:backend`.
9. Configure Clerk production auth, set `CLERK_SECRET_KEY`, and enable `CLERK_REQUIRE_AUTH=true`.
10. Configure Razorpay dashboard webhook for `/api/razorpay-webhook` and test payment event replay.
11. Configure Sentry, PostHog, Upstash, and Pinecone production environment variables.
12. Add Cloudflare DNS once the Vercel deployment URL and production domain are ready.
