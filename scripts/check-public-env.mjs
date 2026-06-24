import { loadEnv } from "vite";

const args = new Set(process.argv.slice(2));
const mode = getArgValue("--mode") || process.env.NODE_ENV || "production";
const strict = args.has("--strict");
const outputJson = args.has("--json");
const env = {
  ...loadEnv(mode, process.cwd(), ""),
  ...process.env
};

const allowedPublicKeys = new Set([
  "VITE_API_BASE_URL",
  "VITE_CLERK_PUBLISHABLE_KEY",
  "VITE_DEMO_PAYMENTS",
  "VITE_LOCAL_AUTH_FALLBACK",
  "VITE_POSTHOG_HOST",
  "VITE_POSTHOG_KEY",
  "VITE_SENTRY_DSN",
  "VITE_SENTRY_TRACES_SAMPLE_RATE",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_SUPABASE_URL"
]);

const serverOnlyKeys = [
  "ANDROID_KEYSTORE_PASSWORD",
  "ANDROID_KEY_PASSWORD",
  "CLERK_SECRET_KEY",
  "OPENAI_API_KEY",
  "OTP_HASH_SECRET",
  "OTP_SMS_WEBHOOK_TOKEN",
  "PINECONE_API_KEY",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "UPSTASH_REDIS_REST_TOKEN"
];

const publicKeys = Object.keys(env)
  .filter((key) => key.startsWith("VITE_"))
  .sort();
const findings = [];
const warnings = [];

for (const key of publicKeys) {
  const value = String(env[key] || "").trim();
  checkPublicKeyName(key);
  checkPublicValue(key, value);
}

checkSupabaseAnonKey();
checkDemoFlags();
checkApiBaseUrl();
checkTraceSampleRate();

const report = {
  service: "SoulGuru public env safety",
  status: findings.length ? "fail" : "pass",
  generatedAt: new Date().toISOString(),
  mode,
  strict,
  summary: {
    publicKeysScanned: publicKeys.length,
    findings: findings.length,
    warnings: warnings.length
  },
  publicKeys,
  findings,
  warnings
};

if (outputJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(report);
}

if (findings.length > 0) {
  process.exit(1);
}

function checkPublicKeyName(key) {
  if (!allowedPublicKeys.has(key)) {
    const message = `${key}: public Vite env var is not in the approved allowlist.`;
    if (strict) {
      findings.push(message);
    } else {
      warnings.push(message);
    }
  }

  if (/OPENAI|SERVICE_ROLE|SECRET|PRIVATE|PASSWORD|WEBHOOK|OTP_HASH|PINECONE|UPSTASH|CLERK_SECRET|RAZORPAY_KEY_SECRET/i.test(key)) {
    findings.push(`${key}: server-only secret name must not use the VITE_ public prefix.`);
  }
}

function checkPublicValue(key, value) {
  if (!value || isPlaceholderValue(value)) return;

  const secretPattern = [
    { name: "OpenAI API key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/ },
    { name: "private key block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
    { name: "Resend API key", pattern: /\bre_[A-Za-z0-9_-]{20,}\b/ }
  ].find((item) => item.pattern.test(value));

  if (secretPattern) {
    findings.push(`${key}: value looks like a ${secretPattern.name}.`);
  }

  for (const serverKey of serverOnlyKeys) {
    const serverValue = String(env[serverKey] || "").trim();
    if (serverValue.length >= 8 && !isPlaceholderValue(serverValue) && value === serverValue) {
      findings.push(`${key}: value exactly matches server-only ${serverKey}.`);
    }
  }
}

function checkSupabaseAnonKey() {
  const key = String(env.VITE_SUPABASE_ANON_KEY || "").trim();
  if (!key || isPlaceholderValue(key)) return;

  const payload = parseJwtPayload(key);
  if (!payload) {
    warnings.push("VITE_SUPABASE_ANON_KEY: could not decode JWT payload to verify role.");
    return;
  }

  if (payload.role === "service_role") {
    findings.push("VITE_SUPABASE_ANON_KEY: contains a Supabase service_role key. Use the anon key only.");
    return;
  }

  if (strict && payload.role && payload.role !== "anon") {
    findings.push(`VITE_SUPABASE_ANON_KEY: expected Supabase anon role, found ${payload.role}.`);
  }
}

function checkDemoFlags() {
  const localAuthFallback = String(env.VITE_LOCAL_AUTH_FALLBACK || "false").toLowerCase() === "true";
  const demoPayments = String(env.VITE_DEMO_PAYMENTS || "false").toLowerCase() === "true";
  if (strict && localAuthFallback) {
    findings.push("VITE_LOCAL_AUTH_FALLBACK: local OTP fallback must be false for production/release builds.");
  }
  if (strict && demoPayments) {
    findings.push("VITE_DEMO_PAYMENTS: demo payments must be false for production/release builds.");
  }
}

function checkApiBaseUrl() {
  const rawUrl = String(env.VITE_API_BASE_URL || "").trim();
  if (!rawUrl) return;

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    findings.push("VITE_API_BASE_URL: must be a valid URL when set.");
    return;
  }

  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname);
  const isPrivate = isPrivateHost(parsedUrl.hostname);
  if (strict && parsedUrl.protocol !== "https:") {
    findings.push("VITE_API_BASE_URL: must use https for production/release builds.");
  }
  if (strict && (isLocal || isPrivate)) {
    findings.push("VITE_API_BASE_URL: must not point to localhost or a private LAN host for production/release builds.");
  }
}

function checkTraceSampleRate() {
  const rawValue = String(env.VITE_SENTRY_TRACES_SAMPLE_RATE || "").trim();
  if (!rawValue) return;

  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    findings.push("VITE_SENTRY_TRACES_SAMPLE_RATE: must be a number between 0 and 1.");
  }
}

function printReport(report) {
  const suffix = strict ? " (strict)" : "";
  console.log(`Public env safety check: ${report.status}${suffix}`);
  console.log(`VITE vars scanned: ${report.summary.publicKeysScanned}`);

  for (const warning of report.warnings) {
    console.warn(`WARN ${warning}`);
  }

  for (const finding of report.findings) {
    console.error(`FAIL ${finding}`);
  }
}

function parseJwtPayload(value) {
  const parts = String(value || "").split(".");
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function isPrivateHost(hostname) {
  const normalized = String(hostname || "").toLowerCase();
  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    return isPrivateHost(normalized.slice(1, -1));
  }
  if (normalized === "host.docker.internal") return true;
  if (normalized.startsWith("fe80:") || normalized.startsWith("fd")) return true;

  const parts = normalized.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  return (
    parts[0] === 10 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
}

function isPlaceholderValue(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");

  if (!normalized) return true;
  if (normalized.startsWith("${{") || normalized.startsWith("$")) return true;
  if (/^(true|false|null|undefined)$/i.test(normalized)) return true;
  if (/^(your|replace|change|changeme|placeholder|example|dummy|test|todo|xxx|xxxx|redacted)/i.test(normalized)) return true;
  if (/^<[^>]+>$/.test(normalized)) return true;
  if (/^\*+$/.test(normalized)) return true;

  return false;
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}
