import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_BACKEND_FETCH_TIMEOUT_MS,
  MAX_BACKEND_FETCH_TIMEOUT_MS,
  MIN_BACKEND_FETCH_TIMEOUT_MS,
  buildBackendFetchOptions,
  fetchWithTimeout
} from "../src/backend/fetchWithTimeout.js";

const checks = [];

checkDefaultAndBoundedOptions();
await checkFetchReceivesAbortSignal();
await checkTimeoutRejectsHungRequests();
checkBackendServicesUseSharedFetchHelper();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkDefaultAndBoundedOptions() {
  const defaults = buildBackendFetchOptions({});
  const overridden = buildBackendFetchOptions({ BACKEND_FETCH_TIMEOUT_MS: "25000" });
  const clampedLow = buildBackendFetchOptions({ BACKEND_FETCH_TIMEOUT_MS: "1" });
  const clampedHigh = buildBackendFetchOptions({ BACKEND_FETCH_TIMEOUT_MS: "999999" });
  const fallback = buildBackendFetchOptions({ BACKEND_FETCH_TIMEOUT_MS: "not-a-number" });

  pushCheck("Backend fetch timeout uses production-safe defaults and bounds", [
    defaults.timeoutMs === DEFAULT_BACKEND_FETCH_TIMEOUT_MS,
    defaults.timeoutMs === 12000,
    overridden.timeoutMs === 25000,
    clampedLow.timeoutMs === MIN_BACKEND_FETCH_TIMEOUT_MS,
    clampedHigh.timeoutMs === MAX_BACKEND_FETCH_TIMEOUT_MS,
    fallback.timeoutMs === DEFAULT_BACKEND_FETCH_TIMEOUT_MS
  ].every(Boolean));
}

async function checkFetchReceivesAbortSignal() {
  const seen = [];
  const response = await fetchWithTimeout("https://vendor.example/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true })
  }, {
    env: { BACKEND_FETCH_TIMEOUT_MS: "5000" },
    label: "Vendor contract",
    fetchImpl: async (url, options) => {
      seen.push({ url, options });
      return {
        ok: true,
        status: 200,
        async json() {
          return { ok: true };
        }
      };
    }
  });

  const request = seen[0];
  pushCheck("Bounded backend fetch preserves request data and adds an abort signal", [
    response.ok === true,
    request.url === "https://vendor.example/check",
    request.options.method === "POST",
    request.options.headers["Content-Type"] === "application/json",
    JSON.parse(request.options.body).ok === true,
    request.options.signal instanceof AbortSignal,
    request.options.signal.aborted === false
  ].every(Boolean));
}

async function checkTimeoutRejectsHungRequests() {
  const start = Date.now();
  await expectRejects(
    "Bounded backend fetch rejects hung vendor calls",
    () => fetchWithTimeout("https://vendor.example/hang", {}, {
      timeoutMs: MIN_BACKEND_FETCH_TIMEOUT_MS,
      label: "Hung vendor",
      fetchImpl: async () => new Promise(() => {})
    }),
    (error) => [
      error.code === "ETIMEDOUT",
      error.timeoutMs === MIN_BACKEND_FETCH_TIMEOUT_MS,
      /Hung vendor timed out/.test(error.message),
      Date.now() - start < 1000
    ].every(Boolean)
  );
}

function checkBackendServicesUseSharedFetchHelper() {
  const backendDir = path.join(process.cwd(), "src", "backend");
  const files = fs.readdirSync(backendDir)
    .filter((file) => file.endsWith(".js"))
    .map((file) => path.join(backendDir, file));
  const violations = [];

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const relative = path.relative(process.cwd(), file);
    if (relative === "src/backend/fetchWithTimeout.js") continue;
    if (/\bfetch\s*\(/.test(source)) {
      violations.push(`${relative} calls fetch directly`);
    }
    if (/\bfetchImpl\s*\(/.test(source)) {
      violations.push(`${relative} calls fetchImpl directly`);
    }
  }

  pushCheck("Backend vendor fetches are centralized through fetchWithTimeout", violations.length === 0, violations);
}

async function expectRejects(label, action, predicate) {
  try {
    await action();
    pushCheck(label, false);
  } catch (error) {
    pushCheck(label, predicate(error));
  }
}

function pushCheck(label, passed, details = []) {
  checks.push({ label, passed, details });
}

function printReport() {
  console.log(`Backend fetch contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
    for (const detail of check.details) {
      console.log(`  - ${detail}`);
    }
  }
}
