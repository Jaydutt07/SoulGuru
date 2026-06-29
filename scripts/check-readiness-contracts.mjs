import { buildDeploymentReadiness } from "../src/backend/readinessService.js";
import { PROVIDER_STACK } from "../src/backend/providerStack.js";

const checks = [];

checkFullProductionStackIsReady();
checkPartialStackIsNotReady();
checkReadinessPayloadIncludesProviderMatrix();
checkUncachedSoulWisdomIsNotReady();
checkLocalAstroSolvesQuotaIsNotReady();
checkLocalMoreGuidanceAccessIsNotReady();
checkLocalShaniAccessIsNotReady();
checkRateLimitRequireUpstashIsNotReady();
checkGuidanceMemoryRequirePineconeIsNotReady();
checkMissingShaniPricesAreNotReady();
checkInvalidPaymentPricesAreNotReady();
checkInvalidRazorpayWebhookIsNotReady();
checkInvalidOtpDeliveryIsNotReady();
checkInvalidServiceUrlsAreNotReady();
checkInvalidDomainDnsIsNotReady();
checkInvalidEmailSenderIsNotReady();
checkPlaceholderValuesAreNotReady();
checkReadinessPayloadDoesNotLeakSecretValues();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkFullProductionStackIsReady() {
  const report = buildDeploymentReadiness(fullEnv());

  pushCheck("Readiness is ready only when full production stack is configured", [
    report.ok === true,
    report.status === "ready",
    report.summary.passing === report.summary.total,
    report.summary.failing === 0,
    report.summary.warnings === 0,
    report.checks.every((check) => check.status === "pass")
  ].every(Boolean));
}

function checkPartialStackIsNotReady() {
  const report = buildDeploymentReadiness({
    ...criticalEnv()
  });
  const warningFailures = report.checks.filter((check) => check.severity === "warning" && check.status === "fail");

  pushCheck("Readiness fails when warning-severity production stack items are missing", [
    report.ok === false,
    report.status === "needs_configuration",
    report.summary.failing === warningFailures.length,
    report.summary.warnings === warningFailures.length,
    warningFailures.some((check) => check.id === "rateLimit"),
    warningFailures.some((check) => check.id === "pinecone"),
    warningFailures.some((check) => check.id === "clerk"),
    warningFailures.some((check) => check.id === "observability"),
    warningFailures.some((check) => check.id === "domainDns")
  ].every(Boolean));
}

function checkReadinessPayloadIncludesProviderMatrix() {
  const readyReport = buildDeploymentReadiness(fullEnv());
  const missingReport = buildDeploymentReadiness({});
  const posthog = missingReport.providers.find((provider) => provider.id === "posthog");
  const sentry = missingReport.providers.find((provider) => provider.id === "sentry");
  const supabase = missingReport.providers.find((provider) => provider.id === "supabase");

  pushCheck("Readiness payload includes the provider stack matrix", [
    Array.isArray(readyReport.providers),
    readyReport.providerSummary?.total === PROVIDER_STACK.length,
    readyReport.providerSummary?.ready === PROVIDER_STACK.length,
    readyReport.providerSummary?.needsConfiguration === 0,
    readyReport.providerSummary?.unmapped === 0,
    readyReport.providers.every((provider) => provider.status === "ready"),
    missingReport.providerSummary?.total === PROVIDER_STACK.length,
    missingReport.providerSummary?.needsConfiguration > 0,
    supabase?.missingEnv.includes("SUPABASE_URL"),
    posthog?.missingEnv.includes("VITE_POSTHOG_KEY"),
    !posthog?.missingEnv.some((name) => String(name).includes("SENTRY")),
    sentry?.missingEnv.includes("SENTRY_DSN or VITE_SENTRY_DSN"),
    !sentry?.missingEnv.includes("VITE_POSTHOG_KEY")
  ].every(Boolean));
}

