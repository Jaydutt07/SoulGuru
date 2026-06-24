# SoulGuru

SoulGuru is a mobile-first astrology mentorship app with daily Soul Guru guidance, Astro Solves, Shani/Saade Sati tracking, numerology, Harmony compatibility, and a More Guidance membership flow.

## Current Stack

- Frontend: React + Vite
- Mobile shell: Capacitor Android
- Backend API: Vercel serverless functions in `api/`
- Database/cache: Supabase
- AI: OpenAI Responses API
- Astrology engine: `astronomy-engine` with sidereal sign context

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev -- --port 5173
```

Add secrets to `.env`. Never commit `.env`.

Required for AI readings:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
SOUL_WISDOM_ALLOW_UNCACHED=false
ASTRO_SOLVE_MODEL=gpt-5.5
ASTRO_SOLVES_ALLOW_LOCAL_QUOTA=false
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

Required for production daily-reading cache:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SOUL_WISDOM_RATE_LIMIT=20
USER_PROFILE_RATE_LIMIT=60
OTP_RATE_LIMIT=10
OTP_HASH_SECRET=replace-with-at-least-32-random-characters
```

Required for APK builds that should call the deployed backend:

```bash
VITE_API_BASE_URL=https://your-vercel-app.vercel.app
```

Check a mobile backend URL before building a phone APK:

```bash
npm run mobile:check-backend
```

The mobile backend check validates HTTPS, rejects localhost/private LAN hosts unless explicitly allowed, checks `/api/health`, and requires deployed `/api/readiness` to be ready. For local or staging phone tests against an intentionally incomplete backend, run `node scripts/validate-mobile-backend.mjs --allow-not-ready`.

Check server-side production readiness from local env:

```bash
npm run production:check
```

Run the combined release readiness bundle:

```bash
npm run release:check:local
npm run release:check -- --url=https://your-vercel-app.vercel.app --include-ai --include-android-signing
```

`release:check:local` runs the same local build, safety, smoke, quality, audit, and readiness reports while skipping external services that are not configured yet. `release:check` is strict and expects production env, Supabase schema, deployed backend smoke, mobile backend URL, and optional live AI/signing checks when those flags are supplied.

Check public `VITE_` env vars for accidental server-secret exposure:

```bash
npm run public-env:check
npm run public-env:check:strict
```

Check `.env.example`, production fallback defaults, and the public env allowlist against the app env manifest:

```bash
npm run env:check
```

Check the Vercel deployment config and deploy-ignore safety rules:

```bash
npm run deployment:check
```

Check chart/transit calculation, place resolution, timezone handling, and Saade Sati windows:

```bash
npm run astrology:check
```

Check Harmony compatibility against sidereal birth-chart placements:

```bash
npm run compatibility:check
```

Check Clerk auth behavior and production client login rules, including fail-closed required auth, backend identity injection, server-profile-first login, and profile persistence before account creation completes:

```bash
npm run auth:check
```

Check backend user profile persistence, lookup, and OTP-phone-to-auth account merging:

```bash
npm run profile:check
```

Check Pinecone/OpenAI memory behavior, hashed namespaces, sanitized metadata, and safe degradation:

```bash
npm run memory:check
```

Check Upstash rate limiting, hashed Redis keys, pipeline requests, and degraded behavior:

```bash
npm run rate-limit:check
```

Check the production readiness report contract:

```bash
npm run readiness:check
```

Check Sentry/PostHog initialization and analytics privacy behavior:

```bash
npm run observability:check
```

Check Resend email payloads, skips, errors, and membership email escaping:

```bash
npm run email:check
```

Check Supabase migration SQL for required tables, columns, RLS, indexes, and idempotency:

```bash
npm run supabase:migrations:check
```

After applying Supabase migrations, verify the live database schema:

```bash
npm run supabase:schema:check
```

Check tracked files and the local debug APK for accidentally exposed secrets or generated artifacts:

```bash
npm run security:check
```

Check the Razorpay payment/signature contract without contacting Razorpay or writing to Supabase:

```bash
npm run payments:check
```

