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
checkProviderStackCarriesPlanningImageCostContext();
checkProviderMappingsTargetRealReadinessChecks();
checkProviderArtifactsExist();
checkSupabaseProviderCoversEveryMigration();
checkOpenAIProviderCoversEveryAIRouteAndService();
checkOpenAIProviderCoversEveryLiveQualityGate();
checkOpenAIProviderCoversQualityAndContractScripts();
checkVercelProviderCoversDeploymentContracts();
checkDomainProvidersCoverCustomDomainContracts();
checkRazorpayProviderCoversEveryPaidAccessRoute();
checkResendProviderCoversEmailContracts();
checkObservabilityProvidersCoverPrivacyAndErrorContracts();
checkUpstashProviderCoversRouteRateLimitMatrix();
checkClerkProviderCoversClientAndApiAuthContracts();
checkPineconeProviderCoversMemoryContracts();
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

function checkProviderStackCarriesPlanningImageCostContext() {
  const missing = PROVIDER_STACK
    .filter((provider) => !String(provider.planningImageCost || "").trim())
    .map((provider) => provider.id);
  const labels = PROVIDER_STACK.map((provider) => `${provider.id}:${provider.planningImageCost || ""}`);

  pushCheck("Provider stack preserves planning-image cost assumptions", [
    missing.length === 0,
    labels.some((label) => /namecheap/i.test(label) && /INR 800\/year/i.test(label)),
    labels.some((label) => /razorpay/i.test(label) && /2\.5%/.test(label)),
    labels.some((label) => /supabase/i.test(label) && /free/i.test(label)),
    labels.some((label) => /pinecone/i.test(label) && /free/i.test(label))
  ].every(Boolean), missing);
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
    "src/backend/userIdentity.js",
    "src/soulWisdomVersion.js",
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
    "npm run soul:daily:ai",
    "npm run astro:quality:ai",
    "npm run more-guidance:quality:ai",
    "npm run shani:quality:ai"
  ];
  const missing = requiredCommands.filter((command) => !openai?.commands?.includes(command));

  pushCheck("OpenAI provider verifies every live AI reading surface", missing.length === 0, missing);
}

function checkOpenAIProviderCoversQualityAndContractScripts() {
  const openai = PROVIDER_STACK.find((provider) => provider.id === "openai");
  const requiredArtifacts = [
    "scripts/check-openai-contracts.mjs",
    "scripts/check-soul-wisdom-quality.mjs",
    "scripts/check-astro-solve-quality.mjs",
    "scripts/check-more-guidance-quality.mjs",
    "scripts/check-shani-quality.mjs",
    "scripts/soul-wisdom-quality-cases.mjs"
  ];
  const missing = requiredArtifacts.filter((artifact) => !openai?.artifacts?.includes(artifact));

  pushCheck("OpenAI provider evidence covers AI request and reading-quality scripts", missing.length === 0, missing);
}

function checkVercelProviderCoversDeploymentContracts() {
  const vercel = PROVIDER_STACK.find((provider) => provider.id === "vercel");
  const requiredArtifacts = [
    "vercel.json",
    "api/readiness.js",
    "scripts/check-deployment-contracts.mjs",
    "scripts/check-deployment-smoke-contracts.mjs",
    "scripts/smoke-deployed-backend.mjs"
  ];
  const requiredCommands = [
    "npm run deployment:check",
    "npm run deployment:smoke:check",
    "npm run deployment:smoke"
  ];
  const missing = [
    ...requiredArtifacts.filter((artifact) => !vercel?.artifacts?.includes(artifact)),
    ...requiredCommands.filter((command) => !vercel?.commands?.includes(command))
  ];

  pushCheck("Vercel provider evidence covers deployment config and backend smoke contracts", missing.length === 0, missing);
}

function checkDomainProvidersCoverCustomDomainContracts() {
  const requiredArtifacts = [
    "scripts/check-production-domain-smoke-contracts.mjs",
    "scripts/smoke-production-domain.mjs"
  ];
  const requiredCommands = [
    "npm run production:domain:check",
    "npm run production:domain:smoke"
  ];
  const missing = ["namecheap", "cloudflare"].flatMap((providerId) => {
    const provider = PROVIDER_STACK.find((entry) => entry.id === providerId);
    return [
      ...requiredArtifacts
        .filter((artifact) => !provider?.artifacts?.includes(artifact))
        .map((artifact) => `${providerId}:${artifact}`),
      ...requiredCommands
        .filter((command) => !provider?.commands?.includes(command))
        .map((command) => `${providerId}:${command}`)
    ];
  });

  pushCheck("Namecheap and Cloudflare provider evidence covers custom-domain launch contracts", missing.length === 0, missing);
}

