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
- Offline Supabase migration contract checker for required tables, columns, RLS, indexes, and idempotency
- Server-backed profile sync route for account birth details
- Server-backed OTP challenge route with Supabase storage and optional SMS/email delivery
- Offline OTP hashing, delivery, attempts, and expiry contract checker
- Supabase schema for idempotent Razorpay payment events and subscription provider metadata
- Daily Soul Guru cache service with Supabase lookup/upsert
- Offline daily Soul Guru cache contract checker for Supabase hit/miss behavior
- Optional Upstash-backed rate limit helper for paid/AI endpoints
- Offline Upstash rate-limit contract checker with hashed Redis keys and degraded-open behavior
- Razorpay order route and signature-verified webhook route
- Razorpay checkout return verification before local subscription activation
- Backend-signed Razorpay order token binding checkout verification to the same SoulGuru user
- Offline Razorpay order, checkout signature, and webhook contract checker
- Resend helper for subscription confirmation emails
- Offline Resend email contract checker for API payloads, errors, skips, and membership email escaping
- Optional PostHog and Sentry frontend hooks with privacy-safe user properties
- Offline Sentry/PostHog observability contract checker for initialization and analytics privacy
- Server-side Astro Solves route with OpenAI answer generation, quota checks, and Supabase storage
- Offline Astro Solves quota, paid-bonus, storage, and memory contract checker
- Optional Clerk Bearer-token verification for AI/payment routes with production auth enforcement switch
- Offline Clerk auth contract checker with fail-closed required-auth behavior
- Optional Pinecone vector memory route with OpenAI embeddings for saved guidance, daily readings, and Astro Solves context
- Offline Pinecone/OpenAI memory contract checker for hashed namespaces, metadata sanitization, prompt-safe memory context, and degraded behavior
- Server-backed More Guidance dashboard and saved advice persistence
- Offline More Guidance subscription, daily-cache, and paid-memory contract checker
- Production-gated local OTP fallback so demo login cannot silently replace backend OTP in release builds
- Production-gated local paid fallback so More Guidance unlocks from server payment/subscription state
- Paid More Guidance deep reading generation with daily Supabase caching
- Backend-connected APK guardrail that validates `VITE_API_BASE_URL` before mobile builds
- Mobile backend readiness guard that requires deployed `/api/readiness` to be ready before production phone builds
- Local-LAN APK build helper for phone testing against the Mac dev backend
- Signed Android release APK/AAB scripts with keystore validation and artifact secret scanning
- Production readiness endpoint and CLI checks for backend env configuration
- Live Supabase schema checker for migration/table/column contract verification
- Public Vite env safety checker to keep server secrets out of browser/APK builds
- Local backend smoke-test script for API contract checks before APK testing
- Vercel deployment config plus deployed backend smoke-test script for health, readiness, profile lookup, and More Guidance dashboard
- Combined release readiness runner for local and strict production preflight checks
- Astronomy-based birth/transit context replacing hash-only astrology
- Offline astrology engine contract checker for place resolution, timezone handling, sidereal placements, daily transits, and Saade Sati windows
- Location-aware birth place resolution with timezone-safe chart dates
- More Guidance page with 3-month tracking, reading history, and saved advice

## Next Implementation Steps

1. Create Supabase project and apply `supabase/migrations/001_initial_schema.sql`.
2. Apply `supabase/migrations/002_payment_events.sql`.
3. Apply `supabase/migrations/003_astro_solves_metadata.sql`.
4. Apply `supabase/migrations/004_saved_guidance_profile.sql`.
5. Apply `supabase/migrations/005_auth_otp_challenges.sql`.
6. Apply `supabase/migrations/006_unique_subscription_payments.sql`.
7. Apply `supabase/migrations/007_birth_place_resolution.sql`.
8. Apply `supabase/migrations/008_more_guidance_readings.sql`.
9. Run `npm run supabase:schema:check` against the Supabase project.
10. Deploy to Vercel with `OPENAI_API_KEY`, `OPENAI_MODEL`, `ASTRO_SOLVE_MODEL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.
11. Configure OTP delivery through `OTP_SMS_WEBHOOK_URL` or Resend email fallback.
12. Run `npm run production:check` and confirm deployed `/api/readiness` returns `ready`.
13. Run `npm run public-env:check:strict`.
14. Run `npm run payments:check`.
15. Run `npm run deployment:smoke -- --url=https://your-vercel-app.vercel.app --expect-ready`.
16. Run `npm run release:check -- --url=https://your-vercel-app.vercel.app --include-ai --include-android-signing`.
17. Set `VITE_API_BASE_URL` to the deployed Vercel URL and run `npm run android:apk:backend` for a backend-connected phone test.
18. Create a local Android release keystore, set `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD`, then run `npm run android:aab:release`.
19. Configure Clerk production auth, set `CLERK_SECRET_KEY`, and enable `CLERK_REQUIRE_AUTH=true`.
20. Configure Razorpay dashboard webhook for `/api/razorpay-webhook` and test payment event replay.
21. Configure Sentry, PostHog, Upstash, and Pinecone production environment variables.
22. Add Cloudflare DNS once the Vercel deployment URL and production domain are ready.
