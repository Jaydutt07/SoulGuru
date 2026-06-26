export const PROVIDER_STACK = Object.freeze([
  {
    id: "codingWorkspace",
    name: "Coding workspace",
    planningImageLabel: "Claude / coding",
    purpose: "Implementation workspace and source files",
    readinessChecks: [],
    artifacts: ["package.json", "src/main.jsx"],
    commands: ["npm run build"],
    notes: "Runtime launch does not require a coding-provider secret."
  },
  {
    id: "openai",
    name: "OpenAI",
    planningImageLabel: "OpenAI / AI readings",
    purpose: "Server-side guidance generation and embeddings",
    readinessChecks: ["openai"],
    envScope: ["OPENAI_API_KEY", "OPENAI_MODEL"],
    artifacts: [
      "src/backend/openaiClient.js",
      "src/backend/soulWisdomService.js",
      "src/backend/astroSolveService.js",
      "src/backend/guidanceService.js",
      "src/backend/shaniService.js",
      "api/soul-wisdom.js",
      "api/astro-solve.js",
      "api/more-guidance.js",
      "api/shani-guidance.js"
    ],
    commands: [
      "npm run openai:check",
      "npm run soul:quality:ai",
      "npm run astro:quality:ai",
      "npm run more-guidance:quality:ai",
      "npm run shani:quality:ai"
    ],
    notes: "The API key must stay server-side in Vercel or local backend env."
  },
  {
    id: "supabase",
    name: "Supabase",
    planningImageLabel: "Supabase / backend",
    purpose: "Profiles, OTP challenges, daily reading cache, quotas, subscriptions, and saved guidance",
    readinessChecks: [
      "supabase",
      "otp"
    ],
    envScope: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    artifacts: [
      "supabase/migrations/001_initial_schema.sql",
      "scripts/generate-supabase-schema-bundle.mjs",
      "scripts/check-supabase-schema-bundle.mjs",
      "scripts/check-supabase-schema.mjs"
    ],
    commands: ["npm run supabase:migrations:check", "npm run supabase:bundle", "npm run supabase:schema:check"],
    notes: "Apply every migration before enabling production traffic; for a new project, print the ordered secret-free SQL bundle with npm run supabase:bundle."
  },
  {
    id: "vercel",
    name: "Vercel",
    planningImageLabel: "Vercel / deploying",
    purpose: "Hosted web app and serverless API routes",
    readinessChecks: ["domainDns"],
    envScope: ["VITE_API_BASE_URL"],
    artifacts: ["vercel.json", "api/readiness.js", "scripts/smoke-deployed-backend.mjs"],
    commands: ["npm run deployment:check", "npm run deployment:smoke"],
    notes: "Production mobile builds must point at the deployed HTTPS API base URL."
  },
  {
    id: "namecheap",
    name: "Namecheap",
    planningImageLabel: "Namecheap / domain",
    purpose: "Registered production domain",
    readinessChecks: ["domainDns"],
    envScope: ["PRODUCTION_DOMAIN"],
    artifacts: ["scripts/smoke-production-domain.mjs"],
    commands: ["npm run production:domain:smoke"],
    notes: "Use a real production domain, not localhost, preview, example, or test hosts."
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    planningImageLabel: "Cloudflare / DNS",
    purpose: "DNS and HTTPS launch gate for the production domain",
    readinessChecks: ["domainDns"],
    envScope: ["CLOUDFLARE_ZONE_ID", "CLOUDFLARE_DNS_READY"],
    artifacts: ["scripts/smoke-production-domain.mjs"],
    commands: ["npm run production:domain:check", "npm run production:domain:smoke"],
    notes: "Set CLOUDFLARE_DNS_READY only after the custom domain resolves to production."
  },
  {
    id: "razorpay",
    name: "Razorpay",
    planningImageLabel: "Razorpay / payments",
    purpose: "More Guidance and Shani remedy membership payments",
    readinessChecks: ["razorpay", "shaniMembershipAccess"],
    envScope: [
      "RAZORPAY_KEY_ID",
      "RAZORPAY_KEY_SECRET",
      "RAZORPAY_WEBHOOK_SECRET",
      "RAZORPAY_WEBHOOK_URL",
      "RAZORPAY_WEBHOOK_READY",
      "MORE_GUIDANCE_PRICE_PAISE",
      "PAYMENTS_ALLOW_LOCAL_ACTIVATION",
      "SHANI_ALLOW_LOCAL_ACCESS",
      "SHANI_PLAN_3M_PRICE_PAISE",
      "SHANI_PLAN_6M_PRICE_PAISE",
      "SHANI_PLAN_1Y_PRICE_PAISE",
      "SHANI_PLAN_FULL_PRICE_PAISE"
    ],
    artifacts: [
      "src/backend/payments.js",
      "api/create-razorpay-order.js",
      "api/verify-razorpay-payment.js",
      "api/create-shani-order.js",
      "api/verify-shani-payment.js",
      "api/razorpay-webhook.js",
      "scripts/check-payment-contracts.mjs",
      "scripts/check-client-payment-flow-contracts.mjs"
    ],
    commands: ["npm run payments:check"],
    notes: "Server owns prices, checkout orders, webhook secrets, and payment activation."
  },
  {
    id: "github",
    name: "GitHub",
    planningImageLabel: "GitHub / version control",
    purpose: "Remote repository, documented CI, and release history",
    readinessChecks: [],
    artifacts: ["docs/github-actions-ci.yml", "scripts/check-ci-contracts.mjs"],
    commands: ["npm run ci:check"],
    notes: "The active workflow file may require a GitHub token with workflow scope to push."
  },
  {
    id: "resend",
    name: "Resend",
    planningImageLabel: "Resend / emails",
    purpose: "Transactional membership and fallback delivery email",
    readinessChecks: ["transactionalEmail"],
    envScope: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
    artifacts: ["src/backend/emailService.js"],
    commands: ["npm run email:check"],
    notes: "Use a verified sender on the production domain."
  },
  {
    id: "clerk",
    name: "Clerk",
    planningImageLabel: "Clerk / auth",
    purpose: "Authenticated production API sessions",
    readinessChecks: ["clerk"],
    envScope: ["CLERK_SECRET_KEY", "VITE_CLERK_PUBLISHABLE_KEY", "CLERK_REQUIRE_AUTH"],
    artifacts: ["src/backend/auth.js", "src/authClient.js"],
    commands: ["npm run auth:check"],
    notes: "Set CLERK_REQUIRE_AUTH=true only after production login is verified end to end."
  },
  {
    id: "posthog",
    name: "PostHog",
    planningImageLabel: "PostHog / analytics",
    purpose: "Privacy-safe product analytics",
    readinessChecks: ["observability"],
    envScope: ["VITE_POSTHOG_KEY", "VITE_POSTHOG_HOST"],
    artifacts: ["src/observability.js"],
    commands: ["npm run observability:check"],
    notes: "Analytics identity must avoid raw phone numbers and emails."
  },
  {
    id: "sentry",
    name: "Sentry",
    planningImageLabel: "Sentry / error tracking",
    purpose: "Frontend and backend error monitoring",
    readinessChecks: ["observability"],
    envScope: ["SENTRY_DSN", "VITE_SENTRY_DSN", "VITE_SENTRY_TRACES_SAMPLE_RATE"],
    artifacts: ["src/observability.js", "src/backend/observabilityService.js"],
    commands: ["npm run observability:check"],
    notes: "Backend errors are sanitized before capture."
  },
  {
    id: "upstash",
    name: "Upstash",
    planningImageLabel: "Upstash / Redis",
    purpose: "Server-side rate limiting for paid, OTP, and AI routes",
    readinessChecks: ["rateLimit"],
    envScope: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "RATE_LIMIT_REQUIRE_UPSTASH"],
    artifacts: ["src/backend/rateLimit.js"],
    commands: ["npm run rate-limit:check"],
    notes: "Rate-limit subjects are deterministic hashes, not raw PII."
  },
  {
    id: "pinecone",
    name: "Pinecone",
    planningImageLabel: "Pinecone / vector DB",
    purpose: "Long-term guidance memory search",
    readinessChecks: ["pinecone"],
    envScope: ["PINECONE_API_KEY", "PINECONE_HOST", "PINECONE_INDEX", "OPENAI_EMBEDDING_MODEL", "GUIDANCE_MEMORY_REQUIRE_PINECONE"],
    artifacts: ["src/backend/memoryService.js", "api/guidance-memory.js"],
    commands: ["npm run memory:check"],
    notes: "Namespaces and metadata are sanitized before vector writes."
  }
]);

