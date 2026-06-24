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
ASTRO_SOLVE_MODEL=gpt-5.5
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

Required for production daily-reading cache:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SOUL_WISDOM_RATE_LIMIT=20
```

Required for APK builds that should call the deployed backend:

```bash
VITE_API_BASE_URL=https://your-vercel-app.vercel.app
```

Check a mobile backend URL before building a phone APK:

```bash
npm run mobile:check-backend
```

## Supabase Setup

Run the migrations in `supabase/migrations/` inside your Supabase project SQL editor or migration pipeline. `001_initial_schema.sql` creates:

- `user_profiles`
- `daily_soul_readings`
- `more_guidance_subscriptions`
- `saved_guidance`
- `astro_solve_questions`

`002_payment_events.sql` adds payment event storage and subscription provider metadata for Razorpay webhook idempotency.

The server uses `SUPABASE_SERVICE_ROLE_KEY` only in backend code. Do not expose it to the browser or APK.

## Backend API

`POST /api/soul-wisdom`

Creates or returns the cached daily Soul Guru reading for a user/date. If Supabase is configured, it checks `daily_soul_readings` first and only calls OpenAI on cache miss. If Upstash is configured, this endpoint is rate-limited server-side.

`POST /api/create-razorpay-order`

Creates a Razorpay checkout order for Soul Guru + Astro Solve. The browser receives the public order details only; `RAZORPAY_KEY_SECRET` stays on the server.

`POST /api/razorpay-webhook`

Verifies `x-razorpay-signature` using `RAZORPAY_WEBHOOK_SECRET`, stores the provider event, and activates the 3-month More Guidance subscription once for successful payment events.

`POST /api/astro-solve`

Creates a detailed Astro Solves answer using OpenAI, chart/transit context, and quota checks. Free users get 3 questions; More Guidance users get 15 additional questions. If Supabase is configured, the answer is stored in `astro_solve_questions`.

`POST /api/guidance-memory`

Server-only Pinecone memory route. It upserts saved guidance, daily readings, and Astro Solves answers, or searches relevant memories for future Soul Guru readings. If Pinecone is not configured, the route degrades safely without exposing keys to the app.

`POST /api/more-guidance`

Loads the More Guidance dashboard from Supabase and saves advice into `saved_guidance`. This gives the paid page server-backed subscription status, reading history, and saved advice when Supabase is configured, while preserving local fallback behavior during development.

`GET /api/health`

Basic API health check for deployment.

## Payments And Emails

For Razorpay:

```bash
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
MORE_GUIDANCE_PRICE_PAISE=49900
```

For confirmation emails:

```bash
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

Run all Supabase migrations. `002_payment_events.sql` adds idempotent webhook event storage and provider metadata on subscriptions. `003_astro_solves_metadata.sql` adds Astro Solves model, prompt, profile, and astrology context fields. `004_saved_guidance_profile.sql` links saved guidance to user profiles.

## Observability

Optional public keys:

```bash
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=https://app.posthog.com
VITE_SENTRY_DSN=
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
```

The frontend avoids sending phone numbers or email addresses to analytics.

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

## Clerk Auth

The local app keeps the demo OTP flow for quick testing. In production, configure Clerk and set:

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

Important: do not put `OPENAI_API_KEY` inside the Android app. Mobile builds must call the deployed backend API.
Set `VITE_API_BASE_URL` to the deployed Vercel URL before building a backend-connected APK. Without it, the local debug APK uses the in-app fallback reading when `/api/soul-wisdom` is not reachable.

Use this command for the APK you want to test on a phone after Vercel is deployed:

```bash
npm run android:apk:backend
```

That command refuses to build if `VITE_API_BASE_URL` is missing, points at localhost, is not HTTPS, or fails `/api/health`.

## Production Notes

Before release:

- Deploy backend to Vercel and configure env vars there.
- Configure Supabase project and run migrations.
- Set `VITE_API_BASE_URL` to the deployed backend and run `npm run android:apk:backend`.
- Configure Clerk production auth and set `CLERK_REQUIRE_AUTH=true`.
- Configure Razorpay dashboard webhook for `/api/razorpay-webhook`.
- Configure Pinecone index and `PINECONE_HOST` for long-term guidance memory.
- Add PostHog/Sentry public keys only where appropriate.
- Replace debug APK with signed release APK/AAB.
