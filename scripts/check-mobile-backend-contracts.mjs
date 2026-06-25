import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const checks = [];

checkLocalApkBuildEnablesPreviewFlags();
await checkReadyBackendPasses();
await checkNotReadyBackendFailsByDefault();
await checkNotReadyBackendCanBeAllowedForStaging();
await checkLocalhostRequiresExplicitAllowance();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkLocalApkBuildEnablesPreviewFlags() {
  const source = fs.readFileSync("scripts/build-local-mobile-apk.mjs", "utf8");
  pushCheck("Local phone APK build enables only local preview fallback flags", [
    source.includes('VITE_LOCAL_AUTH_FALLBACK: "true"'),
    source.includes('VITE_LOCAL_PAID_FALLBACK: "true"'),
    source.includes('VITE_DEMO_PAYMENTS: "true"'),
    source.includes("Local preview flags enabled"),
    source.includes('VITE_API_BASE_URL: apiBaseUrl')
  ].every(Boolean));
}

async function checkReadyBackendPasses() {
  const backend = await startBackend({
    ok: true,
    status: "ready",
    checks: [],
    providerSummary: {
      total: 2,
      ready: 2,
      needsConfiguration: 0,
      unmapped: 0
    },
    providers: [
      { id: "supabase", status: "ready", missingEnv: [] },
      { id: "razorpay", status: "ready", missingEnv: [] }
    ]
  });

  try {
    const result = await runValidator(backend.url, ["--allow-localhost"]);
    pushCheck("Mobile backend validator accepts a ready backend", [
      result.status === 0,
      result.stdout.includes("(ready)")
    ].every(Boolean));
  } finally {
    await backend.close();
  }
}

async function checkNotReadyBackendFailsByDefault() {
  const backend = await startBackend(notReadyPayload());

  try {
    const result = await runValidator(backend.url, ["--allow-localhost"]);
    pushCheck("Mobile backend validator fails an unready backend by default", [
      result.status !== 0,
      result.stderr.includes("Backend readiness is needs_configuration"),
      result.stderr.includes("supabase"),
      result.stderr.includes("razorpay")
    ].every(Boolean));
  } finally {
    await backend.close();
  }
}

async function checkNotReadyBackendCanBeAllowedForStaging() {
  const backend = await startBackend(notReadyPayload());

  try {
    const result = await runValidator(backend.url, ["--allow-localhost", "--allow-not-ready"]);
    pushCheck("Mobile backend validator allows explicit staging/local not-ready checks", [
      result.status === 0,
      result.stderr.includes("Mobile backend readiness warning"),
      result.stdout.includes("(needs_configuration)")
    ].every(Boolean));
  } finally {
    await backend.close();
  }
}

async function checkLocalhostRequiresExplicitAllowance() {
  const result = await runValidator("http://127.0.0.1:9", ["--skip-health", "--skip-readiness"]);
  pushCheck("Mobile backend validator rejects localhost without explicit allowance", [
    result.status !== 0,
    /localhost|https for mobile builds/.test(result.stderr)
  ].every(Boolean));
}

function notReadyPayload() {
  return {
    ok: false,
    status: "needs_configuration",
    checks: [
      { id: "supabase", label: "Supabase persistence", status: "fail" },
      { id: "razorpay", label: "Razorpay checkout", status: "fail" }
    ],
    providerSummary: {
      total: 2,
      ready: 0,
      needsConfiguration: 2,
      unmapped: 0
    },
    providers: [
      { id: "supabase", status: "needs_configuration", missingEnv: ["SUPABASE_URL"] },
      { id: "razorpay", status: "needs_configuration", missingEnv: ["RAZORPAY_KEY_ID"] }
    ]
  };
}

function startBackend(readinessPayload) {
  const server = http.createServer((req, res) => {
    if (req.url === "/api/health") {
      writeJson(res, 200, { ok: true });
      return;
    }

    if (req.url === "/api/readiness") {
      writeJson(res, readinessPayload.ok ? 200 : 503, readinessPayload);
      return;
    }

    writeJson(res, 404, { error: "not found" });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((done) => server.close(done))
      });
    });
  });
}

function writeJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json"
  });
  res.end(JSON.stringify(body));
}

function runValidator(apiBaseUrl, args = []) {
  const validatorPath = path.join(process.cwd(), "scripts", "validate-mobile-backend.mjs");
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [validatorPath, ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        VITE_API_BASE_URL: apiBaseUrl
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function printReport() {
  console.log(`Mobile backend contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}
