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
    OPENAI_API_KEY: "fake-openai-key",
    OPENAI_MODEL: "gpt-5.5",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "fake-service-role-value",
    OTP_HASH_SECRET: "fake-otp-hash-secret-with-at-least-32-chars",
    OTP_SMS_WEBHOOK_URL: "https://sms.example.test",
    RAZORPAY_KEY_ID: "rzp_test_contract",
    RAZORPAY_KEY_SECRET: "fake-razorpay-secret",
    RAZORPAY_WEBHOOK_SECRET: "fake-webhook-secret",
    MORE_GUIDANCE_PRICE_PAISE: "49900",
    SHANI_PLAN_3M_PRICE_PAISE: "29900",
    SHANI_PLAN_6M_PRICE_PAISE: "54900",
    SHANI_PLAN_1Y_PRICE_PAISE: "99900",
    SHANI_PLAN_FULL_PRICE_PAISE: "149900"
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

function checkReadinessPayloadDoesNotLeakSecretValues() {
  const env = fullEnv();
  const serialized = JSON.stringify(buildDeploymentReadiness(env));
  const forbiddenValues = [
    env.OPENAI_API_KEY,
    env.SUPABASE_SERVICE_ROLE_KEY,
    env.OTP_HASH_SECRET,
    env.RAZORPAY_KEY_SECRET,
    env.RAZORPAY_WEBHOOK_SECRET,
    env.UPSTASH_REDIS_REST_TOKEN,
    env.PINECONE_API_KEY,
    env.CLERK_SECRET_KEY
  ];

  pushCheck("Readiness payload does not leak secret values", forbiddenValues.every((value) => !serialized.includes(value)));
}

function fullEnv() {
  return {
    OPENAI_API_KEY: "fake-openai-key",
    OPENAI_MODEL: "gpt-5.5",
    ASTRO_SOLVE_MODEL: "gpt-5.5",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "fake-service-role-value",
    OTP_HASH_SECRET: "fake-otp-hash-secret-with-at-least-32-chars",
    OTP_SMS_WEBHOOK_URL: "https://sms.example.test",
    RAZORPAY_KEY_ID: "rzp_test_contract",
    RAZORPAY_KEY_SECRET: "fake-razorpay-secret",
    RAZORPAY_WEBHOOK_SECRET: "fake-webhook-secret",
    MORE_GUIDANCE_PRICE_PAISE: "49900",
    SHANI_PLAN_3M_PRICE_PAISE: "29900",
    SHANI_PLAN_6M_PRICE_PAISE: "54900",
    SHANI_PLAN_1Y_PRICE_PAISE: "99900",
    SHANI_PLAN_FULL_PRICE_PAISE: "149900",
    UPSTASH_REDIS_REST_URL: "https://upstash.example.test",
    UPSTASH_REDIS_REST_TOKEN: "fake-upstash-token",
    PINECONE_API_KEY: "fake-pinecone-key",
    PINECONE_HOST: "https://pinecone.example.test",
    PINECONE_INDEX: "soulguru-memory",
    OPENAI_EMBEDDING_MODEL: "text-embedding-3-small",
    CLERK_SECRET_KEY: "fake-clerk-key",
    VITE_CLERK_PUBLISHABLE_KEY: "pk_test_contract",
    CLERK_REQUIRE_AUTH: "true",
    VITE_SENTRY_DSN: "https://sentry.example/1",
    VITE_POSTHOG_KEY: "phc_contract"
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
