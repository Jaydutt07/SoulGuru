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

Run all Supabase migrations. `002_payment_events.sql` adds idempotent webhook event storage and provider metadata on subscriptions. `003_astro_solves_metadata.sql` adds Astro Solves model, prompt, profile, and astrology context fields.

## Observability

Optional public keys:

```bash
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=https://app.posthog.com
VITE_SENTRY_DSN=
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
```

The frontend avoids sending phone numbers or email addresses to analytics.

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
Set `VITE_API_BASE_URL` to the deployed Vercel URL before building a release APK/AAB. Without it, the local debug APK uses the in-app fallback reading when `/api/soul-wisdom` is not reachable.

## Production Notes

Before release:

- Deploy backend to Vercel and configure env vars there.
- Configure Supabase project and run migrations.
- Connect Clerk auth to production OTP and pass verified user identity into backend requests.
- Configure Razorpay dashboard webhook for `/api/razorpay-webhook`.
- Add PostHog/Sentry public keys only where appropriate.
- Replace debug APK with signed release APK/AAB.