function checkPlaceholderValuesAreNotReady() {
  const report = buildDeploymentReadiness({
    ...fullEnv(),
    OPENAI_API_KEY: "fake-openai-key",
    SUPABASE_SERVICE_ROLE_KEY: "replace-with-service-role",
    MSG91_AUTH_KEY: "replace-with-msg91-auth-key",
    PLACE_GEOCODER_URL: "<geocoder-url>",
    RAZORPAY_KEY_SECRET: "<razorpay-secret>",
    RAZORPAY_WEBHOOK_URL: "<razorpay-webhook-url>",
    RESEND_API_KEY: "fake-resend-key",
    UPSTASH_REDIS_REST_TOKEN: "$UPSTASH_TOKEN",
    PINECONE_API_KEY: "dummy-pinecone-key",
    VITE_POSTHOG_KEY: "placeholder",
    PRODUCTION_DOMAIN: "example.com",
    CLOUDFLARE_ZONE_ID: "replace-with-zone-id"
  });
  const openai = report.checks.find((check) => check.id === "openai");
  const supabase = report.checks.find((check) => check.id === "supabase");
  const birthPlaceAccuracy = report.checks.find((check) => check.id === "birthPlaceAccuracy");
  const otp = report.checks.find((check) => check.id === "otp");
  const razorpay = report.checks.find((check) => check.id === "razorpay");
  const transactionalEmail = report.checks.find((check) => check.id === "transactionalEmail");
  const rateLimit = report.checks.find((check) => check.id === "rateLimit");
  const pinecone = report.checks.find((check) => check.id === "pinecone");
  const observability = report.checks.find((check) => check.id === "observability");
  const domainDns = report.checks.find((check) => check.id === "domainDns");

  pushCheck("Readiness treats placeholder env values as missing", [
    report.ok === false,
    openai?.missingEnv.includes("OPENAI_API_KEY"),
    supabase?.missingEnv.includes("SUPABASE_SERVICE_ROLE_KEY"),
    otp?.missingEnv.includes("MSG91_AUTH_KEY"),
    birthPlaceAccuracy?.missingEnv.includes("PLACE_GEOCODER_URL"),
    razorpay?.missingEnv.includes("RAZORPAY_KEY_SECRET"),
    razorpay?.missingEnv.includes("RAZORPAY_WEBHOOK_URL"),
    transactionalEmail?.missingEnv.includes("RESEND_API_KEY"),
    rateLimit?.missingEnv.includes("UPSTASH_REDIS_REST_TOKEN"),
    pinecone?.missingEnv.includes("PINECONE_API_KEY"),
    observability?.missingEnv.includes("VITE_POSTHOG_KEY"),
    domainDns?.missingEnv.includes("PRODUCTION_DOMAIN=valid domain"),
    domainDns?.missingEnv.includes("CLOUDFLARE_ZONE_ID")
  ].every(Boolean));
}

function checkInvalidEmailSenderIsNotReady() {
  const report = buildDeploymentReadiness({
    ...fullEnv(),
    RESEND_FROM_EMAIL: "SoulGuru <not-an-email>"
  });
  const transactionalEmail = report.checks.find((check) => check.id === "transactionalEmail");

  pushCheck("Readiness rejects malformed transactional email sender", [
    report.ok === false,
    transactionalEmail?.status === "fail",
    transactionalEmail?.missingEnv.includes("RESEND_FROM_EMAIL=valid email sender")
  ].every(Boolean));
}

function checkLocalAstroSolvesQuotaIsNotReady() {
  const report = buildDeploymentReadiness({
    ...fullEnv(),
    ASTRO_SOLVES_ALLOW_LOCAL_QUOTA: "true"
  });
  const astroQuota = report.checks.find((check) => check.id === "astroSolvesQuota");

  pushCheck("Readiness rejects local Astro Solves quota mode", [
    report.ok === false,
    astroQuota?.status === "fail",
    astroQuota?.missingEnv.includes("ASTRO_SOLVES_ALLOW_LOCAL_QUOTA=false")
  ].every(Boolean));
}

function checkUncachedSoulWisdomIsNotReady() {
  const report = buildDeploymentReadiness({
    ...fullEnv(),
    SOUL_WISDOM_ALLOW_UNCACHED: "true"
  });
  const soulCache = report.checks.find((check) => check.id === "soulWisdomCache");

  pushCheck("Readiness rejects uncached Soul Guru mode", [
    report.ok === false,
    soulCache?.status === "fail",
    soulCache?.missingEnv.includes("SOUL_WISDOM_ALLOW_UNCACHED=false")
  ].every(Boolean));
}

