import { loadEnv } from "vite";

const mode = process.env.NODE_ENV || "production";
const env = {
  ...process.env,
  ...loadEnv(mode, process.cwd(), "")
};

const apiBaseUrl = String(env.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");
const allowLocalhost = process.argv.includes("--allow-localhost");
const skipHealth = process.argv.includes("--skip-health");

if (!apiBaseUrl) {
  fail("VITE_API_BASE_URL is required for a backend-connected mobile build.");
}

let parsedUrl;
try {
  parsedUrl = new URL(apiBaseUrl);
} catch {
  fail(`VITE_API_BASE_URL is not a valid URL: ${apiBaseUrl}`);
}

const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname);
if (parsedUrl.protocol !== "https:" && !(allowLocalhost && isLocalhost)) {
  fail("VITE_API_BASE_URL must use https for mobile builds.");
}

if (isLocalhost && !allowLocalhost) {
  fail("VITE_API_BASE_URL cannot point to localhost for a phone APK. Use a deployed backend URL.");
}

const unsafePublicKeys = Object.keys(env).filter((key) => {
  if (!key.startsWith("VITE_")) return false;
  return /OPENAI|SERVICE_ROLE|SECRET|PRIVATE|TOKEN/i.test(key);
});

if (unsafePublicKeys.length > 0) {
  fail(`Remove server secrets from public Vite env vars: ${unsafePublicKeys.join(", ")}`);
}

if (!skipHealth) {
  const healthUrl = `${apiBaseUrl}/api/health`;
  const response = await fetch(healthUrl).catch((error) => {
    fail(`Unable to reach backend health check at ${healthUrl}: ${error.message}`);
  });

  if (!response?.ok) {
    fail(`Backend health check failed at ${healthUrl} with status ${response?.status || "unknown"}.`);
  }
}

console.log(`Mobile backend check passed: ${apiBaseUrl}`);

function fail(message) {
  console.error(`Mobile backend check failed: ${message}`);
  process.exit(1);
}
