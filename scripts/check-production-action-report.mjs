import { spawnSync } from "node:child_process";

const checks = [];
const sentinelEnv = {
  ...process.env,
  SOURCE_DATE_EPOCH: "1780000000",
  OPENAI_API_KEY: "openai-action-report-sentinel",
  SUPABASE_SERVICE_ROLE_KEY: "supabase-action-report-sentinel",
  RAZORPAY_KEY_SECRET: "razorpay-action-report-sentinel",
  RAZORPAY_WEBHOOK_SECRET: "razorpay-webhook-action-report-sentinel",
  RESEND_API_KEY: "resend-action-report-sentinel",
  CLERK_SECRET_KEY: "clerk-action-report-sentinel",
  UPSTASH_REDIS_REST_TOKEN: "upstash-action-report-sentinel",
  PINECONE_API_KEY: "pinecone-action-report-sentinel",
  OTP_HASH_SECRET: "otp-action-report-sentinel-with-at-least-32-characters"
};

const markdownResult = spawnSync(process.execPath, ["scripts/generate-production-action-report.mjs"], {
  cwd: process.cwd(),
  env: sentinelEnv,
  encoding: "utf8"
});
const jsonResult = spawnSync(process.execPath, ["scripts/generate-production-action-report.mjs", "--json"], {
  cwd: process.cwd(),
  env: sentinelEnv,
  encoding: "utf8"
});
const markdown = markdownResult.stdout || "";
const json = parseJson(jsonResult.stdout || "");

checkGeneratorRuns();
checkReportContent();
checkJsonContract();
checkSecretSafety();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkGeneratorRuns() {
  pushCheck("Production action report generator runs in markdown and JSON modes", [
    markdownResult.status === 0,
    jsonResult.status === 0,
    !markdownResult.stderr.trim(),
    !jsonResult.stderr.trim()
  ].every(Boolean), [markdownResult.stderr, jsonResult.stderr].filter(Boolean));
}

function checkReportContent() {
  pushCheck("Production action report lists launch actions and verification commands", [
    markdown.includes("# SoulGuru Current Readiness Action Report"),
    markdown.includes("Immediate Critical Actions"),
    markdown.includes("Warning Actions"),
    markdown.includes("Provider Setup Table"),
    markdown.includes("Cost Assumption"),
    markdown.includes("Approx INR 800/year"),
    markdown.includes("2.5% per transaction"),
    markdown.includes("Final Launch Verification"),
    markdown.includes("Supabase"),
    markdown.includes("Razorpay"),
    markdown.includes("Clerk"),
    markdown.includes("npm run production:check -- --strict"),
    markdown.includes("npm run release:check -- --url=https://your-production-domain.app --include-ai --include-android-signing")
  ].every(Boolean));
}

function checkJsonContract() {
  pushCheck("Production action report JSON is structured for automation", [
    json?.title === "SoulGuru Current Readiness Action Report",
    json?.generatedAt === "2026-05-28T20:26:40.000Z",
    typeof json?.status === "string",
    Array.isArray(json?.criticalActions),
    Array.isArray(json?.warningActions),
    Array.isArray(json?.providers),
    json.providers.some((provider) => provider.id === "supabase" && /free/i.test(provider.planningImageCost || "")),
    json.providers.some((provider) => provider.id === "razorpay" && /2\.5%/.test(provider.planningImageCost || "")),
    json.finalVerification.includes("npm run android:apk:backend")
  ].every(Boolean));
}

function checkSecretSafety() {
  const combined = `${markdown}\n${jsonResult.stdout || ""}`;
  const leaked = Object.values(sentinelEnv)
    .filter((value) => /action-report-sentinel/.test(value))
    .filter((value) => combined.includes(value));

  pushCheck("Production action report never prints live secret values", leaked.length === 0, leaked);
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function pushCheck(label, passed, details = []) {
  checks.push({ label, passed, details });
}

function printReport() {
  console.log(`Production action report contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
    for (const detail of check.details || []) {
      console.log(`  - ${String(detail).trim()}`);
    }
  }
}
