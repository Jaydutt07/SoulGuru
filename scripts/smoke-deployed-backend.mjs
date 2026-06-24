const args = new Set(process.argv.slice(2));
const rawBaseUrl = getArgValue("--url") || process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || "";
const expectReady = args.has("--expect-ready");
const outputJson = args.has("--json");
const baseUrl = rawBaseUrl.trim().replace(/\/$/, "");

if (!baseUrl) {
  fail("Provide --url=https://your-vercel-app.vercel.app or set VITE_API_BASE_URL.");
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
  const validReadiness = [200, 503].includes(result.status) && typeof result.body?.ok === "boolean";
  const passed = validReadiness && (!expectReady || result.body?.ok === true);
  pushCheck({
    id: "readiness",
    label: "Readiness endpoint",
    passed,
    status: result.status,
    detail: passed
      ? `Readiness status: ${readinessStatus}.`
      : expectReady
        ? "Deployment is reachable but not production-ready yet."
        : "Expected /api/readiness to return a readiness JSON payload."
  });
}

async function requestJson(path) {
  const url = `${baseUrl}${path}`;
  try {
    const response = await fetch(url, {
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

function fail(message) {
  console.error(`Deployment smoke check failed: ${message}`);
  process.exit(1);
}