Check the paid More Guidance subscription/cache contract without contacting OpenAI or Supabase:

```bash
npm run more-guidance:check
```

Check the mobile backend validator contract with local mock backends:

```bash
npm run mobile:backend:check
```

Check the daily Soul Guru cache contract without contacting OpenAI or Supabase:

```bash
npm run soul:cache:check
```

Check the Astro Solves allowance/storage contract without contacting OpenAI or Supabase:

```bash
npm run astro:check
```

Check the OTP hashing, delivery, attempts, and expiry contract without sending messages:

```bash
npm run otp:check
```

Smoke-test the local backend/API routes without spending OpenAI tokens:

```bash
npm run local:smoke
```

Run the same local smoke with live Soul Wisdom and Astro Solves AI calls:

```bash
npm run local:smoke:ai
```

Check Soul Guru reading quality, word count, banned repeated phrasing, and similarity across five profiles:

```bash
npm run soul:quality
```

Run the same quality gate with live OpenAI Soul Guru readings:

```bash
npm run soul:quality:ai
```

Smoke-test a deployed backend URL:

```bash
npm run deployment:smoke -- --url=https://your-vercel-app.vercel.app
npm run deployment:smoke -- --url=https://your-vercel-app.vercel.app --expect-ready
```

The deployed smoke checks `/api/health`, `/api/readiness`, profile lookup, and the More Guidance dashboard contract without sending OTPs, creating payments, writing saved guidance, or spending OpenAI tokens. In non-ready smoke runs, protected `401` responses prove route reachability. In `--expect-ready` runs, pass `--auth-token=...` or set `DEPLOYMENT_SMOKE_AUTH_TOKEN`; protected POST routes must validate with real authentication before the smoke can pass.

## Continuous Integration

The ready-to-use GitHub Actions workflow template lives at `docs/github-actions-ci.yml`. To activate it, copy it to `.github/workflows/ci.yml` using GitHub credentials with `workflow` scope.

Check the CI template includes the release and mobile gates:

```bash
npm run ci:check
```

The CI template checks:

- `npm run ci:check`
- `npm run soul:quality`
- `npm run env:check`
- `npm run deployment:check`
- `npm run astrology:check`
- `npm run compatibility:check`
- `npm run auth:check`
- `npm run memory:check`
- `npm run rate-limit:check`
- `npm run readiness:check`
- `npm run observability:check`
- `npm run email:check`
- `npm run supabase:migrations:check`
- `npm run soul:cache:check`
- `npm run astro:check`
- `npm run otp:check`
- `npm run build`
- `npm run public-env:check`
- `npm run security:check`
- `npm run payments:check`
- `npm run more-guidance:check`
- `npm run mobile:backend:check`
- `npm run local:smoke`
- `npm audit --omit dev`
- `npm run production:check -- --allow-fail`
- Android debug APK build plus `npm run security:check`

If the repository secret `OPENAI_API_KEY` is configured, the workflow also runs `npm run soul:quality:ai` for live prompt-quality regression checks. The secret is used only inside the CI job and is not bundled into the frontend or APK.

