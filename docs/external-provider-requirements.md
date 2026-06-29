# SoulGuru External Provider Requirements

Local/basic implementation is complete as far as Codex can take it without live provider accounts and production credentials. Do not commit real values to git. Put production secrets in Vercel environment variables or the provider dashboard only.

## GitHub

Needed for version control and GitHub Actions CI.

Env vars: none required for the app.

Actions:
- Keep the repo at `git@github.com:Jaydutt07/SoulGuru.git` / `https://github.com/Jaydutt07/SoulGuru`.
- To activate `.github/workflows/ci.yml`, use a GitHub token with `workflow` scope or an SSH key with permission to update workflow files.
- Preflight:

```bash
npm run github:workflow:check
```

- If it reports `needs_credentials`, run `gh auth refresh -h github.com -s workflow` or configure repo-write SSH, then run `npm run ci:install-workflow` and push `.github/workflows/ci.yml`.

## Vercel

Needed for backend API routes, OpenAI server-only access, production env storage, deployment, and HTTPS app/API URL.

Env vars:
- `VITE_API_BASE_URL`: public HTTPS API/app base URL used by browser/mobile clients.
- `API_BASE_URL`: backend smoke-test URL when different from public Vite URL.
- All server-only provider secrets listed below must be configured in Vercel, not in client code.
- `DEPLOYMENT_SMOKE_AUTH_TOKEN`: shared token for protected deployment smoke checks.

Actions:
- Create/import the GitHub repo in Vercel.
- Configure production, preview, and development env vars as needed.
- Deploy after provider env vars are present.
- Verify:

```bash
npm run deployment:check
npm run deployment:smoke -- --url=https://your-production-domain --expect-ready
```

## OpenAI

Needed for Soul Guru daily readings, Astro Solves, More Guidance, Shani Pandit guidance, and Pinecone embedding generation.

Env vars:
- `OPENAI_API_KEY`: server-only API key.
- `OPENAI_MODEL`: default reading model.
- `OPENAI_TIMEOUT_MS`: request timeout.
- `OPENAI_MAX_RETRIES`: retry count.
- `ASTRO_SOLVE_MODEL`: Astro Solves model override.
- `MORE_GUIDANCE_MODEL`: More Guidance model override.
- `SHANI_PANDIT_MODEL`: Shani Pandit model override.
- `OPENAI_EMBEDDING_MODEL`: embedding model for long-term memory.

Actions:
- Add the key only in Vercel/local `.env`.
- Never create a `VITE_OPENAI_*` variable.
- Verify:

```bash
npm run openai:check
npm run soul:quality:ai
npm run astro:quality:ai
npm run more-guidance:quality:ai
npm run shani:quality:ai
```

## Supabase

Needed for user profiles, OTP challenges, daily Soul Guru cache, Astro Solves quota, More Guidance history/saved advice/3-month tracking, payments/subscriptions, Shani membership state, and feedback storage.

Env vars:
- `SUPABASE_URL`: project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only service role key.
- `VITE_SUPABASE_URL`: public Supabase URL if client-side Supabase usage is enabled.
- `VITE_SUPABASE_ANON_KEY`: public anon key if client-side Supabase usage is enabled.

Actions:
- Create a Supabase project.
- Generate and apply the migration bundle:

```bash
npm run supabase:bundle -- --out=tmp/soulguru-supabase.sql
```

- Paste/run the SQL in Supabase SQL editor.
- Verify:

```bash
npm run supabase:migrations:check
npm run supabase:schema:check
```

## Birth-Place Geocoder

Needed for accurate birth-place resolution before chart/transit calculations.

Env vars:
- `PLACE_GEOCODER_URL`: Nominatim-compatible geocoder endpoint.
- `PLACE_GEOCODER_USER_AGENT`: identifiable user agent required by many geocoders.
- `PLACE_GEOCODER_REQUIRE_RESOLUTION=true`: production guard that prevents silent default-coordinate fallback.

Actions:
- Choose a compliant Nominatim-compatible geocoder.
- Configure rate limits/usage policy with the provider.
- Verify:

```bash
npm run place:geocoder:smoke -- --place="Paris, France"
```

## OTP SMS Provider

Needed for phone OTP login/create-account verification.

