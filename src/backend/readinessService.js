export function buildDeploymentReadiness(env = process.env) {
  const checks = [
    checkRequired(env, "openai", "OpenAI AI routes", [
      "OPENAI_API_KEY",
      "OPENAI_MODEL"
    ], "Set OpenAI server env vars before enabling Soul Guru and Astro Solves AI routes."),
    checkRequired(env, "supabase", "Supabase persistence", [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY"
    ], "Configure Supabase and apply all migrations before production launch."),
    checkAstroSolves(env),
    checkOtp(env),
    checkRazorpay(env),
    checkRequired(env, "rateLimit", "Upstash rate limiting", [
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN"
    ], "Configure Upstash so AI, OTP, and payment routes are protected from abuse.", "warning"),
    checkPinecone(env),
    checkClerk(env),
    checkRequired(env, "observability", "Observability", [
      "VITE_SENTRY_DSN",
      "VITE_POSTHOG_KEY"
    ], "Configure Sentry and PostHog public keys for production monitoring.", "warning")
  ];

  const failedChecks = checks.filter((check) => check.status === "fail");
  const warnings = checks.filter((check) => check.status === "warn" || (check.severity === "warning" && check.status === "fail"));
  const ready = failedChecks.length === 0;

  return {
    ok: ready,
    service: "SoulGuru API",
    status: ready ? "ready" : "needs_configuration",
    generatedAt: new Date().toISOString(),
    summary: {
      total: checks.length,
      passing: checks.filter((check) => check.status === "pass").length,
      failing: checks.filter((check) => check.status === "fail").length,
      warnings: warnings.length
    },
    checks: checks.map(sanitizeCheck)
  };
}

function checkRequired(env, id, label, requiredEnv, advice, severity = "critical") {
  const missing = requiredEnv.filter((name) => !hasEnv(env, name));
  return {
    id,
    label,
    severity,
    status: missing.length ? "fail" : "pass",
    requiredEnv,
    missingEnv: missing,
    advice: missing.length ? advice : ""
  };
}

function checkAstroSolves(env) {
  const localQuotaEnabled = String(env.ASTRO_SOLVES_ALLOW_LOCAL_QUOTA || "false").toLowerCase() === "true";
  const missingEnv = localQuotaEnabled ? ["ASTRO_SOLVES_ALLOW_LOCAL_QUOTA=false"] : [];

  return {
    id: "astroSolvesQuota",
    label: "Astro Solves quota persistence",
    severity: "critical",
    status: missingEnv.length ? "fail" : "pass",
    requiredEnv: ["ASTRO_SOLVES_ALLOW_LOCAL_QUOTA=false"],
    missingEnv,
    advice: missingEnv.length
      ? "Disable local Astro Solves quota mode so production questions are counted and stored in Supabase."
      : ""
  };
}

function checkOtp(env) {
  const missingBase = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
    .filter((name) => !hasEnv(env, name));
  const otpSecret = String(env.OTP_HASH_SECRET || "").trim();
  const hasSms = hasEnv(env, "OTP_SMS_WEBHOOK_URL");
  const hasEmail = hasEnv(env, "RESEND_API_KEY") && hasEnv(env, "RESEND_FROM_EMAIL");
  const demoEnabled = String(env.OTP_DEMO_ENABLED || "false").toLowerCase() === "true";
  const deliveryConfigured = hasSms || hasEmail;
  const missingEnv = [...missingBase];

  if (!otpSecret) {
    missingEnv.push("OTP_HASH_SECRET");
  } else if (otpSecret.length < 32) {
    missingEnv.push("OTP_HASH_SECRET>=32 characters");
  }
  if (!deliveryConfigured) {
    missingEnv.push("OTP_SMS_WEBHOOK_URL or RESEND_API_KEY+RESEND_FROM_EMAIL");
  }
  if (demoEnabled) {
    missingEnv.push("OTP_DEMO_ENABLED=false");
  }

  return {
    id: "otp",
    label: "Backend OTP login",
    severity: "critical",
    status: missingEnv.length ? "fail" : "pass",
    requiredEnv: [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "OTP_HASH_SECRET>=32 characters",
      "OTP_SMS_WEBHOOK_URL or RESEND_API_KEY+RESEND_FROM_EMAIL",
      "OTP_DEMO_ENABLED=false"
    ],
    missingEnv,
    advice: missingEnv.length ? "Configure Supabase-backed OTP storage, a strong OTP hash secret, and a real SMS/email delivery path." : ""
  };
}

function checkRazorpay(env) {
  const requiredEnv = [
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
    "MORE_GUIDANCE_PRICE_PAISE",
    "PAYMENTS_ALLOW_LOCAL_ACTIVATION=false"
  ];
  const missingEnv = [
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
    "MORE_GUIDANCE_PRICE_PAISE"
  ].filter((name) => !hasEnv(env, name));
  const localActivationEnabled = String(env.PAYMENTS_ALLOW_LOCAL_ACTIVATION || "false").toLowerCase() === "true";
  if (localActivationEnabled) {
    missingEnv.push("PAYMENTS_ALLOW_LOCAL_ACTIVATION=false");
  }

  return {
    id: "razorpay",
    label: "Razorpay checkout",
    severity: "critical",
    status: missingEnv.length ? "fail" : "pass",
    requiredEnv,
    missingEnv,
    advice: missingEnv.length ? "Configure Razorpay keys, webhook secret, More Guidance price, and persisted payment activation." : ""
  };
}

function checkPinecone(env) {
  const requiredEnv = [
    "PINECONE_API_KEY",
    "PINECONE_HOST",
    "PINECONE_INDEX",
    "OPENAI_EMBEDDING_MODEL"
  ];
  const missing = requiredEnv.filter((name) => !hasEnv(env, name));
  return {
    id: "pinecone",
    label: "Long-term guidance memory",
    severity: "warning",
    status: missing.length ? "fail" : "pass",
    requiredEnv,
    missingEnv: missing,
    advice: missing.length ? "Configure Pinecone and embeddings to enable long-term personalized guidance memory." : ""
  };
}

function checkClerk(env) {
  const requireAuth = String(env.CLERK_REQUIRE_AUTH || "false").toLowerCase() === "true";
  const missing = [];
  if (!hasEnv(env, "CLERK_SECRET_KEY")) missing.push("CLERK_SECRET_KEY");
  if (!hasEnv(env, "VITE_CLERK_PUBLISHABLE_KEY")) missing.push("VITE_CLERK_PUBLISHABLE_KEY");
  if (!requireAuth) missing.push("CLERK_REQUIRE_AUTH=true");

  return {
    id: "clerk",
    label: "Authenticated API protection",
    severity: "warning",
    status: missing.length ? "fail" : "pass",
    requiredEnv: [
      "CLERK_SECRET_KEY",
      "VITE_CLERK_PUBLISHABLE_KEY",
      "CLERK_REQUIRE_AUTH=true"
    ],
    missingEnv: missing,
    advice: missing.length ? "Configure Clerk before locking production AI/payment routes to authenticated users." : ""
  };
}

function sanitizeCheck(check) {
  return {
    id: check.id,
    label: check.label,
    severity: check.severity,
    status: check.status,
    requiredEnv: check.requiredEnv,
    missingEnv: check.missingEnv,
    advice: check.advice
  };
}

function hasEnv(env, name) {
  return Boolean(String(env[name] || "").trim());
}
