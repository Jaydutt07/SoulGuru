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
- Production-gated client login flow requiring server profile persistence before account creation enters the app
- Backend profile merge contracts for OTP phone profiles and authenticated identities
- Server birth-place geocoder hook for uncatalogued locations before chart calculations
- Shared profile linking for Soul Guru, Astro Solves, More Guidance, and saved advice writes
- Server-backed OTP challenge route with Supabase storage and optional SMS/email delivery
- Offline OTP hashing, delivery, attempts, and expiry contract checker
- Production-gated OTP HMAC secret strength check before delivery or storage
- Supabase schema for idempotent Razorpay payment events and subscription provider metadata
- Daily Soul Guru cache service with Supabase lookup/upsert
- Offline daily Soul Guru cache contract checker for Supabase hit/miss behavior
- Optional Upstash-backed rate limit helper for paid/AI endpoints
- Emergency in-memory rate-limit fallback when configured Upstash checks fail
- Offline Upstash rate-limit contract checker with hashed Redis keys and degraded fallback behavior
- Razorpay order route and signature-verified webhook route
- Razorpay checkout return verification before local subscription activation
- Backend-signed Razorpay order token binding checkout verification to the same SoulGuru user
- Frontend Razorpay checkout contract so More Guidance activation stays backend-verified and server-secret free
- Production-gated Razorpay checkout activation requiring persisted Supabase subscription storage
- Offline Razorpay order, checkout signature, and webhook contract checker
- Resend helper for subscription confirmation emails
- Offline Resend email contract checker for API payloads, configured-env gating, errors, skips, and membership email escaping
- Optional PostHog and Sentry frontend hooks with privacy-safe user properties
- Server-side Sentry envelope capture for sanitized 5xx API failures
- Offline Sentry/PostHog observability contract checker for initialization, backend API capture, and analytics privacy
- Server-side Astro Solves route with OpenAI answer generation, quota checks, and Supabase storage
- Offline Astro Solves quota, paid-bonus, storage, and memory contract checker
- Optional Clerk Bearer-token verification for AI/payment routes with production auth enforcement switch
- Optional ClerkJS frontend bridge so configured production sessions send Bearer tokens to backend routes
- Settings drawer Clerk secure-session status and account controls for strict backend auth rollout
- Offline Clerk auth contract checker with fail-closed required-auth behavior
- Offline API route auth matrix checker so private Soul Guru, payment, profile, memory, More Guidance, and Shani routes cannot bypass verified identity
- Optional Pinecone vector memory route with OpenAI embeddings for saved guidance, daily readings, and Astro Solves context
- Offline Pinecone/OpenAI memory contract checker for hashed namespaces, metadata sanitization, prompt-safe memory context, and degraded behavior
- Server-backed More Guidance dashboard and saved advice persistence
- Offline More Guidance subscription, daily-cache, and paid-memory contract checker
- Production-gated local OTP fallback so demo login cannot silently replace backend OTP in release builds
- Production-gated local account/session persistence so stored browser records cannot replace backend OTP/profile identity
- Production-gated local paid fallback so More Guidance unlocks from server payment/subscription state
- Paid More Guidance deep reading generation with daily Supabase caching
- Backend-connected APK guardrail that validates `VITE_API_BASE_URL` before mobile builds
- Mobile backend readiness guard that requires deployed `/api/readiness` to be ready before production phone builds
- Local-LAN APK build helper for phone testing against the Mac dev backend
- Signed Android release APK/AAB scripts with keystore validation and artifact secret scanning
- Production readiness endpoint and CLI checks for backend env configuration
- Production readiness contract checker requiring the full planned stack before `/api/readiness` returns ready
- Production Soul Guru cache guard so daily AI readings require Supabase persistence
- Production client guard so Soul Guru does not display or cache unstored local fallback readings
- Extended Soul Guru local reading diversity gate across a broader profile fixture set
- Production Astro Solves quota guard so real answers require Supabase persistence
- Production More Guidance paid-access guard so deeper readings require persisted subscription and cache state
- Production-gated Shani remedy member preview so Pandit chat cannot unlock from local account state
- Supabase schema for Shani remedy memberships and stored Pandit guidance history
- Server-backed Shani dashboard and Pandit route with fail-closed membership, OpenAI, and storage guards
- Member-only Shani remedy guide map with phase focus, seven-day guidance, monthly action, practices, and renewal timing
- Offline Shani contract checker for local-access flags, persisted membership checks, and stored Pandit answers
- Live Supabase schema checker for migration/table/column/index/constraint contract verification
- Public Vite env safety checker to keep server secrets out of browser/APK builds
- Local backend smoke-test script for API contract checks before APK testing
- Vercel deployment config plus deployed backend smoke-test script for health, readiness, profile lookup, More Guidance dashboard, and Shani dashboard
- Vercel CSP/security/cache headers for browser hardening, no-store API responses, and immutable asset caching
- Strict deployed backend smoke contract so production-ready checks require authenticated protected POST routes
- Combined release readiness runner for local and strict production preflight checks
- API request parsing contract for malformed JSON, body-size limits, client-error status codes, and sanitized server-error payloads
- Workflow-ready GitHub Actions CI template for web/API contracts, local smoke, Soul Guru diversity gates, APK build, and APK secret scanning
- Environment manifest contract for Vercel/mobile env setup and safe fallback defaults
- Generated production env checklist for Vercel/provider setup that stays secret-safe and follows readiness requirements
- Shared OpenAI backend timeout/retry policy for Responses and Embeddings requests
- Shared backend fetch timeout policy for external REST vendors and smoke-safe contract coverage
- Astronomy-based birth/transit context replacing hash-only astrology
- Offline astrology engine contract checker for place resolution, timezone handling, sidereal placements, daily transits, and Saade Sati windows
- Server-side birth place geocoding enrichment for uncatalogued profile locations
- Runtime birth-place geocoder validation for HTTPS provider config, real user agents, valid coordinate ranges, and usable place labels
- Runtime transactional email validation for safe recipients, subjects, and normalized Resend tags
- Soul Guru v11 daily wisdom prompt with private paragraph architecture, stricter live repair checks, whole-sentence cache refreshes, and structure-similarity gates
- Sidereal chart-based Harmony compatibility with offline contract coverage
- Location-aware birth place resolution with timezone-safe chart dates
- More Guidance page with 3-month tracking, reading history, and saved advice
- Server-backed More Guidance tracking contract with days left, month status, progress, and milestones
- Fail-closed More Guidance dashboard reads so paid history and saved advice cannot silently disappear
- Fail-closed Astro Solves quota checks so unreadable subscription/count state cannot spend OpenAI or return uncounted answers
- Fail-closed Razorpay webhook processing unless local payment activation is explicitly enabled
- OTP challenge storage before delivery so users are not sent unverifiable codes
- Razorpay webhook replay repair for stored activation events and idempotent provider subscription lifecycle events
- Race-safe Razorpay subscription activation so unique database conflicts re-read the existing paid membership
- Server-owned More Guidance price and currency checks for Razorpay orders and checkout verification
- Stable paid identity checks so Razorpay orders, checkout activation, and webhooks cannot unlock anonymous subscriptions
- Server-owned Shani remedy plan prices and Razorpay checkout activation into `shani_remedy_memberships`
- Razorpay webhook activation for Shani remedy memberships with provider-payment idempotency
- Service-role Supabase schema contract RPC for live index verification
- Live Supabase uniqueness checks for daily Soul Guru cache, More Guidance cache, and payment event idempotency
- Vercel deployment contract checker for build settings, API route duration, CSP/security/cache headers, SPA rewrites, and upload exclusions
- Production domain and Cloudflare DNS readiness gate for the Namecheap/Cloudflare launch path
- Production domain smoke test for DNS resolution plus health/readiness checks through the custom HTTPS domain