Env vars:
- `OTP_HASH_SECRET`: strong server-only secret, at least 32 characters.
- `MSG91_AUTH_KEY`: server-only MSG91 Auth Key.
- `MSG91_OTP_TEMPLATE_ID`: MSG91 OTP template ID.
- `MSG91_OTP_ENDPOINT`: optional override for the MSG91 SendOTP endpoint; defaults to `https://control.msg91.com/api/v5/otp`.
- `OTP_RATE_LIMIT`: OTP request rate limit.
- `OTP_EXPIRY_MINUTES`: OTP expiry window.
- `OTP_MAX_ATTEMPTS`: max verification attempts.
- `OTP_DEMO_ENABLED=false`: keep demo OTP disabled in production.
- `OTP_SMS_WEBHOOK_URL` and `OTP_SMS_WEBHOOK_TOKEN`: optional fallback if MSG91 is replaced later.

Actions:
- Create or approve an MSG91 OTP template that includes `##OTP##`.
- Use copy such as `Your SoulGuru OTP is ##OTP##. It expires in 10 minutes.`
- Copy the MSG91 Auth Key and OTP template ID into server-side production env.
- Verify:

```bash
npm run otp:check
npm run auth:check
```

## Resend

Needed for transactional emails such as OTP fallback and paid membership confirmations.

Env vars:
- `RESEND_API_KEY`: server-only API key.
- `RESEND_FROM_EMAIL`: verified sender address/domain.

Actions:
- Create a Resend account.
- Verify sender domain/email.
- Add DNS records requested by Resend.
- Verify:

```bash
npm run email:check
```

## Clerk

Needed for production authenticated API protection.

Env vars:
- `CLERK_SECRET_KEY`: server-only Clerk secret.
- `VITE_CLERK_PUBLISHABLE_KEY`: public Clerk key.
- `CLERK_REQUIRE_AUTH=true`: production guard for protected API routes.
- `CLERK_JWT_AUDIENCE`: optional audience check if configured.
- `CLERK_AUTHORIZED_PARTIES`: optional allowed origins/parties.

Actions:
- Create Clerk app.
- Configure allowed origins for the production domain.
- Verify login and API auth end to end before setting `CLERK_REQUIRE_AUTH=true`.
- Verify:

```bash
npm run auth:check
npm run api:auth:check
```

## Razorpay

Needed for More Guidance subscription checkout and Shani remedy memberships.

Env vars:
- `RAZORPAY_KEY_ID`: Razorpay key id.
- `RAZORPAY_KEY_SECRET`: server-only key secret.
- `RAZORPAY_WEBHOOK_SECRET`: server-only webhook signing secret.
- `RAZORPAY_WEBHOOK_URL`: production webhook URL.
- `RAZORPAY_WEBHOOK_READY=true`: production guard after webhook is configured.
- `RAZORPAY_ORDER_RATE_LIMIT`: order creation rate limit.
- `RAZORPAY_VERIFY_RATE_LIMIT`: payment verification rate limit.
- `MORE_GUIDANCE_PRICE_PAISE`: Soul Guru + Astro Solve price in paise.
- `SHANI_PLAN_3M_PRICE_PAISE`: Shani 3-month plan price.
- `SHANI_PLAN_6M_PRICE_PAISE`: Shani 6-month plan price.
- `SHANI_PLAN_1Y_PRICE_PAISE`: Shani 1-year plan price.
- `SHANI_PLAN_FULL_PRICE_PAISE`: Shani full remaining-period plan price.
- `PAYMENTS_ALLOW_LOCAL_ACTIVATION=false`: keep local activation disabled in production.
- `MORE_GUIDANCE_ALLOW_LOCAL_ACCESS=false`: keep local paid fallback disabled in production.
- `SHANI_ALLOW_LOCAL_ACCESS=false`: keep local Shani fallback disabled in production.

Actions:
- Create Razorpay account.
- Configure webhook to the deployed `/api/razorpay-webhook` URL.
- Enable payment events required by the app.
- Set prices in paise.
- Verify:

```bash
npm run payments:check
npm run shani:check
```

## Upstash Redis

Needed for production rate limiting of AI, OTP, payment, and protected API routes.