If `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured in CI, run `npm run supabase:schema:check` after applying migrations to prove the live database still matches the app table, column, index, and uniqueness-constraint contract.

## Supabase Setup

Run the migrations in `supabase/migrations/` inside your Supabase project SQL editor or migration pipeline. The core migrations create:

- `user_profiles`
- `daily_soul_readings`
- `more_guidance_subscriptions`
- `saved_guidance`
- `astro_solve_questions`
- `payment_events`
- `auth_otp_challenges`
- `more_guidance_readings`

`002_payment_events.sql` adds payment event storage and subscription provider metadata for Razorpay webhook idempotency. The later provider indexes keep both Razorpay payment ids and subscription ids idempotent, so webhook replays cannot create duplicate More Guidance memberships.

The server uses `SUPABASE_SERVICE_ROLE_KEY` only in backend code. Do not expose it to the browser or APK.

## Backend API

`POST /api/auth-otp`

Requests and verifies backend-controlled OTP challenges. With Supabase configured, OTP codes are stored as HMAC-SHA256 hashes in `auth_otp_challenges` before delivery is attempted, require a 32+ character `OTP_HASH_SECRET`, expire after `OTP_EXPIRY_MINUTES`, and enforce `OTP_MAX_ATTEMPTS`. Delivery uses `OTP_SMS_WEBHOOK_URL` when configured, otherwise Resend email when an email is available. Local development can fall back to demo OTP.

`POST /api/soul-wisdom`

Creates or returns the cached daily Soul Guru reading for a user/date. Production requires Supabase-backed caching in `daily_soul_readings`, checks the cache first, and only calls OpenAI on cache miss. `SOUL_WISDOM_ALLOW_UNCACHED=true` is only for isolated local quality testing. The reading context uses the user's resolved birth place, coordinates, and timezone silently so the final Words of Wisdom stay personal without mentioning astrology. If Upstash is configured, this endpoint is rate-limited server-side.

The production client only displays and locally caches Soul Guru readings that came from the backend daily-reading contract. Development builds can use local fallback guidance, but production builds reject unstored or local-fallback readings so users do not mistake demo text for the real daily guidance.

`POST /api/user-profile`

Creates, updates, or looks up a user profile in Supabase using the backend service role. The app uses this after OTP login and account creation so birth details are persisted server-side instead of only in local storage.

`POST /api/create-razorpay-order`

Creates a Razorpay checkout order for Soul Guru + Astro Solve. The backend owns the plan price from `MORE_GUIDANCE_PRICE_PAISE` and INR currency; client-supplied amount/currency values are ignored. The request must include a stable SoulGuru user identity (`authUserId`, `id`, phone, or email), so paid access is never issued to an anonymous key. The browser receives the public order details and a backend-signed order token; `RAZORPAY_KEY_SECRET` stays on the server.

`POST /api/verify-razorpay-payment`

Verifies the Razorpay checkout return signature, backend-signed order token, stable user identity, and configured plan amount/currency before the app marks More Guidance active. This protects the client-side activation path from cross-user payment reuse, anonymous paid unlocks, or underpriced order tampering while the webhook remains the durable payment event source.

`POST /api/razorpay-webhook`

Verifies `x-razorpay-signature` using `RAZORPAY_WEBHOOK_SECRET`, stores the provider event, and activates the 3-month More Guidance subscription once for successful payment events that include a stable SoulGuru user identity in Razorpay notes or payment contact details. Production webhook processing requires Supabase event storage; unstored webhook events are allowed only when `PAYMENTS_ALLOW_LOCAL_ACTIVATION=true` is explicitly set for isolated local testing.

`POST /api/astro-solve`

Creates a detailed Astro Solves answer using OpenAI, chart/transit context, and quota checks. Free users get 3 questions; More Guidance users get 15 additional questions. Production requires Supabase-backed counting and storage in `astro_solve_questions`; if subscription or question-count checks fail, the route does not call OpenAI. `ASTRO_SOLVES_ALLOW_LOCAL_QUOTA=true` is only for isolated local testing.

`POST /api/guidance-memory`

Server-only Pinecone memory route. It upserts saved guidance, daily readings, and Astro Solves answers, or searches relevant memories for future Soul Guru readings. If Pinecone is not configured, the route degrades safely without exposing keys to the app.

`POST /api/more-guidance`

Loads the More Guidance dashboard from Supabase, including subscription status, 3-month tracking progress, reading history, and saved advice. Dashboard reads fail closed instead of returning empty synced data when subscription, history, or saved-advice state cannot be loaded. It also creates the paid deeper guidance map and saves advice into `saved_guidance`. Production requires persisted subscription access and daily caching in `more_guidance_readings`; `MORE_GUIDANCE_ALLOW_LOCAL_ACCESS=true` is only for isolated local testing. Production builds must also keep `VITE_LOCAL_PAID_FALLBACK=false` so paid access, history, saved advice, and deeper readings come from the backend.

`GET /api/health`

Basic API health check for deployment.

`GET /api/readiness`

Safe deployment readiness report. It returns no secret values, only pass/fail metadata for OpenAI, Supabase, OTP delivery, Razorpay, rate limiting, Pinecone, Clerk, and observability configuration. The endpoint reports `ready` only when the full planned production stack is configured.

## Payments And Emails

For Razorpay:

```bash
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RAZORPAY_VERIFY_RATE_LIMIT=20
PAYMENTS_ALLOW_LOCAL_ACTIVATION=false
MORE_GUIDANCE_ALLOW_LOCAL_ACCESS=false
MORE_GUIDANCE_PRICE_PAISE=49900
```

Keep `PAYMENTS_ALLOW_LOCAL_ACTIVATION=false` and `MORE_GUIDANCE_ALLOW_LOCAL_ACCESS=false` outside isolated local testing. Real More Guidance purchases must be persisted in Supabase before the app unlocks paid guidance.

For confirmation emails:

```bash
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

