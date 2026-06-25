import { spawnSync } from "node:child_process";
import { buildDeploymentReadiness } from "../src/backend/readinessService.js";
import {
  FALLBACK_FLAG_DEFAULTS,
  SERVER_ONLY_ENV_KEYS
} from "../src/backend/envManifest.js";

const checks = [];
const result = spawnSync(process.execPath, ["scripts/generate-production-env-checklist.mjs"], {
  cwd: process.cwd(),
  encoding: "utf8"
});
const output = result.stdout || "";
const stderr = result.stderr || "";

checkGeneratorRuns();
checkCoversReadinessRequirements();
checkServerOnlySecretsAreLabeled();
checkFallbackDefaultsAreListed();
checkDoesNotExposeRuntimeSecretValues();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkGeneratorRuns() {
  pushCheck("Production env checklist generator runs", [
    result.status === 0,
    output.includes("# SoulGuru Production Env Checklist"),
    output.includes("placeholder-only"),
    !stderr.trim()
  ].every(Boolean), stderr ? [stderr.trim()] : []);
}

function checkCoversReadinessRequirements() {
  const missing = [...new Set(buildDeploymentReadiness({})
    .checks
    .flatMap((check) => check.requiredEnv)
    .flatMap(extractEnvNames))]
    .filter((name) => !output.includes(`\`${name}\``))
    .sort();

  pushCheck("Production env checklist covers every readiness env name", missing.length === 0, missing);
}

function checkServerOnlySecretsAreLabeled() {
  const missing = SERVER_ONLY_ENV_KEYS
    .filter((name) => output.includes(`\`${name}\``))
    .filter((name) => !output.includes(`\`${name}\` - server-only secret`))
    .sort();

  pushCheck("Production env checklist labels server-only secrets", missing.length === 0, missing);
}

function checkFallbackDefaultsAreListed() {
  const missing = Object.entries(FALLBACK_FLAG_DEFAULTS)
    .filter(([key, expected]) => !output.includes(`\`${key}\` = \`${expected}\``))
    .map(([key, expected]) => `${key}=${expected}`)
    .sort();

  pushCheck("Production env checklist lists safe fallback defaults", missing.length === 0, missing);
}

function checkDoesNotExposeRuntimeSecretValues() {
  const sentinelEnv = {
    ...process.env,
    OPENAI_API_KEY: "openai-prod-env-checklist-sentinel",
    SUPABASE_SERVICE_ROLE_KEY: "supabase-service-role-sentinel",
    RAZORPAY_KEY_SECRET: "razorpay-secret-sentinel",
    OTP_HASH_SECRET: "otp-secret-sentinel-with-at-least-32-characters"
  };
  const sentinelResult = spawnSync(process.execPath, ["scripts/generate-production-env-checklist.mjs"], {
    cwd: process.cwd(),
    env: sentinelEnv,
    encoding: "utf8"
  });
  const sentinelOutput = sentinelResult.stdout || "";
  const leaked = [
    sentinelEnv.OPENAI_API_KEY,
    sentinelEnv.SUPABASE_SERVICE_ROLE_KEY,
    sentinelEnv.RAZORPAY_KEY_SECRET,
    sentinelEnv.OTP_HASH_SECRET
  ].filter((value) => sentinelOutput.includes(value));

  pushCheck("Production env checklist never reads live secret values", [
    sentinelResult.status === 0,
    leaked.length === 0
  ].every(Boolean), leaked);
}

function extractEnvNames(value) {
  return String(value || "")
    .split(/\s+or\s+|\+/i)
    .map((part) => part.trim().match(/^([A-Z][A-Z0-9_]*)/)?.[1])
    .filter(Boolean);
}

function pushCheck(label, passed, details = []) {
  checks.push({ label, passed, details });
}

function printReport() {
  console.log(`Production env checklist contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
    for (const detail of check.details) {
      console.log(`  - ${detail}`);
    }
  }
}
