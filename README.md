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
```

Required for production daily-reading cache:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## Supabase Setup

Run the migration in `supabase/migrations/001_initial_schema.sql` inside your Supabase project SQL editor or migration pipeline. It creates:

- `user_profiles`
- `daily_soul_readings`
- `more_guidance_subscriptions`
- `saved_guidance`
- `astro_solve_questions`

The server uses `SUPABASE_SERVICE_ROLE_KEY` only in backend code. Do not expose it to the browser or APK.

## Backend API

`POST /api/soul-wisdom`

Creates or returns the cached daily Soul Guru reading for a user/date. If Supabase is configured, it checks `daily_soul_readings` first and only calls OpenAI on cache miss.

`GET /api/health`

Basic API health check for deployment.

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

## Production Notes

Before release:

- Deploy backend to Vercel and configure env vars there.
- Configure Supabase project and run migrations.
- Add Clerk auth and pass verified user identity into backend requests.
- Add Razorpay checkout and webhook verification for memberships.
- Add PostHog/Sentry public keys only where appropriate.
- Replace debug APK with signed release APK/AAB.