function checkLocalMoreGuidanceAccessIsNotReady() {
  const report = buildDeploymentReadiness({
    ...fullEnv(),
    MORE_GUIDANCE_ALLOW_LOCAL_ACCESS: "true"
  });
  const paidAccess = report.checks.find((check) => check.id === "moreGuidanceAccess");

  pushCheck("Readiness rejects local More Guidance access mode", [
    report.ok === false,
    paidAccess?.status === "fail",
    paidAccess?.missingEnv.includes("MORE_GUIDANCE_ALLOW_LOCAL_ACCESS=false")
  ].every(Boolean));
}

function checkLocalShaniAccessIsNotReady() {
  const report = buildDeploymentReadiness({
    ...fullEnv(),
    SHANI_ALLOW_LOCAL_ACCESS: "true"
  });
  const shaniAccess = report.checks.find((check) => check.id === "shaniMembershipAccess");

  pushCheck("Readiness rejects local Shani remedy access mode", [
    report.ok === false,
    shaniAccess?.status === "fail",
    shaniAccess?.missingEnv.includes("SHANI_ALLOW_LOCAL_ACCESS=false")
  ].every(Boolean));
}

function checkRateLimitRequireUpstashIsNotReady() {
  const report = buildDeploymentReadiness({
    ...fullEnv(),
    RATE_LIMIT_REQUIRE_UPSTASH: "false"
  });
  const rateLimit = report.checks.find((check) => check.id === "rateLimit");

  pushCheck("Readiness rejects optional Upstash mode for protected routes", [
    report.ok === false,
    rateLimit?.status === "fail",
    rateLimit?.missingEnv.includes("RATE_LIMIT_REQUIRE_UPSTASH=true")
  ].every(Boolean));
}

function checkGuidanceMemoryRequirePineconeIsNotReady() {
  const report = buildDeploymentReadiness({
    ...fullEnv(),
    GUIDANCE_MEMORY_REQUIRE_PINECONE: "false"
  });
  const pinecone = report.checks.find((check) => check.id === "pinecone");

  pushCheck("Readiness rejects optional Pinecone memory mode", [
    report.ok === false,
    pinecone?.status === "fail",
    pinecone?.missingEnv.includes("GUIDANCE_MEMORY_REQUIRE_PINECONE=true")
  ].every(Boolean));
}

function checkMissingShaniPricesAreNotReady() {
  const report = buildDeploymentReadiness({
    ...fullEnv(),
    SHANI_PLAN_FULL_PRICE_PAISE: ""
  });
  const shaniAccess = report.checks.find((check) => check.id === "shaniMembershipAccess");

  pushCheck("Readiness rejects missing Shani remedy plan prices", [
    report.ok === false,
    shaniAccess?.status === "fail",
    shaniAccess?.missingEnv.includes("SHANI_PLAN_FULL_PRICE_PAISE")
  ].every(Boolean));
}

function checkInvalidPaymentPricesAreNotReady() {
  const moreGuidanceReport = buildDeploymentReadiness({
    ...fullEnv(),
    MORE_GUIDANCE_PRICE_PAISE: "not-a-number"
  });
  const razorpay = moreGuidanceReport.checks.find((check) => check.id === "razorpay");
  const shaniReport = buildDeploymentReadiness({
    ...fullEnv(),
    SHANI_PLAN_3M_PRICE_PAISE: "0",
    SHANI_PLAN_6M_PRICE_PAISE: "-100",
    SHANI_PLAN_1Y_PRICE_PAISE: "99.5"
  });
  const shaniAccess = shaniReport.checks.find((check) => check.id === "shaniMembershipAccess");

  pushCheck("Readiness rejects invalid Razorpay and Shani price env values", [
    moreGuidanceReport.ok === false,
    razorpay?.status === "fail",
    razorpay?.missingEnv.includes("MORE_GUIDANCE_PRICE_PAISE=positive integer"),
    shaniReport.ok === false,
    shaniAccess?.status === "fail",
    shaniAccess?.missingEnv.includes("SHANI_PLAN_3M_PRICE_PAISE=positive integer"),
    shaniAccess?.missingEnv.includes("SHANI_PLAN_6M_PRICE_PAISE=positive integer"),
    shaniAccess?.missingEnv.includes("SHANI_PLAN_1Y_PRICE_PAISE=positive integer")
  ].every(Boolean));
}

