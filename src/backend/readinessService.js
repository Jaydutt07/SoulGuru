export function buildDeploymentReadiness(env = process.env) {
  const checks = [
    checkRequired(env, "openai", "OpenAI AI routes", [
      "OPENAI_API_KEY",
      "OPENAI_MODEL"
    ], "Set OpenAI server env vars before enabling Soul Guru and Astro Solves AI routes."),
    checkSupabase(env),
    checkPlaceGeocoding(env),
    checkSoulWisdom(env),
    checkAstroSolves(env),
    checkMoreGuidance(env),
    checkShani(env),
    checkOtp(env),
    checkTransactionalEmail(env),
    checkRazorpay(env),
    checkRateLimit(env),
    checkPinecone(env),
    checkClerk(env),
    checkObservability(env),
    checkDomainDns(env)
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

function checkObservability(env) {
  const missingEnv = [];
  const sentryDsnKey = hasEnv(env, "SENTRY_DSN")
    ? "SENTRY_DSN"
    : hasEnv(env, "VITE_SENTRY_DSN")
      ? "VITE_SENTRY_DSN"
      : "";

  if (!sentryDsnKey) {
    missingEnv.push("SENTRY_DSN or VITE_SENTRY_DSN");
  } else if (!isValidSentryDsn(env[sentryDsnKey])) {
    missingEnv.push(`${sentryDsnKey}=valid Sentry DSN`);
  }
  if (!hasEnv(env, "VITE_POSTHOG_KEY")) {
    missingEnv.push("VITE_POSTHOG_KEY");
  }
  if (hasEnv(env, "VITE_POSTHOG_HOST") && !isHttpsUrl(env.VITE_POSTHOG_HOST)) {
    missingEnv.push("VITE_POSTHOG_HOST=https URL");
  }

  return {
    id: "observability",
    label: "Observability",
    severity: "warning",
    status: missingEnv.length ? "fail" : "pass",
    requiredEnv: ["SENTRY_DSN or VITE_SENTRY_DSN", "VITE_POSTHOG_KEY", "VITE_POSTHOG_HOST=https URL"],
    missingEnv,
    advice: missingEnv.length
      ? "Configure Sentry error tracking and PostHog analytics for production monitoring."
      : ""
  };
}

function checkSupabase(env) {
  const missingEnv = [];
  if (!hasEnv(env, "SUPABASE_URL")) {
    missingEnv.push("SUPABASE_URL");
  } else if (!isHttpsUrl(env.SUPABASE_URL)) {
    missingEnv.push("SUPABASE_URL=https URL");
  }
  if (!hasEnv(env, "SUPABASE_SERVICE_ROLE_KEY")) {
    missingEnv.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  return {
    id: "supabase",
    label: "Supabase persistence",
    severity: "critical",
    status: missingEnv.length ? "fail" : "pass",
    requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    missingEnv,
    advice: missingEnv.length ? "Configure Supabase and apply all migrations before production launch." : ""
  };
}

function checkPlaceGeocoding(env) {
  const missingEnv = [];
  if (!hasEnv(env, "PLACE_GEOCODER_URL")) {
    missingEnv.push("PLACE_GEOCODER_URL");
  } else if (!isHttpsUrl(env.PLACE_GEOCODER_URL)) {
    missingEnv.push("PLACE_GEOCODER_URL=https URL");
  }
  if (!hasEnv(env, "PLACE_GEOCODER_USER_AGENT")) {
    missingEnv.push("PLACE_GEOCODER_USER_AGENT");
  }

  return {
    id: "birthPlaceAccuracy",
    label: "Birth place accuracy",
    severity: "warning",
    status: missingEnv.length ? "fail" : "pass",
    requiredEnv: ["PLACE_GEOCODER_URL", "PLACE_GEOCODER_USER_AGENT"],
    missingEnv,
    advice: missingEnv.length
      ? "Configure a Nominatim-compatible geocoder so uncatalogued birth places resolve to accurate coordinates and timezones before chart calculations."
      : ""
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

function checkSoulWisdom(env) {
  const uncachedEnabled = String(env.SOUL_WISDOM_ALLOW_UNCACHED || "false").toLowerCase() === "true";
  const missingEnv = uncachedEnabled ? ["SOUL_WISDOM_ALLOW_UNCACHED=false"] : [];

  return {
    id: "soulWisdomCache",
    label: "Soul Guru daily cache persistence",
    severity: "critical",
    status: missingEnv.length ? "fail" : "pass",
    requiredEnv: ["SOUL_WISDOM_ALLOW_UNCACHED=false"],
    missingEnv,
    advice: missingEnv.length
      ? "Disable uncached Soul Guru mode so production readings are cached once per user per day."
      : ""
  };
}

function checkMoreGuidance(env) {
  const localAccessEnabled = String(env.MORE_GUIDANCE_ALLOW_LOCAL_ACCESS || "false").toLowerCase() === "true";
  const missingEnv = localAccessEnabled ? ["MORE_GUIDANCE_ALLOW_LOCAL_ACCESS=false"] : [];

  return {
    id: "moreGuidanceAccess",
    label: "More Guidance paid access persistence",
    severity: "critical",
    status: missingEnv.length ? "fail" : "pass",
    requiredEnv: ["MORE_GUIDANCE_ALLOW_LOCAL_ACCESS=false"],
    missingEnv,
    advice: missingEnv.length
      ? "Disable local More Guidance access so production paid readings require persisted subscription and cache state."
      : ""
  };
}

function checkShani(env) {
  const localAccessEnabled = String(env.SHANI_ALLOW_LOCAL_ACCESS || "false").toLowerCase() === "true";
  const missingEnv = localAccessEnabled ? ["SHANI_ALLOW_LOCAL_ACCESS=false"] : [];
  const priceKeys = [
    "SHANI_PLAN_3M_PRICE_PAISE",
    "SHANI_PLAN_6M_PRICE_PAISE",
    "SHANI_PLAN_1Y_PRICE_PAISE",
    "SHANI_PLAN_FULL_PRICE_PAISE"
  ];
  for (const key of priceKeys) {
    if (!hasEnv(env, key)) {
      missingEnv.push(key);
    } else if (!isPositiveIntegerEnv(env, key)) {
      missingEnv.push(`${key}=positive integer`);
    }
  }

  return {
    id: "shaniMembershipAccess",
    label: "Shani remedy membership persistence",
    severity: "critical",
    status: missingEnv.length ? "fail" : "pass",
    requiredEnv: ["SHANI_ALLOW_LOCAL_ACCESS=false", ...priceKeys],
    missingEnv,
    advice: missingEnv.length
      ? "Disable local Shani access and configure server-owned Shani plan prices before selling remedy memberships."
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
  if (hasSms && !isHttpsUrl(env.OTP_SMS_WEBHOOK_URL)) {
    missingEnv.push("OTP_SMS_WEBHOOK_URL=https URL");
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

function checkTransactionalEmail(env) {
  const missingEnv = [];
  if (!hasEnv(env, "RESEND_API_KEY")) {
    missingEnv.push("RESEND_API_KEY");
  }
  if (!hasEnv(env, "RESEND_FROM_EMAIL")) {
    missingEnv.push("RESEND_FROM_EMAIL");
  } else if (!isValidEmailSender(env.RESEND_FROM_EMAIL)) {
    missingEnv.push("RESEND_FROM_EMAIL=valid email sender");
  }

  return {
    id: "transactionalEmail",
    label: "Transactional emails",
    severity: "warning",
    status: missingEnv.length ? "fail" : "pass",
    requiredEnv: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
    missingEnv,
    advice: missingEnv.length
      ? "Configure Resend so OTP fallback and paid membership confirmation emails are deliverable."
      : ""
  };
}

function checkRazorpay(env) {
  const requiredEnv = [
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
    "RAZORPAY_WEBHOOK_URL=/api/razorpay-webhook",
    "RAZORPAY_WEBHOOK_READY=true",
    "MORE_GUIDANCE_PRICE_PAISE",
    "PAYMENTS_ALLOW_LOCAL_ACTIVATION=false"
  ];
  const missingEnv = [
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET"
  ].filter((name) => !hasEnv(env, name));
  if (!hasEnv(env, "RAZORPAY_WEBHOOK_URL")) {
    missingEnv.push("RAZORPAY_WEBHOOK_URL");
  } else {
    const webhookUrlProblem = getWebhookUrlProblem(env.RAZORPAY_WEBHOOK_URL, env.PRODUCTION_DOMAIN);
    if (webhookUrlProblem) {
      missingEnv.push(webhookUrlProblem);
    }
  }
  const webhookReady = String(env.RAZORPAY_WEBHOOK_READY || "false").toLowerCase() === "true";
  if (!webhookReady) {
    missingEnv.push("RAZORPAY_WEBHOOK_READY=true");
  }
  if (!hasEnv(env, "MORE_GUIDANCE_PRICE_PAISE")) {
    missingEnv.push("MORE_GUIDANCE_PRICE_PAISE");
  } else if (!isPositiveIntegerEnv(env, "MORE_GUIDANCE_PRICE_PAISE")) {
    missingEnv.push("MORE_GUIDANCE_PRICE_PAISE=positive integer");
  }
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
    advice: missingEnv.length ? "Configure Razorpay keys, webhook URL/secret, More Guidance price, and persisted payment activation." : ""
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
  if (hasEnv(env, "PINECONE_HOST") && !isHttpsUrlOrHost(env.PINECONE_HOST)) {
    missing.push("PINECONE_HOST=valid HTTPS URL or host");
  }
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

function checkRateLimit(env) {
  const missingEnv = [];
  if (!hasEnv(env, "UPSTASH_REDIS_REST_URL")) {
    missingEnv.push("UPSTASH_REDIS_REST_URL");
  } else if (!isHttpsUrl(env.UPSTASH_REDIS_REST_URL)) {
    missingEnv.push("UPSTASH_REDIS_REST_URL=https URL");
  }
  if (!hasEnv(env, "UPSTASH_REDIS_REST_TOKEN")) {
    missingEnv.push("UPSTASH_REDIS_REST_TOKEN");
  }

  return {
    id: "rateLimit",
    label: "Upstash rate limiting",
    severity: "warning",
    status: missingEnv.length ? "fail" : "pass",
    requiredEnv: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
    missingEnv,
    advice: missingEnv.length ? "Configure Upstash so AI, OTP, and payment routes are protected from abuse." : ""
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

function checkDomainDns(env) {
  const missing = [];
  const productionDomain = String(env.PRODUCTION_DOMAIN || "").trim().toLowerCase();
  const apiBaseUrl = String(env.VITE_API_BASE_URL || "").trim();
  const dnsReady = String(env.CLOUDFLARE_DNS_READY || "false").toLowerCase() === "true";

  if (!hasEnv(env, "PRODUCTION_DOMAIN")) {
    missing.push("PRODUCTION_DOMAIN");
  } else if (!isValidProductionDomain(productionDomain)) {
    missing.push("PRODUCTION_DOMAIN=valid domain");
  }

  if (!hasEnv(env, "CLOUDFLARE_ZONE_ID")) {
    missing.push("CLOUDFLARE_ZONE_ID");
  } else if (!isValidCloudflareZoneId(env.CLOUDFLARE_ZONE_ID)) {
    missing.push("CLOUDFLARE_ZONE_ID=Cloudflare zone id");
  }

  if (!dnsReady) {
    missing.push("CLOUDFLARE_DNS_READY=true");
  }

  if (!hasEnv(env, "VITE_API_BASE_URL")) {
    missing.push("VITE_API_BASE_URL");
  } else if (!isProductionHttpsUrl(apiBaseUrl)) {
    missing.push("VITE_API_BASE_URL=production HTTPS URL");
  } else if (isValidProductionDomain(productionDomain) && !urlBelongsToDomain(apiBaseUrl, productionDomain)) {
    missing.push("VITE_API_BASE_URL=production domain or subdomain");
  }

  return {
    id: "domainDns",
    label: "Production domain and DNS",
    severity: "warning",
    status: missing.length ? "fail" : "pass",
    requiredEnv: [
      "PRODUCTION_DOMAIN=valid domain",
      "CLOUDFLARE_ZONE_ID=Cloudflare zone id",
      "CLOUDFLARE_DNS_READY=true",
      "VITE_API_BASE_URL=production HTTPS URL"
    ],
    missingEnv: missing,
    advice: missing.length
      ? "Configure the Namecheap domain in Cloudflare DNS and point the production app/API URL at that HTTPS domain before launch."
      : ""
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
  const value = String(env[name] || "").trim();
  return Boolean(value && !isPlaceholderValue(value));
}

function isPositiveIntegerEnv(env, name) {
  const value = String(env[name] || "").trim();
  if (!/^\d+$/.test(value)) return false;
  return Number(value) > 0;
}

function isHttpsUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function isProductionHttpsUrl(value) {
  if (!isHttpsUrl(value)) return false;
  const hostname = new URL(String(value || "").trim()).hostname.toLowerCase();
  return isValidProductionDomain(hostname);
}

function getWebhookUrlProblem(value, productionDomain) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    return "RAZORPAY_WEBHOOK_URL=https URL";
  }

  if (url.protocol !== "https:" || !url.hostname) {
    return "RAZORPAY_WEBHOOK_URL=https URL";
  }

  if (url.pathname !== "/api/razorpay-webhook" || url.search || url.hash) {
    return "RAZORPAY_WEBHOOK_URL=/api/razorpay-webhook";
  }

  const normalizedDomain = String(productionDomain || "").trim().toLowerCase().replace(/\.$/, "");
  if (isValidProductionDomain(normalizedDomain) && !urlBelongsToDomain(value, normalizedDomain)) {
    return "RAZORPAY_WEBHOOK_URL=production domain or subdomain";
  }

  return "";
}

function isValidProductionDomain(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");

  if (!normalized || normalized.length > 253) return false;
  if (/^https?:\/\//i.test(normalized)) return false;
  if (/[/?#:\s]/.test(normalized)) return false;
  if (normalized === "localhost" || normalized.endsWith(".localhost")) return false;
  if (normalized === "example.com" || normalized.endsWith(".example.com")) return false;
  if (normalized.endsWith(".example") || normalized.endsWith(".test") || normalized.endsWith(".invalid")) return false;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized)) return false;

  const labels = normalized.split(".");
  if (labels.length < 2) return false;
  return labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
}

function isValidCloudflareZoneId(value) {
  return /^[a-f0-9]{16,64}$/i.test(String(value || "").trim());
}

function urlBelongsToDomain(value, domain) {
  try {
    const hostname = new URL(String(value || "").trim()).hostname.toLowerCase();
    const normalizedDomain = String(domain || "").trim().toLowerCase().replace(/\.$/, "");
    return hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`);
  } catch {
    return false;
  }
}

function isHttpsUrlOrHost(value) {
  const normalized = String(value || "").trim();
  if (!normalized || /\s/.test(normalized)) return false;

  if (/^https?:\/\//i.test(normalized)) {
    return isHttpsUrl(normalized);
  }

  if (/[/?#]/.test(normalized)) return false;
  try {
    const url = new URL(`https://${normalized}`);
    return Boolean(url.hostname) && url.pathname === "/" && !url.search && !url.hash;
  } catch {
    return false;
  }
}

function isValidSentryDsn(value) {
  try {
    const url = new URL(String(value || "").trim());
    const projectId = url.pathname.split("/").filter(Boolean).pop();
    return url.protocol === "https:" && Boolean(url.username) && Boolean(url.hostname) && Boolean(projectId);
  } catch {
    return false;
  }
}

function isValidEmailSender(value) {
  const normalized = String(value || "").trim();
  if (!normalized || /\r|\n/.test(normalized)) return false;
  const angleMatch = normalized.match(/<([^<>]+)>$/);
  const email = angleMatch ? angleMatch[1] : normalized;
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email.trim());
}

function isPlaceholderValue(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");

  if (!normalized) return true;
  if (normalized.startsWith("${{") || normalized.startsWith("$")) return true;
  if (/^(true|false|null|undefined)$/i.test(normalized)) return true;
  if (/^(your|replace|change|changeme|placeholder|example|dummy|fake|todo|xxx|xxxx|redacted)(?:[-_\s].*)?$/i.test(normalized)) {
    return true;
  }
  if (/^<[^>]+>$/.test(normalized)) return true;
  if (/^\*+$/.test(normalized)) return true;

  return false;
}
