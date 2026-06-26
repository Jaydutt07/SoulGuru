import { validateProviderReadinessPayload } from "../src/backend/providerStack.js";

const args = new Set(process.argv.slice(2));
const rawBaseUrl = getArgValue("--url") || process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || "";
const expectReady = args.has("--expect-ready");
const outputJson = args.has("--json");
const authToken = getArgValue("--auth-token") || process.env.DEPLOYMENT_SMOKE_AUTH_TOKEN || "";
const baseUrl = rawBaseUrl.trim().replace(/\/$/, "");

if (!baseUrl) {
  fail("Provide --url=https://your-production-domain.app or set VITE_API_BASE_URL.");
}

let parsedUrl;
try {
  parsedUrl = new URL(baseUrl);
} catch {
  fail(`Invalid deployment URL: ${baseUrl}`);
}

if (parsedUrl.protocol !== "https:" && !args.has("--allow-http")) {
  fail("Deployment URL must use https.");
}

const report = {
  ok: true,
  baseUrl,
  checkedAt: new Date().toISOString(),
  checks: []
};

await checkHealth();
await checkReadiness();
await checkProfileLookup();
await checkSoulWisdomFeedbackContract();
await checkMoreGuidanceDashboard();
await checkShaniDashboard();

if (outputJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(report);
}

if (!report.ok) {
  process.exit(1);
}

async function checkHealth() {
  const result = await requestJson("/api/health");
  const passed = result.status === 200 && result.body?.ok === true;
  pushCheck({
    id: "health",
    label: "Health endpoint",
    passed,
    status: result.status,
    detail: passed ? "API health is reachable." : "Expected /api/health to return 200 with ok=true."
  });
}

async function checkReadiness() {
  const result = await requestJson("/api/readiness");
  const readinessStatus = result.body?.status || "unknown";
  const validReadiness = [200, 503].includes(result.status) && typeof result.body?.ok === "boolean" && hasProviderReadiness(result.body);
  const passed = validReadiness && (!expectReady || result.body?.ok === true);
  const providerSummary = result.body?.providerSummary;
  pushCheck({
    id: "readiness",
    label: "Readiness endpoint",
    passed,
    status: result.status,
    detail: passed
      ? `Readiness status: ${readinessStatus}; providers ready ${providerSummary.ready}/${providerSummary.total}.`
      : expectReady
        ? "Deployment is reachable but not production-ready yet."
        : "Expected /api/readiness to return a readiness JSON payload with provider summary."
  });
}

async function checkProfileLookup() {
  const result = await requestJson("/api/user-profile", {
    method: "POST",
    body: {
      action: "lookup",
      phone: "+15550000000",
      email: "deployment-smoke@soulguru.local"
    }
  });

  if (handleAuthRequired(result, {
    id: "user-profile-auth",
    label: "User profile API",
    contract: "profile lookup"
  })) {
    return;
  }

  const configured = result.body?.configured;
  const passed = result.status === 200 && typeof configured === "boolean" && (!expectReady || configured === true);
  pushCheck({
    id: "user-profile",
    label: "User profile API",
    passed,
    status: result.status,
    detail: passed
      ? `Profile lookup contract returned configured=${configured}.`
      : expectReady
        ? "Expected profile lookup to be backed by configured Supabase."
        : "Expected profile lookup to return 200 with configured metadata."
  });
}

async function checkMoreGuidanceDashboard() {
  const result = await requestJson("/api/more-guidance", {
    method: "POST",
    body: {
      action: "dashboard",
      limit: 3,
      user: smokeUser()
    }
  });

  if (handleAuthRequired(result, {
    id: "more-guidance-auth",
    label: "More Guidance dashboard API",
    contract: "More Guidance dashboard"
  })) {
    return;
  }

  const configured = result.body?.configured;
  const hasArrays = Array.isArray(result.body?.guidanceHistory) && Array.isArray(result.body?.savedGuidance);
  const passed = result.status === 200 && hasArrays && typeof configured === "boolean" && (!expectReady || configured === true);
  pushCheck({
    id: "more-guidance-dashboard",
    label: "More Guidance dashboard API",
    passed,
    status: result.status,
    detail: passed
      ? `Dashboard contract returned configured=${configured}.`
      : expectReady
        ? "Expected More Guidance dashboard to be backed by configured Supabase."
        : "Expected dashboard to return 200 with guidanceHistory and savedGuidance arrays."
  });
}

