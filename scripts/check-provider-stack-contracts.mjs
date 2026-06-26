import fs from "node:fs";
import { buildDeploymentReadiness } from "../src/backend/readinessService.js";
import {
  PROVIDER_STACK,
  buildProviderReadinessMatrix,
  summarizeProviderReadiness,
  validateProviderReadinessPayload
} from "../src/backend/providerStack.js";

const checks = [];

checkProviderStackCoversPlannedProviders();
checkProviderMappingsTargetRealReadinessChecks();
checkProviderArtifactsExist();
checkSupabaseProviderCoversEveryMigration();
checkOpenAIProviderCoversEveryAIRouteAndService();
checkOpenAIProviderCoversEveryLiveQualityGate();
checkRazorpayProviderCoversEveryPaidAccessRoute();
checkProviderMatrixReportsMissingEnvWithoutSecrets();
checkProviderPayloadValidatorRequiresExactStack();
checkProviderMatrixPassesWithFullProductionEnv();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkProviderStackCoversPlannedProviders() {
  const requiredProviderIds = [
    "codingWorkspace",
    "openai",
    "supabase",
    "vercel",
    "namecheap",
    "cloudflare",
    "razorpay",
    "github",
    "resend",
    "clerk",
    "posthog",
    "sentry",
    "upstash",
    "pinecone"
  ];
  const providerIds = new Set(PROVIDER_STACK.map((provider) => provider.id));
  const missing = requiredProviderIds.filter((id) => !providerIds.has(id));
  const duplicates = PROVIDER_STACK
    .map((provider) => provider.id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);

  pushCheck("Provider stack covers the planning-image providers plus OpenAI runtime", [
    missing.length === 0,
    duplicates.length === 0,
    PROVIDER_STACK.length === requiredProviderIds.length
  ].every(Boolean), [...missing, ...duplicates]);
}

function checkProviderMappingsTargetRealReadinessChecks() {
  const report = buildDeploymentReadiness(fullEnv());
  const checkIds = new Set(report.checks.map((check) => check.id));
  const unknownIds = PROVIDER_STACK.flatMap((provider) =>
    provider.readinessChecks
      .filter((id) => !checkIds.has(id))
      .map((id) => `${provider.id}:${id}`)
  );

  pushCheck("Every provider readiness mapping targets an existing readiness check", unknownIds.length === 0, unknownIds);
}

function checkProviderArtifactsExist() {
  const missing = PROVIDER_STACK.flatMap((provider) =>
    provider.artifacts
      .filter((artifact) => !fs.existsSync(artifact))
      .map((artifact) => `${provider.id}:${artifact}`)
  );

  pushCheck("Every provider evidence artifact exists in the repository", missing.length === 0, missing);
}

function checkSupabaseProviderCoversEveryMigration() {
  const supabase = PROVIDER_STACK.find((provider) => provider.id === "supabase");
  const migrations = fs.readdirSync("supabase/migrations")
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => `supabase/migrations/${file}`);
  const missing = migrations.filter((artifact) => !supabase?.artifacts?.includes(artifact));

  pushCheck("Supabase provider evidence covers every production migration", missing.length === 0, missing);
}

function checkOpenAIProviderCoversEveryAIRouteAndService() {
  const openai = PROVIDER_STACK.find((provider) => provider.id === "openai");
  const requiredArtifacts = [
    "src/backend/openaiClient.js",
    "src/backend/soulWisdomService.js",
    "src/backend/astroSolveService.js",
    "src/backend/guidanceService.js",
    "src/backend/shaniService.js",
    "api/soul-wisdom.js",
    "api/astro-solve.js",
    "api/more-guidance.js",
    "api/shani-guidance.js"
  ];
  const missing = requiredArtifacts.filter((artifact) => !openai?.artifacts?.includes(artifact));

  pushCheck("OpenAI provider evidence covers every AI route and generation service", missing.length === 0, missing);
}

function checkOpenAIProviderCoversEveryLiveQualityGate() {
  const openai = PROVIDER_STACK.find((provider) => provider.id === "openai");
  const requiredCommands = [
    "npm run soul:quality:ai",
    "npm run astro:quality:ai",
    "npm run more-guidance:quality:ai",
    "npm run shani:quality:ai"
  ];
  const missing = requiredCommands.filter((command) => !openai?.commands?.includes(command));

  pushCheck("OpenAI provider verifies every live AI reading surface", missing.length === 0, missing);
}

function checkRazorpayProviderCoversEveryPaidAccessRoute() {
  const razorpay = PROVIDER_STACK.find((provider) => provider.id === "razorpay");
  const requiredArtifacts = [
    "src/backend/payments.js",
    "api/create-razorpay-order.js",
    "api/verify-razorpay-payment.js",
    "api/create-shani-order.js",
    "api/verify-shani-payment.js",
    "api/razorpay-webhook.js",
    "scripts/check-payment-contracts.mjs",
    "scripts/check-client-payment-flow-contracts.mjs"
  ];
  const missing = requiredArtifacts.filter((artifact) => !razorpay?.artifacts?.includes(artifact));

  pushCheck("Razorpay provider evidence covers More Guidance and Shani paid routes", missing.length === 0, missing);
}

