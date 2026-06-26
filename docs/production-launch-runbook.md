# SoulGuru Production Launch Runbook

This is the short operator path from local app to production launch. It follows the provider stack in the planning image and keeps secrets out of git.

## Current Status

Run this any time to get the authoritative status from your current environment:

```bash
npm run production:check -- --strict --allow-fail
npm run production:actions
npm run production:audit
```

As of the latest local check, OpenAI backend AI routes are configured locally. The app is still `needs_configuration` for production until the external provider accounts, dashboard settings, and Vercel environment variables below are configured. After each provider step, run `npm run production:actions` and `npm run production:audit` again; they print only statuses, missing env names, evidence files, verification commands, and local artifact facts.

Do not paste real secret values into this file, README, issues, screenshots, commits, or chat. Put production values in Vercel/provider dashboards or a private local `.env` only.

## Provider Setup Order

1. GitHub
   - Remote: `git@github.com:Jaydutt07/SoulGuru.git`
   - Proof: latest code is pushed and `npm run ci:check` passes.
   - GitHub Actions activation: run `npm run ci:install-workflow` only when pushing with a GitHub token that has `workflow` scope or an SSH key with permission to update workflows. Without that permission, GitHub rejects workflow-file pushes; keep `docs/github-actions-ci.yml` as the source of truth until the credential is updated.

2. Supabase backend
   - Create a Supabase project.
   - Generate the ordered SQL bundle:

```bash
npm run supabase:bundle -- --out=tmp/soulguru-supabase.sql
```

   - Apply `tmp/soulguru-supabase.sql` in Supabase SQL editor.
   - Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel.
   - Proof:

```bash
npm run supabase:schema:check
```

3. OpenAI backend AI
   - Set server-only `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TIMEOUT_MS`, `OPENAI_MAX_RETRIES`, `ASTRO_SOLVE_MODEL`, and `OPENAI_EMBEDDING_MODEL` in Vercel.
   - Never expose these as `VITE_` variables.
   - Proof:

```bash
npm run openai:check
npm run soul:quality:ai
npm run astro:quality:ai
npm run more-guidance:quality:ai
npm run shani:quality:ai
```

4. Birth-place geocoder
   - Set `PLACE_GEOCODER_URL`, `PLACE_GEOCODER_USER_AGENT`, and `PLACE_GEOCODER_REQUIRE_RESOLUTION=true`.
   - Proof:

```bash
npm run place:geocoder:smoke -- --place="Paris, France"
```

5. OTP login and email
   - Set `OTP_HASH_SECRET`, `OTP_SMS_WEBHOOK_URL`, and `OTP_SMS_WEBHOOK_TOKEN`.
   - Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.
   - Proof:

```bash
npm run otp:check
npm run email:check
```

6. Clerk auth
   - Set `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, and then `CLERK_REQUIRE_AUTH=true` after login is verified end to end.
   - Proof:

```bash
npm run auth:check
```

7. Razorpay payments
   - Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_WEBHOOK_URL`, `RAZORPAY_WEBHOOK_READY=true`, and `MORE_GUIDANCE_PRICE_PAISE`.
   - Set Shani plan prices: `SHANI_PLAN_3M_PRICE_PAISE`, `SHANI_PLAN_6M_PRICE_PAISE`, `SHANI_PLAN_1Y_PRICE_PAISE`, and `SHANI_PLAN_FULL_PRICE_PAISE`.
   - Keep `PAYMENTS_ALLOW_LOCAL_ACTIVATION=false` and `SHANI_ALLOW_LOCAL_ACCESS=false` in production.
   - Proof:

```bash
npm run payments:check
npm run shani:check
```

8. Upstash rate limiting
   - Set `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and `RATE_LIMIT_REQUIRE_UPSTASH=true`.
   - Proof:

```bash
npm run rate-limit:check
```

9. Pinecone long-term memory
   - Set `PINECONE_API_KEY`, `PINECONE_HOST`, `PINECONE_INDEX`, and `GUIDANCE_MEMORY_REQUIRE_PINECONE=true`.
   - Proof:

```bash
npm run memory:check
```

10. Sentry and PostHog
    - Set `SENTRY_DSN` for backend errors.
    - Set `VITE_SENTRY_DSN`, `VITE_SENTRY_TRACES_SAMPLE_RATE`, `VITE_POSTHOG_KEY`, and optionally `VITE_POSTHOG_HOST` for frontend monitoring.
    - Proof:

```bash
npm run observability:check
```

11. Vercel, Namecheap, and Cloudflare
    - Deploy the app to Vercel.
    - Attach the Namecheap domain through Cloudflare DNS.
    - Set `PRODUCTION_DOMAIN`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_DNS_READY=true`, and `VITE_API_BASE_URL=https://your-production-domain`.
    - Proof:

```bash
npm run deployment:check
npm run production:domain:smoke -- --expect-ready
npm run deployment:smoke -- --url=https://your-production-domain --expect-ready
```

## Final Release Gate

After all provider checks are configured and `/api/readiness` returns `ready`, run:

```bash
npm run public-env:check:strict
npm run production:check -- --strict
npm run release:check -- --url=https://your-production-domain --include-ai --include-android-signing
```

## Production Mobile Build

Only build the backend-connected phone artifact after `VITE_API_BASE_URL` points at the production HTTPS domain and readiness is ready:

```bash
npm run android:apk:backend
npm run android:artifact:check -- --expect-url=https://your-production-domain
```

For Play Store submission, configure the Android signing variables privately and run:

```bash
npm run android:release:check
npm run android:aab:release
```

Keep release keystores and generated APK/AAB artifacts out of git.

## Post-Launch Quality Loop

After real users begin rating `Words of Wisdom`, use the feedback report before changing prompts:

```bash
npm run soul:feedback:report
```

Treat the report as the first triage pass. If miss rate rises or the top missed theme is generic/repeated wording, review the prompt and rerun:

```bash
npm run soul:quality
npm run soul:quality:ai
```

If the top missed theme points to personal accuracy or daily timing, verify Supabase profile data, birth-place geocoder output, timezone, and daily cache boundaries before changing wording. The feedback report is designed to stay secret-safe: it prints prompt versions, ratings, bounded themes, and redacted optional samples only.