## Next Implementation Steps

1. Create Supabase project and apply `supabase/migrations/001_initial_schema.sql`.
2. Apply `supabase/migrations/002_payment_events.sql`.
3. Apply `supabase/migrations/003_astro_solves_metadata.sql`.
4. Apply `supabase/migrations/004_saved_guidance_profile.sql`.
5. Apply `supabase/migrations/005_auth_otp_challenges.sql`.
6. Apply `supabase/migrations/006_unique_subscription_payments.sql`.
7. Apply `supabase/migrations/007_birth_place_resolution.sql`.
8. Apply `supabase/migrations/008_more_guidance_readings.sql`.
9. Apply `supabase/migrations/009_unique_subscription_provider_ids.sql`.
10. Apply `supabase/migrations/010_schema_contract_rpc.sql`.
11. Apply `supabase/migrations/011_schema_contract_constraints.sql`.
12. Apply `supabase/migrations/012_shani_membership.sql`.
13. Run `npm run supabase:schema:check` against the Supabase project.
14. Run `npm run production:env:checklist` and use the generated checklist while configuring Vercel, Cloudflare, and provider dashboards.
15. Configure `PLACE_GEOCODER_URL` and `PLACE_GEOCODER_USER_AGENT` for accurate uncatalogued birth-place coordinates and timezones.
16. Deploy to Vercel with `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TIMEOUT_MS`, `OPENAI_MAX_RETRIES`, `ASTRO_SOLVE_MODEL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.
17. Attach the Namecheap production domain through Cloudflare DNS, set `PRODUCTION_DOMAIN`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_DNS_READY=true`, and point `VITE_API_BASE_URL` at that HTTPS domain.
18. Configure token-authenticated phone OTP delivery through `OTP_SMS_WEBHOOK_URL` and `OTP_SMS_WEBHOOK_TOKEN`, and set `RESEND_API_KEY` plus a valid `RESEND_FROM_EMAIL` for transactional membership emails.
19. Run `npm run production:check` and confirm deployed `/api/readiness` returns `ready`.
20. Run `npm run public-env:check:strict`.
21. Run `npm run payments:check`.
22. Run `npm run shani:check`.
23. Run `npm run production:domain:smoke -- --expect-ready` after the Cloudflare DNS and Vercel custom-domain setup are live.
24. Run `npm run deployment:smoke -- --url=https://your-production-domain.app --expect-ready` with `--auth-token=...` or `DEPLOYMENT_SMOKE_AUTH_TOKEN` when production Clerk auth is enabled.
25. Run `npm run release:check -- --url=https://your-production-domain.app --include-ai --include-android-signing`.
26. Set `VITE_API_BASE_URL` to the production domain and run `npm run android:apk:backend` for a backend-connected phone test.
27. Create a local Android release keystore, set `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD`, then run `npm run android:aab:release`.
28. Configure Clerk production auth, set `CLERK_SECRET_KEY`, and enable `CLERK_REQUIRE_AUTH=true`.
29. Configure Razorpay dashboard webhook for `/api/razorpay-webhook`, set `RAZORPAY_WEBHOOK_URL` and `RAZORPAY_WEBHOOK_READY=true`, and test payment event replay.
30. Configure Sentry, PostHog, Upstash, and Pinecone production environment variables. Use `SENTRY_DSN` for backend API error tracking and `VITE_SENTRY_DSN` for frontend error tracking.
