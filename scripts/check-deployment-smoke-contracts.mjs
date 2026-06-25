import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { PROVIDER_STACK } from "../src/backend/providerStack.js";

const checks = [];

await checkReadySmokeFailsWhenProtectedRoutesRequireAuth();
await checkReachabilitySmokeAllowsProtectedRoutesWithoutReadyExpectation();
await checkReadySmokePassesWithProtectedPostContracts();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

async function checkReadySmokeFailsWhenProtectedRoutesRequireAuth() {
  const backend = await startBackend((req, res) => {
    if (writeCoreEndpoint(req, res)) {
      return;
    }

    writeJson(res, 401, { error: "Authentication required" });
  });

  try {
    const result = await runSmoke(backend.url, ["--expect-ready"]);
    pushCheck("Ready deployment smoke fails protected 401 routes without a valid token", [
      result.status !== 0,
      result.stdout.includes("FAIL User profile API (401)"),
      result.stdout.includes("FAIL More Guidance dashboard API (401)"),
      result.stdout.includes("FAIL Shani dashboard API (401)"),
      result.stdout.includes("Production-ready smoke requires authenticated profile lookup"),
      result.stdout.includes("DEPLOYMENT_SMOKE_AUTH_TOKEN")
    ].every(Boolean));
  } finally {
    await backend.close();
  }
}

async function checkReachabilitySmokeAllowsProtectedRoutesWithoutReadyExpectation() {
  const backend = await startBackend((req, res) => {
    if (writeCoreEndpoint(req, res)) {
      return;
    }

    writeJson(res, 401, { error: "Authentication required" });
  });

  try {
    const result = await runSmoke(backend.url);
    pushCheck("Non-ready deployment smoke treats protected 401 routes as reachability only", [
      result.status === 0,
      result.stdout.includes("PASS User profile API (401)"),
      result.stdout.includes("PASS More Guidance dashboard API (401)"),
      result.stdout.includes("PASS Shani dashboard API (401)"),
      result.stdout.includes("Route is reachable and requires authentication")
    ].every(Boolean));
  } finally {
    await backend.close();
  }
}

async function checkReadySmokePassesWithProtectedPostContracts() {
  const backend = await startBackend((req, res) => {
    if (writeCoreEndpoint(req, res)) {
      return;
    }

    if (!req.headers.authorization) {
      writeJson(res, 401, { error: "Authentication required" });
      return;
    }

    if (req.url === "/api/user-profile") {
      writeJson(res, 200, { configured: true, profile: null });
      return;
    }

    if (req.url === "/api/more-guidance") {
      writeJson(res, 200, {
        configured: true,
        guidanceHistory: [],
        savedGuidance: []
      });
      return;
    }

    if (req.url === "/api/shani-guidance") {
      writeJson(res, 200, {
        configured: true,
        report: { phaseTitle: "Outside Saade Sati" },
        panditHistory: []
      });
      return;
    }

    writeJson(res, 404, { error: "not found" });
  });

  try {
    const result = await runSmoke(backend.url, ["--expect-ready", "--auth-token=contract-token"]);
    pushCheck("Ready deployment smoke passes when protected contracts are authenticated", [
      result.status === 0,
      result.stdout.includes("PASS User profile API (200)"),
      result.stdout.includes("PASS More Guidance dashboard API (200)"),
      result.stdout.includes("PASS Shani dashboard API (200)")
    ].every(Boolean));
  } finally {
    await backend.close();
  }
}

function writeCoreEndpoint(req, res) {
  if (req.url === "/api/health") {
    writeJson(res, 200, { ok: true });
    return true;
  }

  if (req.url === "/api/readiness") {
    writeJson(res, 200, readyPayload());
    return true;
  }

  return false;
}

function readyPayload() {
  const providers = PROVIDER_STACK.map((provider) => ({
    id: provider.id,
    name: provider.name,
    status: "ready",
    missingEnv: []
  }));

  return {
    ok: true,
    status: "ready",
    checks: [],
    providerSummary: {
      total: providers.length,
      ready: providers.length,
      needsConfiguration: 0,
      unmapped: 0
    },
    providers
  };
}

function startBackend(handler) {
  const server = http.createServer(handler);

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

function runSmoke(baseUrl, args = []) {
  const smokePath = path.join(process.cwd(), "scripts", "smoke-deployed-backend.mjs");
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [
      smokePath,
      `--url=${baseUrl}`,
      "--allow-http",
      ...args
    ], {
      cwd: process.cwd(),
      env: process.env,
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
  console.log(`Deployment smoke contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}