async function checkSoulWisdomFeedbackContract() {
  const result = await requestJson("/api/soul-wisdom-feedback", {
    method: "POST",
    body: {
      user: smokeUser(),
      rating: "deployment-smoke-validation-only",
      readingDate: "2026-06-26",
      promptVersion: "soul-wisdom-v21",
      wisdom: "Deployment smoke validates feedback auth and input handling without storing a reading."
    }
  });

  if (handleAuthRequired(result, {
    id: "soul-wisdom-feedback-auth",
    label: "Soul Guru feedback API",
    contract: "Soul Guru feedback validation"
  })) {
    return;
  }

  const validationOnly = result.status === 400 && /feedback rating/i.test(String(result.body?.error || ""));
  pushCheck({
    id: "soul-wisdom-feedback",
    label: "Soul Guru feedback API",
    passed: validationOnly,
    status: result.status,
    detail: validationOnly
      ? "Feedback route accepted authentication and rejected the no-write validation payload."
      : "Expected feedback route to reject the no-write validation payload with a rating contract error."
  });
}

async function checkShaniDashboard() {
  const result = await requestJson("/api/shani-guidance", {
    method: "POST",
    body: {
      action: "dashboard",
      limit: 3,
      user: smokeUser()
    }
  });

  if (handleAuthRequired(result, {
    id: "shani-dashboard-auth",
    label: "Shani dashboard API",
    contract: "Shani dashboard"
  })) {
    return;
  }

  const configured = result.body?.configured;
  const hasReport = typeof result.body?.report?.phaseTitle === "string";
  const hasHistory = Array.isArray(result.body?.panditHistory);
  const passed = result.status === 200 && hasReport && hasHistory && typeof configured === "boolean" && (!expectReady || configured === true);
  pushCheck({
    id: "shani-dashboard",
    label: "Shani dashboard API",
    passed,
    status: result.status,
    detail: passed
      ? `Shani dashboard contract returned configured=${configured}.`
      : expectReady
        ? "Expected Shani dashboard to be backed by configured Supabase."
        : "Expected Shani dashboard to return 200 with a report and Pandit history array."
  });
}

async function requestJson(path, { method = "GET", body: requestBody } = {}) {
  const url = `${baseUrl}${path}`;
  try {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(requestBody ? { "Content-Type": "application/json" } : {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
      },
      ...(requestBody ? { body: JSON.stringify(requestBody) } : {})
    });
    const responseBody = await response.json().catch(() => null);
    return {
      status: response.status,
      body: responseBody
    };
  } catch (error) {
    return {
      status: 0,
      body: null,
      error: error.message
    };
  }
}

function isAuthRequired(result) {
  return result.status === 401 && /auth/i.test(String(result.body?.error || ""));
}

function handleAuthRequired(result, { id, label, contract }) {
  if (!isAuthRequired(result)) {
    return false;
  }

  const tokenHint = authToken
    ? "The supplied --auth-token/DEPLOYMENT_SMOKE_AUTH_TOKEN was rejected by the deployment."
    : "Provide --auth-token or DEPLOYMENT_SMOKE_AUTH_TOKEN to validate protected POST routes.";

  pushCheck({
    id,
    label,
    passed: !expectReady,
    status: result.status,
    detail: expectReady
      ? `Production-ready smoke requires authenticated ${contract}. ${tokenHint}`
      : `Route is reachable and requires authentication. ${tokenHint}`
  });
  return true;
}

function smokeUser() {
  return {
    id: "deployment-smoke",
    name: "Deployment Smoke",
    phone: "+15550000000",
    email: "deployment-smoke@soulguru.local",
    birthDate: "1992-02-14",
    birthTime: "08:30",
    birthPlace: "Mumbai, India",
    birthLatitude: 19.076,
    birthLongitude: 72.8777,
    birthTimezone: "Asia/Kolkata",
    birthTimezoneOffsetMinutes: 330
  };
}

function pushCheck(check) {
  report.checks.push(check);
  if (!check.passed) {
    report.ok = false;
  }
}

function printReport(result) {
  console.log(`SoulGuru deployment smoke: ${result.ok ? "pass" : "fail"}`);
  console.log(`URL: ${result.baseUrl}`);
  for (const check of result.checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label} (${check.status})`);
    console.log(`  ${check.detail}`);
  }
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1) : "";
}

function hasProviderReadiness(body) {
  return validateProviderReadinessPayload(body).ok;
}

function fail(message) {
  console.error(`Deployment smoke check failed: ${message}`);
  process.exit(1);
}
