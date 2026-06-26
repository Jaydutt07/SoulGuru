import { spawnSync } from "node:child_process";

const checks = [];
const sentinelEnv = {
  ...process.env,
  SOURCE_DATE_EPOCH: "1780000000",
  OPENAI_API_KEY: "openai-completion-audit-sentinel",
  SUPABASE_SERVICE_ROLE_KEY: "supabase-completion-audit-sentinel",
  RAZORPAY_KEY_SECRET: "razorpay-completion-audit-sentinel",
  RAZORPAY_WEBHOOK_SECRET: "razorpay-webhook-completion-audit-sentinel",
  RESEND_API_KEY: "resend-completion-audit-sentinel",
  CLERK_SECRET_KEY: "clerk-completion-audit-sentinel",
  UPSTASH_REDIS_REST_TOKEN: "upstash-completion-audit-sentinel",
  PINECONE_API_KEY: "pinecone-completion-audit-sentinel",
  OTP_HASH_SECRET: "otp-completion-audit-sentinel-with-at-least-32-characters"
};

const markdownResult = spawnSync(process.execPath, ["scripts/generate-production-completion-audit.mjs"], {
  cwd: process.cwd(),
  env: sentinelEnv,
  encoding: "utf8"
});
const jsonResult = spawnSync(process.execPath, ["scripts/generate-production-completion-audit.mjs", "--json"], {
  cwd: process.cwd(),
  env: sentinelEnv,
  encoding: "utf8"
});
const markdown = markdownResult.stdout || "";
const json = parseJson(jsonResult.stdout || "");

checkGeneratorRuns();
checkRequirementCoverage();
checkJsonContract();
checkSecretSafety();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkGeneratorRuns() {
  pushCheck("Production completion audit generator runs in markdown and JSON modes", [
    markdownResult.status === 0,
    jsonResult.status === 0,
    !markdownResult.stderr.trim(),
    !jsonResult.stderr.trim()
  ].every(Boolean), [markdownResult.stderr, jsonResult.stderr].filter(Boolean));
}

function checkRequirementCoverage() {
  const expectedFragments = [
    "Calm splash",
    "OpenAI key stays backend-only",
    "Cache one daily Soul Guru reading",
    "proper chart/transit calculations",
    "Astro Solves",
    "Paid More Guidance page",
    "Shani tab",
    "Numbers and Harmony",
    "Planning-image provider stack",
    "No OpenAI key",
    "GitHub repo",
    "local mobile app artifact",
    "Full production launch readiness",
    "Final Completion Criteria"
  ];
  const missing = expectedFragments.filter((fragment) => !markdown.includes(fragment));

  pushCheck("Production completion audit covers the original objective and final gates", missing.length === 0, missing);
}

function checkJsonContract() {
  const requirementIds = new Set((json?.requirements || []).map((item) => item.id));
  const requiredIds = [
    "appSurface",
    "serverOpenAi",
    "dailySoulGuruCache",
    "astrologyEngine",
    "moreGuidance",
    "providerStack",
    "github",
    "mobile",
    "finalProduction"
  ];
  const missingIds = requiredIds.filter((id) => !requirementIds.has(id));

  pushCheck("Production completion audit JSON is structured for automation", [
    json?.title === "SoulGuru Production Completion Audit",
    json?.generatedAt === "2026-05-28T20:26:40.000Z",
    typeof json?.status === "string",
    Array.isArray(json?.requirements),
    missingIds.length === 0,
    json.finalCompletionCriteria.includes("npm run production:check -- --strict"),
    json.finalCompletionCriteria.includes("npm run android:apk:backend")
  ].every(Boolean), missingIds);
}

function checkSecretSafety() {
  const combined = `${markdown}\n${jsonResult.stdout || ""}`;
  const leaked = Object.values(sentinelEnv)
    .filter((value) => /completion-audit-sentinel/.test(value))
    .filter((value) => combined.includes(value));

  pushCheck("Production completion audit never prints live secret values", leaked.length === 0, leaked);
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
  console.log(`Production completion audit contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
    for (const detail of check.details || []) {
      console.log(`  - ${String(detail).trim()}`);
    }
  }
}