For phone OTP delivery, configure your SMS provider behind a webhook:

```bash
OTP_SMS_WEBHOOK_URL=
OTP_SMS_WEBHOOK_TOKEN=
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=5
OTP_DEMO_ENABLED=false
```

Run all Supabase migrations. `002_payment_events.sql` adds idempotent webhook event storage and provider metadata on subscriptions. `003_astro_solves_metadata.sql` adds Astro Solves model, prompt, profile, and astrology context fields. `004_saved_guidance_profile.sql` links saved guidance to user profiles. `005_auth_otp_challenges.sql` adds backend OTP challenge storage. `006_unique_subscription_payments.sql` keeps Razorpay payment activation idempotent. `007_birth_place_resolution.sql` stores resolved birth timezone and place metadata for location-aware readings. `008_more_guidance_readings.sql` adds daily caching for paid deeper guidance maps. `009_unique_subscription_provider_ids.sql` keeps Razorpay subscription lifecycle events idempotent. `010_schema_contract_rpc.sql` adds a service-role-only schema metadata RPC for live deployment verification. `011_schema_contract_constraints.sql` extends that RPC so live checks can verify primary-key and unique constraints.

Then run:

```bash
npm run supabase:schema:check
```

This read-only check uses the service role key to verify all production tables, columns, critical indexes, and uniqueness constraints needed for daily Soul Guru caching, OTP login, paid More Guidance, saved advice, Astro Solves, and Razorpay payment events.

## Observability

Optional public keys:

```bash
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=https://app.posthog.com
VITE_SENTRY_DSN=
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
```

The frontend disables PostHog autocapture/pageviews by default and strips phone numbers, emails, names, OTPs, tokens, keys, and birth details from tracked event properties.

## Pinecone Memory

Optional long-term guidance memory:

```bash
PINECONE_API_KEY=
PINECONE_INDEX=
PINECONE_HOST=
PINECONE_TOP_K=4
GUIDANCE_MEMORY_RATE_LIMIT=60
```

Create a Pinecone index that matches the configured OpenAI embedding model. The backend uses `PINECONE_HOST` for REST upsert/query calls and stores user memory in hashed per-user namespaces.

## OTP And Clerk Auth

The local app can show a demo OTP when Supabase/SMS delivery is unavailable. Production builds must keep both `OTP_DEMO_ENABLED=false` and `VITE_LOCAL_AUTH_FALLBACK=false`; strict public env checks fail if local OTP fallback is enabled for release. In production, configure Supabase plus an SMS webhook or Resend fallback for OTP delivery. For authenticated API protection, configure Clerk and set:

```bash
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_REQUIRE_AUTH=true
CLERK_JWT_AUDIENCE=
CLERK_AUTHORIZED_PARTIES=
```

When `CLERK_SECRET_KEY` is present, backend routes verify Bearer tokens and use Clerk's user ID as `auth_user_id`. When `CLERK_REQUIRE_AUTH=true`, AI and payment routes reject unauthenticated requests.

## Android APK

Debug APK output:

```bash
npm run android:apk
```

Current built debug artifact:

```text
SoulGuru-debug.apk
```