function checkInvalidRazorpayWebhookIsNotReady() {
  const missingReadyReport = buildDeploymentReadiness({
    ...fullEnv(),
    RAZORPAY_WEBHOOK_READY: "false"
  });
  const wrongPathReport = buildDeploymentReadiness({
    ...fullEnv(),
    RAZORPAY_WEBHOOK_URL: "https://soulguru.app/webhook"
  });
  const wrongDomainReport = buildDeploymentReadiness({
    ...fullEnv(),
    PRODUCTION_DOMAIN: "soulguru.app",
    RAZORPAY_WEBHOOK_URL: "https://payments.other-domain.app/api/razorpay-webhook"
  });

  const missingReady = missingReadyReport.checks.find((check) => check.id === "razorpay");
  const wrongPath = wrongPathReport.checks.find((check) => check.id === "razorpay");
  const wrongDomain = wrongDomainReport.checks.find((check) => check.id === "razorpay");

  pushCheck("Readiness rejects incomplete Razorpay webhook dashboard setup", [
    missingReadyReport.ok === false,
    missingReady?.status === "fail",
    missingReady?.missingEnv.includes("RAZORPAY_WEBHOOK_READY=true"),
    wrongPathReport.ok === false,
    wrongPath?.status === "fail",
    wrongPath?.missingEnv.includes("RAZORPAY_WEBHOOK_URL=/api/razorpay-webhook"),
    wrongDomainReport.ok === false,
    wrongDomain?.status === "fail",
    wrongDomain?.missingEnv.includes("RAZORPAY_WEBHOOK_URL=production domain or subdomain")
  ].every(Boolean));
}

function checkInvalidOtpDeliveryIsNotReady() {
  const emailOnlyReport = buildDeploymentReadiness({
    ...fullEnv(),
    MSG91_AUTH_KEY: "",
    MSG91_OTP_TEMPLATE_ID: "",
    OTP_SMS_WEBHOOK_URL: "",
    OTP_SMS_WEBHOOK_TOKEN: "",
    RESEND_API_KEY: "re_contract_key_123456",
    RESEND_FROM_EMAIL: "SoulGuru <hello@soulguru.app>"
  });
  const weakMsg91Report = buildDeploymentReadiness({
    ...fullEnv(),
    MSG91_AUTH_KEY: "short",
    OTP_SMS_WEBHOOK_URL: "",
    OTP_SMS_WEBHOOK_TOKEN: ""
  });
  const weakWebhookReport = buildDeploymentReadiness({
    ...fullEnv(),
    MSG91_AUTH_KEY: "",
    MSG91_OTP_TEMPLATE_ID: "",
    OTP_SMS_WEBHOOK_URL: "https://sms.example.test",
    OTP_SMS_WEBHOOK_TOKEN: "short"
  });
  const demoReport = buildDeploymentReadiness({
    ...fullEnv(),
    OTP_DEMO_ENABLED: "true"
  });

  const emailOnly = emailOnlyReport.checks.find((check) => check.id === "otp");
  const weakMsg91 = weakMsg91Report.checks.find((check) => check.id === "otp");
  const weakWebhook = weakWebhookReport.checks.find((check) => check.id === "otp");
  const demo = demoReport.checks.find((check) => check.id === "otp");

  pushCheck("Readiness requires production SMS OTP delivery", [
    emailOnlyReport.ok === false,
    emailOnly?.status === "fail",
    emailOnly?.missingEnv.includes("MSG91_AUTH_KEY"),
    emailOnly?.missingEnv.includes("MSG91_OTP_TEMPLATE_ID"),
    weakMsg91Report.ok === false,
    weakMsg91?.status === "fail",
    weakMsg91?.missingEnv.includes("MSG91_AUTH_KEY>=8 characters"),
    weakWebhookReport.ok === false,
    weakWebhook?.status === "fail",
    weakWebhook?.missingEnv.includes("OTP_SMS_WEBHOOK_TOKEN>=16 characters"),
    demoReport.ok === false,
    demo?.status === "fail",
    demo?.missingEnv.includes("OTP_DEMO_ENABLED=false")
  ].every(Boolean));
}