function checkProviderMatrixReportsMissingEnvWithoutSecrets() {
  const env = {
    OPENAI_API_KEY: "real-openai-secret-for-contract",
    SUPABASE_SERVICE_ROLE_KEY: "real-supabase-secret-for-contract",
    RAZORPAY_KEY_SECRET: "real-razorpay-secret-for-contract",
    RAZORPAY_WEBHOOK_SECRET: "real-razorpay-webhook-secret-for-contract",
    RESEND_API_KEY: "real-resend-secret-for-contract",
    CLERK_SECRET_KEY: "real-clerk-secret-for-contract",
    UPSTASH_REDIS_REST_TOKEN: "real-upstash-secret-for-contract",
    PINECONE_API_KEY: "real-pinecone-secret-for-contract"
  };
  const matrix = buildProviderReadinessMatrix(buildDeploymentReadiness(env));
  const serialized = JSON.stringify(matrix);
  const forbidden = Object.values(env).filter(Boolean);
  const supabase = matrix.find((provider) => provider.id === "supabase");
  const razorpay = matrix.find((provider) => provider.id === "razorpay");
  const summary = summarizeProviderReadiness(matrix);

  pushCheck("Provider matrix reports missing env names without leaking secret values", [
    summary.needsConfiguration > 0,
    supabase?.missingEnv.includes("SUPABASE_URL"),
    razorpay?.missingEnv.includes("RAZORPAY_KEY_ID"),
    forbidden.every((value) => !serialized.includes(value))
  ].every(Boolean));
}

function checkProviderPayloadValidatorRequiresExactStack() {
  const report = buildDeploymentReadiness(fullEnv());
  const missingProviderReport = {
    ...report,
    providers: report.providers.filter((provider) => provider.id !== "pinecone")
  };
  const unknownProviderReport = {
    ...report,
    providers: [...report.providers, { id: "unknown-provider", status: "ready", missingEnv: [] }]
  };
  const duplicateProviderReport = {
    ...report,
    providers: [...report.providers, report.providers[0]]
  };

  pushCheck("Provider payload validator requires the exact planned provider IDs", [
    validateProviderReadinessPayload(report).ok,
    !validateProviderReadinessPayload(missingProviderReport).ok,
    !validateProviderReadinessPayload(unknownProviderReport).ok,
    !validateProviderReadinessPayload(duplicateProviderReport).ok
  ].every(Boolean));
}

function checkProviderMatrixPassesWithFullProductionEnv() {
  const matrix = buildProviderReadinessMatrix(buildDeploymentReadiness(fullEnv()));
  const summary = summarizeProviderReadiness(matrix);

  pushCheck("Provider matrix is fully ready when production readiness is fully configured", [
    summary.total === PROVIDER_STACK.length,
    summary.ready === PROVIDER_STACK.length,
    summary.needsConfiguration === 0,
    summary.unmapped === 0,
    matrix.every((provider) => provider.status === "ready")
  ].every(Boolean));
}

function fullEnv() {
  return {
    OPENAI_API_KEY: "openai-contract-key-123456",
    OPENAI_MODEL: "gpt-5.5",
    ASTRO_SOLVE_MODEL: "gpt-5.5",
    SUPABASE_URL: "https://soulguru-prod.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-contract-secret-123456",
    OTP_HASH_SECRET: "soulguru-otp-hash-secret-with-at-least-32-chars",
    OTP_SMS_WEBHOOK_URL: "https://sms.soulguru.app/send",
    OTP_SMS_WEBHOOK_TOKEN: "sms-webhook-contract-token",
    RAZORPAY_KEY_ID: "rzp_test_contract123456",
    RAZORPAY_KEY_SECRET: "razorpay-contract-secret-123456",
    RAZORPAY_WEBHOOK_SECRET: "razorpay-webhook-secret-123456",
    RAZORPAY_WEBHOOK_URL: "https://soulguru.app/api/razorpay-webhook",
    RAZORPAY_WEBHOOK_READY: "true",
    MORE_GUIDANCE_PRICE_PAISE: "49900",
    SHANI_PLAN_3M_PRICE_PAISE: "29900",
    SHANI_PLAN_6M_PRICE_PAISE: "54900",
    SHANI_PLAN_1Y_PRICE_PAISE: "99900",
    SHANI_PLAN_FULL_PRICE_PAISE: "149900",
    PAYMENTS_ALLOW_LOCAL_ACTIVATION: "false",
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

function pushCheck(label, passed, details = []) {
  checks.push({ label, passed, details });
}

function printReport() {
  console.log(`Provider stack contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
    for (const detail of check.details) {
      console.log(`  - ${detail}`);
    }
  }
}