The Android scripts auto-detect common Homebrew JDK and Android SDK paths. If your machine uses a custom install, set `JAVA_HOME`, `ANDROID_HOME`, and `ANDROID_SDK_ROOT` before building.

Important: do not put `OPENAI_API_KEY` inside the Android app. Mobile builds must call the deployed backend API.
Set `VITE_API_BASE_URL` to the deployed Vercel URL before building a backend-connected APK. Without it, the local debug APK uses the in-app fallback reading when `/api/soul-wisdom` is not reachable.
Run `npm run public-env:check:strict` before any web or mobile release so server-only keys cannot be exposed through public `VITE_` variables.

For phone testing before Vercel deployment, run the backend on your Mac's Wi-Fi/LAN address:

```bash
npm run dev:lan
```

In a second terminal, build a phone APK that points at that LAN backend:

```bash
npm run android:apk:local
```

That command auto-detects your Mac's LAN IP and builds `SoulGuru-debug.apk` with `VITE_API_BASE_URL=http://YOUR_LAN_IP:5173`. Your phone and Mac must be on the same network, and the dev server must stay running while you test AI/backend features on the phone.

Use this command for the APK you want to test on a phone after Vercel is deployed:

```bash
npm run android:apk:backend
```

That command refuses to build if `VITE_API_BASE_URL` is missing, points at localhost, is not HTTPS, fails `/api/health`, or reports a non-ready `/api/readiness` payload. Use `npm run android:apk:local` for LAN phone testing before production services are configured.

Signed release outputs:

```bash
npm run android:release:check
npm run android:aab:release
npm run android:apk:release
```

Use `android:aab:release` for Play Store submission and `android:apk:release` for a directly installable signed APK. The release scripts require a deployed HTTPS backend, a passing `/api/health`, and local Android signing variables:

```bash
ANDROID_KEYSTORE_PATH=/absolute/path/to/soulguru-release.jks
ANDROID_KEYSTORE_PASSWORD=
ANDROID_KEY_ALIAS=soulguru
ANDROID_KEY_PASSWORD=
```

The release build wrapper loads these values from `.env` or shell env and passes them to Gradle only during the local build. Keep the keystore outside git; `npm run security:check` fails if APK/AAB artifacts or signing key material are tracked.

## Production Notes

Before release:

- Deploy backend to Vercel and configure env vars there.
- Configure Supabase project and run migrations.
- Run `npm run supabase:schema:check` against the Supabase project.
- Run `npm run public-env:check:strict`.
- Run `npm run deployment:check`.
- Run `npm run astrology:check`.
- Run `npm run auth:check`.
- Run `npm run memory:check`.
- Run `npm run rate-limit:check`.
- Run `npm run readiness:check`.
- Run `npm run observability:check`.
- Run `npm run email:check`.
- Run `npm run supabase:migrations:check`.
- Run `npm run production:check` locally and verify `/api/readiness` on the deployed backend.
- Run `npm run security:check` before committing or sharing APK builds.
- Run `npm run payments:check`.
- Run `npm run more-guidance:check`.
- Run `npm run mobile:backend:check`.
- Run `npm run deployment:smoke:check`.
- Run `npm run soul:cache:check`.
- Run `npm run astro:check`.
- Run `npm run otp:check`.
- Run `npm run soul:quality` and `npm run soul:quality:ai` before release after prompt changes.
- Run `npm run deployment:smoke -- --url=https://your-vercel-app.vercel.app --expect-ready` with `--auth-token=...` or `DEPLOYMENT_SMOKE_AUTH_TOKEN` when production Clerk auth is enabled.
- Run `npm run release:check -- --url=https://your-vercel-app.vercel.app --include-ai --include-android-signing`.
- Set `VITE_API_BASE_URL` to the deployed backend and run `npm run android:aab:release` or `npm run android:apk:release`.
- Configure Clerk production auth and set `CLERK_REQUIRE_AUTH=true`.
- Configure Razorpay dashboard webhook for `/api/razorpay-webhook`.
- Configure Pinecone index and `PINECONE_HOST` for long-term guidance memory.
- Add PostHog/Sentry public keys only where appropriate.
