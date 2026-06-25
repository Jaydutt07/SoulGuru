import { buildDeploymentReadiness } from "../src/backend/readinessService.js";

const checks = [];

checkFullProductionStackIsReady();
checkPartialStackIsNotReady();
checkUncachedSoulWisdomIsNotReady();
checkLocalAstroSolvesQuotaIsNotReady();
checkLocalMoreGuidanceAccessIsNotReady();
checkLocalShaniAccessIsNotReady();
checkMissingShaniPricesAreNotReady();
checkInvalidPaymentPricesAreNotReady();
checkInvalidServiceUrlsAreNotReady();
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
    warningFailures.some((check) => check.id === "observability")
  ].every(Boolean));
}

function checkPlaceholderValuesAreNotReady() {
  const report = buildDeploymentReadiness({
    ...fullEnv(),
    OPENAI_API_KEY: "fake-openai-key",
    SUPABASE_SERVICE_ROLE_KEY: "replace-with-service-role",
    RAZORPAY_KEY_SECRET: "<razorpay-secret>",
    RESEND_API_KEY: "fake-resend-key",
    UPSTASH_REDIS_REST_TOKEN: "$UPSTASH_TOKEN",
    PINECONE_API_KEY: "dummy-pinecone-key",
    VITE_POSTHOG_KEY: "placeholder"
  });
  const openai = report.checks.find((check) => check.id === "openai");
  const supabase = report.checks.find((check) => check.id === "supabase");
  const razorpay = report.checks.find((check) => check.id === "razorpay");
  const transactionalEmail = report.checks.find((check) => check.id === "transactionalEmail");
  const rateLimit = report.checks.find((check) => check.id === "rateLimit");
  const pinecone = report.checks.find((check) => check.id === "pinecone");
  const observability = report.checks.find((check) => check.id === "observability");

  pushCheck("Readiness treats placeholder env values as missing", [
    report.ok === false,
    openai?.missingEnv.includes("OPENAI_API_KEY"),
    supabase?.missingEnv.includes("SUPABASE_SERVICE_ROLE_KEY"),
    razorpay?.missingEnv.includes("RAZORPAY_KEY_SECRET"),
    transactionalEmail?.missingEnv.includes("RESEND_API_KEY"),
    rateLimit?.missingEnv.includes("UPSTASH_REDIS_REST_TOKEN"),
    pinecone?.missingEnv.includes("PINECONE_API_KEY"),
    observability?.missingEnv.includes("VITE_POSTHOG_KEY")
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

function checkInvalidServiceUrlsAreNotReady() {
  const supabaseReport = buildDeploymentReadiness({
    ...fullEnv(),
    SUPABASE_URL: "not-a-url"
  });
  const otpReport = buildDeploymentReadiness({
    ...fullEnv(),
    OTP_SMS_WEBHOOK_URL: "http://sms.example.test"
  });
  const vendorReport = buildDeploymentReadiness({
    ...fullEnv(),
    UPSTASH_REDIS_REST_URL: "http://upstash.example.test",
    PINECONE_HOST: "bad host",
    SENTRY_DSN: "not-a-dsn",
    VITE_POSTHOG_HOST: "not-a-url"
  });

  const supabase = supabaseReport.checks.find((check) => check.id === "supabase");
  const otp = otpReport.checks.find((check) => check.id === "otp");
  const rateLimit = vendorReport.checks.find((check) => check.id === "rateLimit");
  const pinecone = vendorReport.checks.find((check) => check.id === "pinecone");
  const observability = vendorReport.checks.find((check) => check.id === "observability");

  pushCheck("Readiness rejects malformed service URLs and DSNs", [
    supabaseReport.ok === false,
    supabase?.status === "fail",
    supabase?.missingEnv.includes("SUPABASE_URL=https URL"),
    otpReport.ok === false,
    otp?.status === "fail",
    otp?.missingEnv.includes("OTP_SMS_WEBHOOK_URL=https URL"),
    vendorReport.ok === false,
    rateLimit?.status === "fail",
    rateLimit?.missingEnv.includes("UPSTASH_REDIS_REST_URL=https URL"),
    pinecone?.status === "fail",
    pinecone?.missingEnv.includes("PINECONE_HOST=valid HTTPS URL or host"),
    observability?.status === "fail",
    observability?.missingEnv.includes("SENTRY_DSN=valid Sentry DSN"),
    observability?.missingEnv.includes("VITE_POSTHOG_HOST=https URL")
  ].every(Boolean));
}

function checkReadinessPayloadDoesNotLeakSecretValues() {
  const env = fullEnv();
  const serialized = JSON.stringify(buildDeploymentReadiness(env));
  const forbiddenValues = [
    env.OPENAI_API_KEY,
    env.SUPABASE_SERVICE_ROLE_KEY,
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
    PINECONE_API_KEY: "pcsk_contract_key_123456",
    PINECONE_HOST: "memory-index.svc.pinecone.io",
    PINECONE_INDEX: "soulguru-memory",
    OPENAI_EMBEDDING_MODEL: "text-embedding-3-small",
    CLERK_SECRET_KEY: "sk_test_contract_secret_123456",
    VITE_CLERK_PUBLISHABLE_KEY: "pk_test_contract_publishable_123456",
    CLERK_REQUIRE_AUTH: "true",
    VITE_SENTRY_DSN: "https://public@sentry.soulguru.app/1",
    VITE_POSTHOG_KEY: "phc_contract_123456",
    VITE_POSTHOG_HOST: "https://analytics.soulguru.app",
    RESEND_API_KEY: "re_contract_key_123456",
    RESEND_FROM_EMAIL: "SoulGuru <hello@soulguru.app>"
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
    OTP_SMS_WEBHOOK_URL: "https://sms.soulguru.app/send",
    RAZORPAY_KEY_ID: "rzp_test_contract123456",
    RAZORPAY_KEY_SECRET: "razorpay-contract-secret-123456",
    RAZORPAY_WEBHOOK_SECRET: "razorpay-webhook-secret-123456",
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