export const REQUIRED_PROVIDER_IDS = Object.freeze(PROVIDER_STACK.map((provider) => provider.id));

export function buildProviderReadinessMatrix(readiness) {
  const checksById = new Map((readiness?.checks || []).map((check) => [check.id, check]));

  return PROVIDER_STACK.map((provider) => {
    const hasEnvScope = Boolean(provider.envScope?.length);
    const checks = provider.readinessChecks
      .map((id) => checksById.get(id))
      .filter(Boolean)
      .map((check) => {
        const missingEnv = scopeMissingEnv([...check.missingEnv], provider.envScope);
        return {
          id: check.id,
          label: check.label,
          severity: check.severity,
          status: hasEnvScope ? (missingEnv.length ? check.status : "pass") : check.status,
          missingEnv
        };
      });
    const missingCheckIds = provider.readinessChecks.filter((id) => !checksById.has(id));
    const failingChecks = checks.filter((check) => check.status !== "pass");
    const missingEnv = unique(failingChecks.flatMap((check) => check.missingEnv));

    return {
      id: provider.id,
      name: provider.name,
      planningImageLabel: provider.planningImageLabel,
      purpose: provider.purpose,
      status: getProviderStatus({ checks, missingCheckIds, missingEnv, hasEnvScope }),
      missingEnv,
      checks,
      missingCheckIds,
      artifacts: [...provider.artifacts],
      commands: [...provider.commands],
      notes: provider.notes
    };
  });
}

