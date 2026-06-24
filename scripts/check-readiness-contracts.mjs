import { buildDeploymentReadiness } from "../src/backend/readinessService.js";

const checks = [];

checkFullProductionStackIsReady();
checkPartialStackIsNotReady();
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
    MORE_GUIDANCE_PRICE_PAISE: "49900"
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