Env vars:
- `UPSTASH_REDIS_REST_URL`: Upstash REST URL.
- `UPSTASH_REDIS_REST_TOKEN`: server-only REST token.
- `RATE_LIMIT_REQUIRE_UPSTASH=true`: production guard requiring Redis-backed rate limits.
- `SOUL_WISDOM_RATE_LIMIT`: Soul Guru route limit.
- `ASTRO_SOLVE_RATE_LIMIT`: Astro Solve route limit.
- `ASTRO_SOLVE_ALLOWANCE_RATE_LIMIT`: free allowance check limit.
- `USER_PROFILE_RATE_LIMIT`: profile route limit.
- `GUIDANCE_MEMORY_RATE_LIMIT`: memory route limit.
- `MORE_GUIDANCE_RATE_LIMIT`: More Guidance route limit.
- `SHANI_PANDIT_RATE_LIMIT`: Shani Pandit route limit.

Actions:
- Create an Upstash Redis database.
- Copy REST URL/token into Vercel.
- Verify:

```bash
npm run rate-limit:check
```

## Pinecone

Needed for long-term guidance memory and saved advice retrieval.

Env vars:
- `PINECONE_API_KEY`: server-only API key.
- `PINECONE_HOST`: Pinecone index host.
- `PINECONE_INDEX`: index name.
- `PINECONE_TOP_K`: number of memory matches to retrieve.
- `GUIDANCE_MEMORY_REQUIRE_PINECONE=true`: production guard requiring memory backend.
- `OPENAI_EMBEDDING_MODEL`: embedding model used to create vectors.

Actions:
- Create Pinecone index compatible with the chosen OpenAI embedding model dimensions.
- Configure host/index/key in Vercel.
- Verify:

```bash
npm run memory:check
```

## PostHog

Needed for product analytics.

Env vars:
- `VITE_POSTHOG_KEY`: public PostHog project key.
- `VITE_POSTHOG_HOST`: PostHog host, if not default.

Actions:
- Create a PostHog project.
- Configure allowed domains/privacy settings.
- Verify:

```bash
npm run observability:check
```

## Sentry

Needed for frontend/backend error tracking.

Env vars:
- `SENTRY_DSN`: backend/server error DSN.
- `VITE_SENTRY_DSN`: frontend public DSN.
- `VITE_SENTRY_TRACES_SAMPLE_RATE`: frontend trace sample rate.

Actions:
- Create Sentry project(s).
- Add DSN values to Vercel.
- Verify:

```bash
npm run observability:check
```

## Namecheap

Needed to buy/manage the production domain.

Env vars:
- `PRODUCTION_DOMAIN`: final production domain.

Actions:
- Buy the domain.
- Point nameservers/DNS management to Cloudflare if using Cloudflare DNS.

## Cloudflare

Needed for DNS and production custom domain readiness.

Env vars:
- `CLOUDFLARE_ZONE_ID`: Cloudflare zone id.
- `CLOUDFLARE_DNS_READY=true`: production guard after DNS is configured.
- `PRODUCTION_DOMAIN`: final domain.
- `VITE_API_BASE_URL`: must point to the production HTTPS domain.

Actions:
- Add the Namecheap domain to Cloudflare.
- Configure DNS records for Vercel.
- Confirm HTTPS works on the production domain.
- Verify:

```bash
npm run production:domain:smoke -- --expect-ready
```

## Android Release Signing

Needed only for production Play Store/release APK or AAB, not local debug APK testing.

Env vars:
- `ANDROID_KEYSTORE_PATH`: private keystore path.
- `ANDROID_KEYSTORE_PASSWORD`: server/local secret.
- `ANDROID_KEY_ALIAS`: release key alias.
- `ANDROID_KEY_PASSWORD`: server/local secret.

Actions:
- Generate/store the release keystore outside git.
- Configure signing values only in private local/Vercel/CI secret storage.
- Verify:

```bash
npm run android:release:check
npm run android:aab:release
```

## Final Production Gate

After all external provider items are configured, run:

```bash
npm run production:check -- --strict
npm run production:domain:smoke -- --expect-ready
npm run deployment:smoke -- --url=https://your-production-domain --expect-ready
npm run release:check -- --url=https://your-production-domain --include-ai --include-android-signing
npm run android:apk:backend
npm run android:artifact:check -- --expect-url=https://your-production-domain
```