function checkInvalidServiceUrlsAreNotReady() {
  const supabaseReport = buildDeploymentReadiness({
    ...fullEnv(),
    SUPABASE_URL: "not-a-url"
  });
  const otpReport = buildDeploymentReadiness({
    ...fullEnv(),
    MSG91_OTP_ENDPOINT: "http://control.msg91.com/api/v5/otp"
  });
  const vendorReport = buildDeploymentReadiness({
    ...fullEnv(),
    PLACE_GEOCODER_URL: "http://geocoder.example.test",
    UPSTASH_REDIS_REST_URL: "http://upstash.example.test",
    PINECONE_HOST: "bad host",
    RAZORPAY_WEBHOOK_URL: "http://soulguru.app/api/razorpay-webhook",
    SENTRY_DSN: "not-a-dsn",
    VITE_POSTHOG_HOST: "not-a-url",
    PRODUCTION_DOMAIN: "https://soulguru.app",
    CLOUDFLARE_ZONE_ID: "not-a-zone",
    VITE_API_BASE_URL: "https://preview.vercel.app"
  });

  const supabase = supabaseReport.checks.find((check) => check.id === "supabase");
  const otp = otpReport.checks.find((check) => check.id === "otp");
  const birthPlaceAccuracy = vendorReport.checks.find((check) => check.id === "birthPlaceAccuracy");
  const rateLimit = vendorReport.checks.find((check) => check.id === "rateLimit");
  const pinecone = vendorReport.checks.find((check) => check.id === "pinecone");
  const razorpay = vendorReport.checks.find((check) => check.id === "razorpay");
  const observability = vendorReport.checks.find((check) => check.id === "observability");
  const domainDns = vendorReport.checks.find((check) => check.id === "domainDns");

  pushCheck("Readiness rejects malformed service URLs and DSNs", [
    supabaseReport.ok === false,
    supabase?.status === "fail",
    supabase?.missingEnv.includes("SUPABASE_URL=https URL"),
    otpReport.ok === false,
    otp?.status === "fail",
    otp?.missingEnv.includes("MSG91_OTP_ENDPOINT=https URL"),
    vendorReport.ok === false,
    birthPlaceAccuracy?.status === "fail",
    birthPlaceAccuracy?.missingEnv.includes("PLACE_GEOCODER_URL=https URL"),
    rateLimit?.status === "fail",
    rateLimit?.missingEnv.includes("UPSTASH_REDIS_REST_URL=https URL"),
    pinecone?.status === "fail",
    pinecone?.missingEnv.includes("PINECONE_HOST=valid HTTPS URL or host"),
    razorpay?.status === "fail",
    razorpay?.missingEnv.includes("RAZORPAY_WEBHOOK_URL=https URL"),
    observability?.status === "fail",
    observability?.missingEnv.includes("SENTRY_DSN=valid Sentry DSN"),
    observability?.missingEnv.includes("VITE_POSTHOG_HOST=https URL"),
    domainDns?.status === "fail",
    domainDns?.missingEnv.includes("PRODUCTION_DOMAIN=valid domain"),
    domainDns?.missingEnv.includes("CLOUDFLARE_ZONE_ID=Cloudflare zone id")
  ].every(Boolean));
}

function checkInvalidDomainDnsIsNotReady() {
  const localUrlReport = buildDeploymentReadiness({
    ...fullEnv(),
    VITE_API_BASE_URL: "http://localhost:5173"
  });
  const mismatchReport = buildDeploymentReadiness({
    ...fullEnv(),
    PRODUCTION_DOMAIN: "soulguru.app",
    VITE_API_BASE_URL: "https://other-domain.app"
  });
  const localUrl = localUrlReport.checks.find((check) => check.id === "domainDns");
  const mismatch = mismatchReport.checks.find((check) => check.id === "domainDns");

  pushCheck("Readiness rejects non-production domain and DNS values", [
    localUrlReport.ok === false,
    localUrl?.status === "fail",
    localUrl?.missingEnv.includes("VITE_API_BASE_URL=production HTTPS URL"),
    mismatchReport.ok === false,
    mismatch?.status === "fail",
    mismatch?.missingEnv.includes("VITE_API_BASE_URL=production domain or subdomain")
  ].every(Boolean));
}

