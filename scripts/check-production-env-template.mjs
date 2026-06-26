import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  ENV_EXAMPLE_KEYS,
  FALLBACK_FLAG_DEFAULTS,
  PUBLIC_ENV_ALLOWLIST,
  SERVER_ONLY_ENV_KEYS
} from "../src/backend/envManifest.js";
import { PROVIDER_STACK } from "../src/backend/providerStack.js";

const checks = [];
const result = spawnSync(process.execPath, ["scripts/generate-production-env-template.mjs"], {
  cwd: process.cwd(),
  encoding: "utf8"
});
const output = result.stdout || "";
const stderr = result.stderr || "";
const parsed = parseEnv(output);

checkGeneratorRuns();
checkCoversEnvExampleExactlyOnce();
checkCoversProviderEnvScopes();
checkEnvVisibilityLabels();
checkServerOnlySecretValuesAreBlank();
checkProductionSafeDefaults();
checkOutFileMode();
checkDoesNotExposeRuntimeSecretValues();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkGeneratorRuns() {
  pushCheck("Production env template generator runs", [
    result.status === 0,
    output.includes("# SoulGuru Production Env Template"),
    output.includes("Placeholder-only"),
    !stderr.trim()
  ].every(Boolean), stderr ? [stderr.trim()] : []);
}

function checkCoversEnvExampleExactlyOnce() {
  const outputKeys = envLineKeys(output);
  const missing = ENV_EXAMPLE_KEYS.filter((key) => !outputKeys.includes(key));
  const unknown = outputKeys.filter((key) => !ENV_EXAMPLE_KEYS.includes(key));
  const duplicates = outputKeys.filter((key, index, keys) => keys.indexOf(key) !== index);

  pushCheck("Production env template covers every .env.example key exactly once", [
    outputKeys.length === ENV_EXAMPLE_KEYS.length,
    missing.length === 0,
    unknown.length === 0,
    duplicates.length === 0
  ].every(Boolean), [...missing, ...unknown, ...duplicates]);
}

function checkCoversProviderEnvScopes() {
  const outputKeys = new Set(envLineKeys(output));
  const missing = PROVIDER_STACK
    .flatMap((provider) => provider.envScope || [])
    .filter((key) => !outputKeys.has(key));

  pushCheck("Production env template covers every provider env scope", missing.length === 0, missing);
}

function checkEnvVisibilityLabels() {
  const missingSecrets = SERVER_ONLY_ENV_KEYS
    .filter((key) => ENV_EXAMPLE_KEYS.includes(key))
    .filter((key) => !output.includes(`# ${key} - server-only secret`));
  const missingPublic = PUBLIC_ENV_ALLOWLIST
    .filter((key) => ENV_EXAMPLE_KEYS.includes(key))
    .filter((key) => !output.includes(`# ${key} - public Vite env`));

  pushCheck("Production env template labels public env and server-only secrets", [
    missingSecrets.length === 0,
    missingPublic.length === 0
  ].every(Boolean), [...missingSecrets, ...missingPublic]);
}

function checkServerOnlySecretValuesAreBlank() {
  const filled = SERVER_ONLY_ENV_KEYS
    .filter((key) => ENV_EXAMPLE_KEYS.includes(key))
    .filter((key) => String(parsed.get(key) || "").trim());

  pushCheck("Production env template leaves server-only secrets blank", filled.length === 0, filled);
}

function checkProductionSafeDefaults() {
  const missingFallbacks = Object.entries(FALLBACK_FLAG_DEFAULTS)
    .filter(([key, expected]) => parsed.get(key) !== expected)
    .map(([key, expected]) => `${key}=${expected}`);
  const mismatchedLaunchGates = [
    parsed.get("CLERK_REQUIRE_AUTH") === "true" ? "" : "CLERK_REQUIRE_AUTH=true",
    parsed.get("PLACE_GEOCODER_REQUIRE_RESOLUTION") === "true" ? "" : "PLACE_GEOCODER_REQUIRE_RESOLUTION=true",
    parsed.get("RATE_LIMIT_REQUIRE_UPSTASH") === "true" ? "" : "RATE_LIMIT_REQUIRE_UPSTASH=true",
    parsed.get("GUIDANCE_MEMORY_REQUIRE_PINECONE") === "true" ? "" : "GUIDANCE_MEMORY_REQUIRE_PINECONE=true",
    parsed.get("RAZORPAY_WEBHOOK_READY") === "false" ? "" : "RAZORPAY_WEBHOOK_READY=false",
    parsed.get("CLOUDFLARE_DNS_READY") === "false" ? "" : "CLOUDFLARE_DNS_READY=false"
  ].filter(Boolean);

  pushCheck("Production env template uses production-safe fallback and launch-gate defaults", [
    missingFallbacks.length === 0,
    mismatchedLaunchGates.length === 0
  ].every(Boolean), [...missingFallbacks, ...mismatchedLaunchGates]);
}

function checkOutFileMode() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "soulguru-env-template-"));
  const outPath = path.join(dir, "env.production.template");
  const outResult = spawnSync(process.execPath, ["scripts/generate-production-env-template.mjs", `--out=${outPath}`], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  const written = safeRead(outPath);

  pushCheck("Production env template supports --out file writing", [
    outResult.status === 0,
    outResult.stdout.includes("Production env template written"),
    written === output
  ].every(Boolean), outResult.stderr ? [outResult.stderr.trim()] : []);
}

function checkDoesNotExposeRuntimeSecretValues() {
  const sentinelEnv = {
    ...process.env,
    OPENAI_API_KEY: "openai-env-template-sentinel",
    SUPABASE_SERVICE_ROLE_KEY: "supabase-env-template-sentinel",
    RAZORPAY_KEY_SECRET: "razorpay-env-template-sentinel",
    RAZORPAY_WEBHOOK_SECRET: "razorpay-webhook-env-template-sentinel",
    RESEND_API_KEY: "resend-env-template-sentinel",
    CLERK_SECRET_KEY: "clerk-env-template-sentinel",
    UPSTASH_REDIS_REST_TOKEN: "upstash-env-template-sentinel",
    PINECONE_API_KEY: "pinecone-env-template-sentinel",
    OTP_HASH_SECRET: "otp-env-template-sentinel-with-at-least-32-characters"
  };
  const sentinelResult = spawnSync(process.execPath, ["scripts/generate-production-env-template.mjs"], {
    cwd: process.cwd(),
    env: sentinelEnv,
    encoding: "utf8"
  });
  const sentinelOutput = sentinelResult.stdout || "";
  const leaked = Object.values(sentinelEnv)
    .filter((value) => /env-template-sentinel/.test(value))
    .filter((value) => sentinelOutput.includes(value));

  pushCheck("Production env template never prints live secret values", [
    sentinelResult.status === 0,
    leaked.length === 0
  ].every(Boolean), leaked);
}

function parseEnv(text) {
  return new Map(String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const [key, ...valueParts] = line.split("=");
      return [key.trim(), valueParts.join("=").trim()];
    })
    .filter(([key]) => /^[A-Z0-9_]+$/.test(key)));
}

function envLineKeys(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z0-9_]+)=/)?.[1])
    .filter(Boolean);
}

function safeRead(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function pushCheck(label, passed, details = []) {
  checks.push({ label, passed, details });
}

function printReport() {
  console.log(`Production env template contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
    for (const detail of check.details || []) {
      console.log(`  - ${detail}`);
    }
  }
}