function checkRazorpayProviderCoversEveryPaidAccessRoute() {
  const razorpay = PROVIDER_STACK.find((provider) => provider.id === "razorpay");
  const requiredArtifacts = [
    "src/backend/payments.js",
    "src/backend/userIdentity.js",
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

function checkResendProviderCoversEmailContracts() {
  const resend = PROVIDER_STACK.find((provider) => provider.id === "resend");
  const requiredArtifacts = [
    "src/backend/emailService.js",
    "scripts/check-email-contracts.mjs"
  ];
  const missingArtifacts = requiredArtifacts.filter((artifact) => !resend?.artifacts?.includes(artifact));
  const missingCommands = ["npm run email:check"].filter((command) => !resend?.commands?.includes(command));

  pushCheck("Resend provider evidence covers transactional email contracts", [
    missingArtifacts.length === 0,
    missingCommands.length === 0
  ].every(Boolean), [...missingArtifacts, ...missingCommands]);
}

function checkObservabilityProvidersCoverPrivacyAndErrorContracts() {
  const posthog = PROVIDER_STACK.find((provider) => provider.id === "posthog");
  const sentry = PROVIDER_STACK.find((provider) => provider.id === "sentry");
  const posthogRequiredArtifacts = [
    "src/observability.js",
    "scripts/check-observability-contracts.mjs"
  ];
  const sentryRequiredArtifacts = [
    "src/observability.js",
    "src/backend/observabilityService.js",
    "scripts/check-observability-contracts.mjs"
  ];
  const missing = [
    ...posthogRequiredArtifacts
      .filter((artifact) => !posthog?.artifacts?.includes(artifact))
      .map((artifact) => `posthog:${artifact}`),
    ...sentryRequiredArtifacts
      .filter((artifact) => !sentry?.artifacts?.includes(artifact))
      .map((artifact) => `sentry:${artifact}`),
    ...["npm run observability:check"]
      .filter((command) => !posthog?.commands?.includes(command))
      .map((command) => `posthog:${command}`),
    ...["npm run observability:check"]
      .filter((command) => !sentry?.commands?.includes(command))
      .map((command) => `sentry:${command}`)
  ];

  pushCheck("PostHog and Sentry provider evidence covers privacy and error observability contracts", missing.length === 0, missing);
}

function checkUpstashProviderCoversRouteRateLimitMatrix() {
  const upstash = PROVIDER_STACK.find((provider) => provider.id === "upstash");
  const requiredArtifacts = [
    "src/backend/rateLimit.js",
    "scripts/check-rate-limit-contracts.mjs",
    "scripts/check-api-rate-limit-contracts.mjs"
  ];
  const missing = requiredArtifacts.filter((artifact) => !upstash?.artifacts?.includes(artifact));

  pushCheck("Upstash provider evidence covers helper and API route rate-limit matrix", missing.length === 0, missing);
}

function checkClerkProviderCoversClientAndApiAuthContracts() {
  const clerk = PROVIDER_STACK.find((provider) => provider.id === "clerk");
  const requiredArtifacts = [
    "src/backend/auth.js",
    "src/authClient.js",
    "scripts/check-auth-contracts.mjs",
    "scripts/check-client-auth-flow-contracts.mjs",
    "scripts/check-api-route-auth-contracts.mjs"
  ];
  const missing = requiredArtifacts.filter((artifact) => !clerk?.artifacts?.includes(artifact));

  pushCheck("Clerk provider evidence covers client auth and protected API route matrix", missing.length === 0, missing);
}

function checkPineconeProviderCoversMemoryContracts() {
  const pinecone = PROVIDER_STACK.find((provider) => provider.id === "pinecone");
  const requiredArtifacts = [
    "src/backend/memoryService.js",
    "api/guidance-memory.js",
    "scripts/check-memory-contracts.mjs"
  ];
  const missingArtifacts = requiredArtifacts.filter((artifact) => !pinecone?.artifacts?.includes(artifact));
  const missingCommands = ["npm run memory:check"].filter((command) => !pinecone?.commands?.includes(command));

  pushCheck("Pinecone provider evidence covers long-term guidance memory contracts", [
    missingArtifacts.length === 0,
    missingCommands.length === 0
  ].every(Boolean), [...missingArtifacts, ...missingCommands]);
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
