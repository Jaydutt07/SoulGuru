import dns from "node:dns/promises";
import { loadEnv } from "vite";

const args = new Set(process.argv.slice(2));
const allowMissingEnv = args.has("--allow-missing-env");
const allowHttp = args.has("--allow-http");
const skipDns = args.has("--skip-dns");
const skipBackend = args.has("--skip-backend");
const expectReady = args.has("--expect-ready");
const outputJson = args.has("--json");
const mode = getArgValue("--mode") || process.env.NODE_ENV || "production";
const env = {
  ...loadEnv(mode, process.cwd(), ""),
  ...process.env
};

const productionDomain = normalizeDomain(getArgValue("--domain") || env.PRODUCTION_DOMAIN);
const apiBaseUrl = String(getArgValue("--url") || env.VITE_API_BASE_URL || env.API_BASE_URL || "").trim().replace(/\/$/, "");
const dnsReady = String(env.CLOUDFLARE_DNS_READY || "false").toLowerCase() === "true";
const zoneId = String(env.CLOUDFLARE_ZONE_ID || "").trim();
const missing = [];

if (!productionDomain) missing.push("PRODUCTION_DOMAIN");
if (!zoneId) missing.push("CLOUDFLARE_ZONE_ID");
if (!dnsReady) missing.push("CLOUDFLARE_DNS_READY=true");
if (!apiBaseUrl) missing.push("VITE_API_BASE_URL");

if (missing.length > 0) {
  if (allowMissingEnv) {
    printSkip(`missing ${missing.join(", ")}`);
    process.exit(0);
  }
  fail(`Missing production domain configuration: ${missing.join(", ")}.`);
}

const report = {
  ok: true,
  productionDomain,
  apiBaseUrl,
  checkedAt: new Date().toISOString(),
  checks: []
};

let parsedApiUrl;
checkDomainShape();
checkZoneIdShape();
checkApiUrlShape();

if (!skipDns) {
  await checkDnsResolution();
}

if (!skipBackend) {
  await checkBackendHealth();
  await checkBackendReadiness();
}

if (outputJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(report);
}

if (!report.ok) {
  process.exit(1);
}

function checkDomainShape() {
  const passed = isValidProductionDomain(productionDomain);
  pushCheck({
    id: "domain-format",
    label: "Production domain format",
    passed,
    detail: passed
      ? `${productionDomain} is a production domain.`
      : "PRODUCTION_DOMAIN must be a registered domain without protocol, localhost, IP, or placeholder values."
  });
}

function checkZoneIdShape() {
  const passed = /^[a-f0-9]{16,64}$/i.test(zoneId);
  pushCheck({
    id: "cloudflare-zone",
    label: "Cloudflare zone id",
    passed,
    detail: passed
      ? "Cloudflare zone id has the expected shape."
      : "CLOUDFLARE_ZONE_ID must be the Cloudflare zone identifier for the production domain."
  });
}

function checkApiUrlShape() {
  try {
    parsedApiUrl = new URL(apiBaseUrl);
  } catch {
    pushCheck({
      id: "api-url",
      label: "Production API URL",
      passed: false,
      detail: "VITE_API_BASE_URL/API_BASE_URL must be a valid URL."
    });
    return;
  }

  const httpsOk = parsedApiUrl.protocol === "https:" || (allowHttp && parsedApiUrl.protocol === "http:");
  const hostOk = urlBelongsToDomain(parsedApiUrl, productionDomain);
  const passed = httpsOk && hostOk;
  pushCheck({
    id: "api-domain",
    label: "Production API domain",
    passed,
    detail: passed
      ? `${apiBaseUrl} belongs to ${productionDomain}.`
      : "The API URL must use HTTPS and the production domain or one of its subdomains."
  });
}

async function checkDnsResolution() {
  if (!parsedApiUrl || !isValidProductionDomain(parsedApiUrl.hostname)) {
    pushCheck({
      id: "dns-resolution",
      label: "DNS resolution",
      passed: false,
      detail: "DNS lookup requires a valid production API hostname."
    });
    return;
  }

  try {
    const records = await dns.lookup(parsedApiUrl.hostname, { all: true });
    const passed = Array.isArray(records) && records.length > 0;
    pushCheck({
      id: "dns-resolution",
      label: "DNS resolution",
      passed,
      detail: passed
        ? `${parsedApiUrl.hostname} resolves to ${records.length} address record(s).`
        : `${parsedApiUrl.hostname} did not resolve to any address records.`
    });
  } catch (error) {
    pushCheck({
      id: "dns-resolution",
      label: "DNS resolution",
      passed: false,
      detail: `DNS lookup failed for ${parsedApiUrl.hostname}: ${error.message}`
    });
  }
}

async function checkBackendHealth() {
  const result = await requestJson("/api/health");
  const passed = result.status === 200 && result.body?.ok === true;
  pushCheck({
    id: "health",
    label: "Domain health endpoint",
    passed,
    status: result.status,
    detail: passed
      ? "Production domain serves SoulGuru API health."
      : "Expected production domain /api/health to return 200 with ok=true."
  });
}

async function checkBackendReadiness() {
  const result = await requestJson("/api/readiness");
  const validPayload = [200, 503].includes(result.status) && typeof result.body?.ok === "boolean";
  const passed = validPayload && (!expectReady || result.body?.ok === true);
  pushCheck({
    id: "readiness",
    label: "Domain readiness endpoint",
    passed,
    status: result.status,
    detail: passed
      ? `Production domain readiness status: ${result.body?.status || "unknown"}.`
      : expectReady
        ? "Production domain is reachable but /api/readiness is not ready."
        : "Expected production domain /api/readiness to return a readiness JSON payload."
  });
}

async function requestJson(path) {
  if (!parsedApiUrl) {
    return { status: 0, body: null };
  }

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers: {
        Accept: "application/json"
      }
    });
    const body = await response.json().catch(() => null);
    return {
      status: response.status,
      body
    };
  } catch (error) {
    return {
      status: 0,
      body: null,
      error: error.message
    };
  }
}

function pushCheck(check) {
  report.checks.push(check);
  if (!check.passed) {
    report.ok = false;
  }
}

function printReport(result) {
  console.log(`SoulGuru production domain smoke: ${result.ok ? "pass" : "fail"}`);
  console.log(`Domain: ${result.productionDomain}`);
  console.log(`URL: ${result.apiBaseUrl}`);
  for (const check of result.checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}${check.status ? ` (${check.status})` : ""}`);
    console.log(`  ${check.detail}`);
  }
}

function printSkip(reason) {
  const message = `SoulGuru production domain smoke: skipped (${reason}).`;
  if (outputJson) {
    console.log(JSON.stringify({
      ok: true,
      skipped: true,
      reason
    }, null, 2));
  } else {
    console.log(message);
  }
}

function normalizeDomain(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
}

function isValidProductionDomain(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/\.$/, "");
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

function urlBelongsToDomain(url, domain) {
  const hostname = String(url.hostname || "").toLowerCase();
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}

function fail(message) {
  console.error(`Production domain smoke failed: ${message}`);
  process.exit(1);
}