function checkReadinessPayloadDoesNotLeakSecretValues() {
  const env = fullEnv();
  const serialized = JSON.stringify(buildDeploymentReadiness(env));
  const forbiddenValues = [
    env.OPENAI_API_KEY,
    env.SUPABASE_SERVICE_ROLE_KEY,
    env.MSG91_AUTH_KEY,
    env.OTP_HASH_SECRET,
    env.RAZORPAY_KEY_SECRET,
    env.RAZORPAY_WEBHOOK_SECRET,
    env.RESEND_API_KEY,
    env.UPSTASH_REDIS_REST_TOKEN,
    env.PINECONE_API_KEY,
    env.CLERK_SECRET_KEY
  ];

  pushCheck("Readiness payload does not leak secret values", forbiddenValues.every((value) => !serialized.includes(value)));
}

function fullEnv() {
  return {
    ...criticalEnv(),
    UPSTASH_REDIS_REST_URL: "https://upstash.soulguru.app",
    UPSTASH_REDIS_REST_TOKEN: "upstash-contract-token-123456",
    RATE_LIMIT_REQUIRE_UPSTASH: "true",
    PLACE_GEOCODER_URL: "https://geocoder.soulguru.app/search",
    PLACE_GEOCODER_USER_AGENT: "SoulGuru/1.0 production contact@soulguru.app",
    PLACE_GEOCODER_REQUIRE_RESOLUTION: "true",
    PINECONE_API_KEY: "pcsk_contract_key_123456",
    PINECONE_HOST: "memory-index.svc.pinecone.io",
    PINECONE_INDEX: "soulguru-memory",
    OPENAI_EMBEDDING_MODEL: "text-embedding-3-small",
    GUIDANCE_MEMORY_REQUIRE_PINECONE: "true",
    CLERK_SECRET_KEY: "sk_test_contract_secret_123456",
    VITE_CLERK_PUBLISHABLE_KEY: "pk_test_contract_publishable_123456",
    CLERK_REQUIRE_AUTH: "true",
    VITE_SENTRY_DSN: "https://public@sentry.soulguru.app/1",
    VITE_POSTHOG_KEY: "phc_contract_123456",
    VITE_POSTHOG_HOST: "https://analytics.soulguru.app",
    RESEND_API_KEY: "re_contract_key_123456",
    RESEND_FROM_EMAIL: "SoulGuru <hello@soulguru.app>",
    PRODUCTION_DOMAIN: "soulguru.app",
    CLOUDFLARE_ZONE_ID: "0123456789abcdef0123456789abcdef",
    CLOUDFLARE_DNS_READY: "true",
    VITE_API_BASE_URL: "https://soulguru.app"
  };
}

function criticalEnv() {
  return {
    OPENAI_API_KEY: "openai-contract-key-123456",
    OPENAI_MODEL: "gpt-5.5",
    ASTRO_SOLVE_MODEL: "gpt-5.5",
    SUPABASE_URL: "https://soulguru-prod.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-contract-secret-123456",
    OTP_HASH_SECRET: "soulguru-otp-hash-secret-with-at-least-32-chars",
    MSG91_AUTH_KEY: "msg91-contract-auth-key",
    MSG91_OTP_TEMPLATE_ID: "msg91-contract-template",
    MSG91_OTP_ENDPOINT: "https://control.msg91.com/api/v5/otp",
    RAZORPAY_KEY_ID: "rzp_test_contract123456",
    RAZORPAY_KEY_SECRET: "razorpay-contract-secret-123456",
    RAZORPAY_WEBHOOK_SECRET: "razorpay-webhook-secret-123456",
    RAZORPAY_WEBHOOK_URL: "https://soulguru.app/api/razorpay-webhook",
    RAZORPAY_WEBHOOK_READY: "true",
    MORE_GUIDANCE_PRICE_PAISE: "49900",
    SHANI_PLAN_3M_PRICE_PAISE: "29900",
    SHANI_PLAN_6M_PRICE_PAISE: "54900",
    SHANI_PLAN_1Y_PRICE_PAISE: "99900",
    SHANI_PLAN_FULL_PRICE_PAISE: "149900"
  };
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function printReport() {
  console.log(`Readiness contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}