export function summarizeProviderReadiness(matrix) {
  const providers = Array.isArray(matrix) ? matrix : [];
  return {
    total: providers.length,
    ready: providers.filter((provider) => provider.status === "ready").length,
    needsConfiguration: providers.filter((provider) => provider.status === "needs_configuration").length,
    unmapped: providers.filter((provider) => provider.status === "unmapped").length
  };
}

export function validateProviderReadinessPayload(body) {
  const errors = [];
  const providers = Array.isArray(body?.providers) ? body.providers : [];
  const providerIds = providers
    .map((provider) => String(provider?.id || "").trim())
    .filter(Boolean);
  const uniqueProviderIds = new Set(providerIds);
  const requiredProviderIds = new Set(REQUIRED_PROVIDER_IDS);
  const missingProviderIds = REQUIRED_PROVIDER_IDS.filter((id) => !uniqueProviderIds.has(id));
  const unknownProviderIds = providerIds.filter((id) => !requiredProviderIds.has(id));
  const duplicateProviderIds = providerIds.filter((id, index, ids) => ids.indexOf(id) !== index);
  const readyCount = providers.filter((provider) => provider?.status === "ready").length;
  const needsConfigurationCount = providers.filter((provider) => provider?.status === "needs_configuration").length;
  const unmappedCount = providers.filter((provider) => provider?.status === "unmapped").length;
  const unknownStatusCount = providers.filter((provider) =>
    provider && !["ready", "needs_configuration", "unmapped"].includes(provider.status)
  ).length;

  if (typeof body?.ok !== "boolean") errors.push("ok boolean");
  if (!body?.providerSummary || typeof body.providerSummary !== "object") errors.push("providerSummary object");
  if (!Array.isArray(body?.providers)) errors.push("providers array");
  if (!Number.isInteger(body?.providerSummary?.total)) errors.push("providerSummary.total integer");
  if (!Number.isInteger(body?.providerSummary?.ready)) errors.push("providerSummary.ready integer");
  if (!Number.isInteger(body?.providerSummary?.needsConfiguration)) errors.push("providerSummary.needsConfiguration integer");
  if (!Number.isInteger(body?.providerSummary?.unmapped)) errors.push("providerSummary.unmapped integer");
  if (body?.providerSummary?.total !== REQUIRED_PROVIDER_IDS.length) errors.push("providerSummary.total matches provider stack");
  if (body?.providerSummary?.ready !== readyCount) errors.push("providerSummary.ready matches providers");
  if (body?.providerSummary?.needsConfiguration !== needsConfigurationCount) errors.push("providerSummary.needsConfiguration matches providers");
  if (body?.providerSummary?.unmapped !== unmappedCount) errors.push("providerSummary.unmapped matches providers");
  if (providers.length !== REQUIRED_PROVIDER_IDS.length) errors.push("providers length matches provider stack");
  if (providerIds.length !== providers.length) errors.push("every provider has an id");
  if (unknownStatusCount) errors.push("provider statuses are recognized");
  if (missingProviderIds.length) errors.push(`missing providers: ${missingProviderIds.join(", ")}`);
  if (unknownProviderIds.length) errors.push(`unknown providers: ${unknownProviderIds.join(", ")}`);
  if (duplicateProviderIds.length) errors.push(`duplicate providers: ${[...new Set(duplicateProviderIds)].join(", ")}`);

  return {
    ok: errors.length === 0,
    errors
  };
}

function getProviderStatus({ checks, missingCheckIds, missingEnv, hasEnvScope }) {
  if (missingCheckIds.length) return "unmapped";
  if (!checks.length) return "ready";
  if (hasEnvScope) return missingEnv.length ? "needs_configuration" : "ready";
  return checks.every((check) => check.status === "pass") ? "ready" : "needs_configuration";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function scopeMissingEnv(missingEnv, envScope = []) {
  if (!envScope.length) return missingEnv;
  const scope = new Set(envScope);
  return missingEnv.filter((entry) =>
    extractEnvNames(entry).some((name) => scope.has(name))
  );
}

function extractEnvNames(value) {
  return String(value || "").match(/[A-Z][A-Z0-9_]+/g) || [];
}
