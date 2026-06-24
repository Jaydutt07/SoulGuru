import { loadEnv } from "vite";

const mode = process.env.NODE_ENV || "production";
const env = {
  ...process.env,
  ...loadEnv(mode, process.cwd(), "")
};

const apiBaseUrl = String(env.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");
const allowLocalhost = process.argv.includes("--allow-localhost");
const allowLan = process.argv.includes("--allow-lan");
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
const isLanHost = isPrivateHost(parsedUrl.hostname);
if (parsedUrl.protocol !== "https:" && !(allowLocalhost && isLocalhost) && !(allowLan && isLanHost)) {
  fail("VITE_API_BASE_URL must use https for mobile builds, unless --allow-lan is used for local phone testing.");
}

if (isLocalhost && !allowLocalhost) {
  fail("VITE_API_BASE_URL cannot point to localhost for a phone APK. Use a deployed backend URL.");
}

if (isLanHost && !allowLan) {
  fail("VITE_API_BASE_URL points to a private LAN host. Use --allow-lan only for local phone testing, or use a deployed HTTPS backend.");
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
