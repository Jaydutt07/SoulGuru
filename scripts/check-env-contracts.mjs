import fs from "node:fs";
import { buildDeploymentReadiness } from "../src/backend/readinessService.js";
import {
  ENV_EXAMPLE_KEYS,
  FALLBACK_FLAG_DEFAULTS,
  PUBLIC_ENV_ALLOWLIST,
  SERVER_ONLY_ENV_KEYS
} from "../src/backend/envManifest.js";

const checks = [];
const envExample = fs.readFileSync(".env.example", "utf8");
const entries = parseEnvExample(envExample);
const exampleKeys = new Set(entries.map((entry) => entry.key));
const publicAllowlist = new Set(PUBLIC_ENV_ALLOWLIST);

checkEnvExampleCoversManifest();
checkEnvExampleCoversReadiness();
checkPublicKeysAreAllowlisted();
checkServerSecretsStayServerOnly();
checkFallbackDefaults();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkEnvExampleCoversManifest() {
  const missing = ENV_EXAMPLE_KEYS.filter((key) => !exampleKeys.has(key));
  pushCheck(".env.example includes every env manifest key", missing.length === 0, missing);
}

function checkEnvExampleCoversReadiness() {
  const readinessKeys = new Set(
    buildDeploymentReadiness({})
      .checks
      .flatMap((check) => check.requiredEnv)
      .flatMap(extractEnvNames)
  );
  const missing = [...readinessKeys].filter((key) => !exampleKeys.has(key)).sort();
  pushCheck(".env.example includes every production readiness env key", missing.length === 0, missing);
}

function checkPublicKeysAreAllowlisted() {
  const unknown = [...exampleKeys]
    .filter((key) => key.startsWith("VITE_") && !publicAllowlist.has(key))
    .sort();
  const missing = PUBLIC_ENV_ALLOWLIST.filter((key) => !exampleKeys.has(key));
  pushCheck("Public VITE env keys match the approved allowlist", unknown.length === 0 && missing.length === 0, [
    ...unknown.map((key) => `${key} is not allowlisted`),
    ...missing.map((key) => `${key} is missing from .env.example`)
  ]);
}

function checkServerSecretsStayServerOnly() {
  const publicSecrets = SERVER_ONLY_ENV_KEYS.filter((key) => key.startsWith("VITE_"));
  const allowlistedSecrets = SERVER_ONLY_ENV_KEYS.filter((key) => publicAllowlist.has(key));
  pushCheck("Server-only secret keys are not public VITE env keys", publicSecrets.length === 0 && allowlistedSecrets.length === 0, [
    ...publicSecrets,
    ...allowlistedSecrets
  ]);
}

function checkFallbackDefaults() {
  const wrongDefaults = Object.entries(FALLBACK_FLAG_DEFAULTS)
    .filter(([key, expected]) => entries.find((entry) => entry.key === key)?.value !== expected)
    .map(([key, expected]) => `${key} should default to ${expected}`);
  pushCheck("Local fallback and demo flags default to production-safe values", wrongDefaults.length === 0, wrongDefaults);
}

function parseEnvExample(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const [key, ...valueParts] = line.split("=");
      return {
        key: key.trim(),
        value: valueParts.join("=").trim()
      };
    })
    .filter((entry) => /^[A-Z0-9_]+$/.test(entry.key));
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
  console.log(`Environment contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
    for (const detail of check.details) {
      console.log(`  - ${detail}`);
    }
  }
}
