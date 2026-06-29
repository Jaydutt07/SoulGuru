# SoulGuru Production Completion Audit

Generated: 2026-06-27T08:08:36.444Z

This audit maps the original app objective to current evidence. It is secret-safe: it prints statuses, missing env names, evidence commands, and artifact paths only.

## Summary

- Overall status: needs_configuration
- Production readiness: 4/15 checks passing, 7 warnings
- Providers: 3/14 ready, 11 need configuration

## Requirement Audit

| Requirement | Status | Evidence | Remaining |
| --- | --- | --- | --- |
| Calm splash, OTP login/create-account flow, five product tabs, settings, and mobile-friendly app shell | `implemented_local` | `npm run client:surface:check`<br>`docs/runtime-ui-qa-report.md` | Run runtime QA again after production provider values and domain are configured. |
| OpenAI key stays backend-only for mobile/API readings | `complete` | `npm run openai:check`<br>`npm run public-env:check:strict` | none |
| Cache one daily Soul Guru reading per user | `implemented_local_provider_pending` | `npm run soul:cache:check`<br>`npm run supabase:schema:check` | SUPABASE_URL<br>SUPABASE_SERVICE_ROLE_KEY |
| Capture Soul Guru reading feedback for prompt tuning without storing raw PII or raw reading text | `implemented_local_provider_pending` | `npm run soul:feedback:check`<br>`npm run local:smoke`<br>`npm run supabase:migrations:check` | SUPABASE_URL<br>SUPABASE_SERVICE_ROLE_KEY |
| Replace estimated astrology with proper chart/transit calculations | `implemented_local_provider_warning` | `npm run astrology:check`<br>`npm run place:geocoder:smoke -- --place="Paris, France"` | PLACE_GEOCODER_URL<br>PLACE_GEOCODER_USER_AGENT<br>PLACE_GEOCODER_REQUIRE_RESOLUTION=true |
| Astro Solves gives 3 persisted free questions with detailed root-cause and solution answers | `implemented_local_provider_pending` | `npm run astro:check`<br>`npm run astro:quality`<br>`npm run astro:quality:extended`<br>`npm run astro:quality:ai` | SUPABASE_URL<br>SUPABASE_SERVICE_ROLE_KEY |
| Paid More Guidance page has deeper reading, history, saved advice, and 3-month tracking | `implemented_local_provider_pending` | `npm run more-guidance:check`<br>`npm run more-guidance:quality`<br>`npm run more-guidance:quality:ai` | SUPABASE_URL<br>SUPABASE_SERVICE_ROLE_KEY<br>RAZORPAY_KEY_ID<br>RAZORPAY_KEY_SECRET<br>RAZORPAY_WEBHOOK_SECRET<br>RAZORPAY_WEBHOOK_URL<br>RAZORPAY_WEBHOOK_READY=true<br>MORE_GUIDANCE_PRICE_PAISE |
| Shani tab has Saade Sati timeline, paid remedy memberships, and member-gated Pandit guidance | `implemented_local_provider_pending` | `npm run shani:check`<br>`npm run shani:quality`<br>`npm run shani:quality:ai` | SHANI_PLAN_3M_PRICE_PAISE<br>SHANI_PLAN_6M_PRICE_PAISE<br>SHANI_PLAN_1Y_PRICE_PAISE<br>SHANI_PLAN_FULL_PRICE_PAISE<br>RAZORPAY_KEY_ID<br>RAZORPAY_KEY_SECRET<br>RAZORPAY_WEBHOOK_SECRET<br>RAZORPAY_WEBHOOK_URL<br>RAZORPAY_WEBHOOK_READY=true<br>MORE_GUIDANCE_PRICE_PAISE |
| Numbers and Harmony tabs provide numerology and compatibility surfaces | `implemented_local` | `npm run numbers:check`<br>`npm run compatibility:check`<br>`docs/runtime-ui-qa-report.md` | Run runtime QA again after production provider values and domain are configured. |
| Planning-image provider stack is mapped to production readiness | `needs_provider_configuration` | `npm run production:providers`<br>`npm run production:actions`<br>`npm run providers:check` | Supabase: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL<br>Vercel: VITE_API_BASE_URL<br>Namecheap: PRODUCTION_DOMAIN<br>Cloudflare: CLOUDFLARE_DNS_READY=true, CLOUDFLARE_ZONE_ID<br>Razorpay: MORE_GUIDANCE_PRICE_PAISE, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_READY=true, RAZORPAY_WEBHOOK_SECRET, RAZORPAY_WEBHOOK_URL, SHANI_PLAN_1Y_PRICE_PAISE, SHANI_PLAN_3M_PRICE_PAISE, SHANI_PLAN_6M_PRICE_PAISE, SHANI_PLAN_FULL_PRICE_PAISE<br>Resend: RESEND_API_KEY, RESEND_FROM_EMAIL<br>Clerk: CLERK_REQUIRE_AUTH=true, CLERK_SECRET_KEY, VITE_CLERK_PUBLISHABLE_KEY<br>PostHog: VITE_POSTHOG_KEY<br>Sentry: SENTRY_DSN or VITE_SENTRY_DSN<br>Upstash: RATE_LIMIT_REQUIRE_UPSTASH=true, UPSTASH_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_URL<br>Pinecone: GUIDANCE_MEMORY_REQUIRE_PINECONE=true, OPENAI_EMBEDDING_MODEL, PINECONE_API_KEY, PINECONE_HOST, PINECONE_INDEX |
| No OpenAI key or server secret is pushed to GitHub/browser/APK | `implemented_local` | `npm run security:check`<br>`npm run public-env:check:strict`<br>`.gitignore` contains `.env` | Run strict release scans before every production deploy. |
| Push code and SoulGuru details to the GitHub repo | `pushed_except_workflow_activation` | `git log --oneline origin/main -5`<br>`docs/github-actions-ci.yml`<br>`npm run ci:install-workflow`<br>`npm run ci:check` | Run `npm run ci:install-workflow` and push `.github/workflows/ci.yml` after GitHub credentials include `workflow` scope or SSH workflow-write permission. |
| Create a local mobile app artifact for phone testing | `complete_local` | `npm run android:apk:local`<br>`npm run android:artifact:check`<br>`/Users/jkv6333/Desktop/SoulGuru/SoulGuru-debug.apk` (6.7 MB, SHA-256 `c71df8af38fd61d0374a98b166bb541574dc269f24fff59d1ab5db991ad7c6db`) | Build production APK only after `VITE_API_BASE_URL` points at the production HTTPS domain. |
| Full production launch readiness | `needs_provider_configuration` | `npm run production:check -- --strict`<br>`npm run production:domain:smoke -- --expect-ready`<br>`npm run deployment:smoke -- --url=https://your-production-domain.app --expect-ready`<br>`npm run release:check -- --url=https://your-production-domain.app --include-ai --include-android-signing` | Supabase persistence: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY<br>Birth place accuracy: PLACE_GEOCODER_URL, PLACE_GEOCODER_USER_AGENT, PLACE_GEOCODER_REQUIRE_RESOLUTION=true<br>Shani remedy membership persistence: SHANI_PLAN_3M_PRICE_PAISE, SHANI_PLAN_6M_PRICE_PAISE, SHANI_PLAN_1Y_PRICE_PAISE, SHANI_PLAN_FULL_PRICE_PAISE<br>Backend OTP login: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OTP_HASH_SECRET, MSG91_AUTH_KEY, MSG91_OTP_TEMPLATE_ID<br>Transactional emails: RESEND_API_KEY, RESEND_FROM_EMAIL<br>Razorpay checkout: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, RAZORPAY_WEBHOOK_URL, RAZORPAY_WEBHOOK_READY=true, MORE_GUIDANCE_PRICE_PAISE<br>Upstash rate limiting: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, RATE_LIMIT_REQUIRE_UPSTASH=true<br>Long-term guidance memory: PINECONE_API_KEY, PINECONE_HOST, PINECONE_INDEX, OPENAI_EMBEDDING_MODEL, GUIDANCE_MEMORY_REQUIRE_PINECONE=true<br>Authenticated API protection: CLERK_SECRET_KEY, VITE_CLERK_PUBLISHABLE_KEY, CLERK_REQUIRE_AUTH=true<br>Observability: SENTRY_DSN or VITE_SENTRY_DSN, VITE_POSTHOG_KEY<br>Production domain and DNS: PRODUCTION_DOMAIN, CLOUDFLARE_ZONE_ID, CLOUDFLARE_DNS_READY=true, VITE_API_BASE_URL |

## Final Completion Criteria

The goal should be marked complete only after all of these pass with production provider values:

```sh
npm run production:check -- --strict
npm run production:domain:smoke -- --expect-ready
npm run deployment:smoke -- --url=https://your-production-domain.app --expect-ready
npm run release:check -- --url=https://your-production-domain.app --include-ai --include-android-signing
npm run android:apk:backend
npm run android:artifact:check -- --expect-url=https://your-production-domain.app
```
