import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const checks = [];
const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "soulguru-launch-pack-"));
const sentinelEnv = {
  ...process.env,
  SOURCE_DATE_EPOCH: "1780000000",
  OPENAI_API_KEY: "openai-launch-pack-sentinel",
  SUPABASE_SERVICE_ROLE_KEY: "supabase-launch-pack-sentinel",
  RAZORPAY_KEY_SECRET: "razorpay-launch-pack-sentinel",
  RAZORPAY_WEBHOOK_SECRET: "razorpay-webhook-launch-pack-sentinel",
  RESEND_API_KEY: "resend-launch-pack-sentinel",
  CLERK_SECRET_KEY: "clerk-launch-pack-sentinel",
  UPSTASH_REDIS_REST_TOKEN: "upstash-launch-pack-sentinel",
  PINECONE_API_KEY: "pinecone-launch-pack-sentinel",
  OTP_HASH_SECRET: "otp-launch-pack-sentinel-with-at-least-32-characters"
};
const result = spawnSync(process.execPath, [
  "scripts/generate-production-launch-pack.mjs",
  `--out=${outputDir}`
], {
  cwd: process.cwd(),
  env: sentinelEnv,
  encoding: "utf8"
});

const expectedFiles = [
  "README.md",
  "env.production.template",
  "production-env-checklist.md",
  "provider-launch-plan.md",
  "current-readiness-action-report.md",
  "production-completion-audit.md",
  "soulguru-supabase-schema.sql",
  "manifest.json"
];

checkGeneratorRuns();
checkExpectedFilesExist();
checkArtifactContents();
checkManifestContract();
checkSecretSafety();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkGeneratorRuns() {
  pushCheck("Production launch pack generator runs", [
    result.status === 0,
    result.stderr === "",
    result.stdout.includes("Production launch pack written:"),
    expectedFiles.every((file) => result.stdout.includes(file))
  ].every(Boolean), [result.stderr].filter(Boolean));
}

function checkExpectedFilesExist() {
  const missing = expectedFiles.filter((file) => !fs.existsSync(path.join(outputDir, file)));
  const actual = fs.readdirSync(outputDir).sort();
  const unexpected = actual.filter((file) => !expectedFiles.includes(file));

  pushCheck("Production launch pack writes the expected file set", [
    missing.length === 0,
    unexpected.length === 0
  ].every(Boolean), [...missing, ...unexpected]);
}

function checkArtifactContents() {
  const readme = readPackFile("README.md");
  const envTemplate = readPackFile("env.production.template");
  const checklist = readPackFile("production-env-checklist.md");
  const launchPlan = readPackFile("provider-launch-plan.md");
  const actionReport = readPackFile("current-readiness-action-report.md");
  const completionAudit = readPackFile("production-completion-audit.md");
  const supabaseSql = readPackFile("soulguru-supabase-schema.sql");

  pushCheck("Production launch pack includes usable operator artifacts", [
    readme.includes("# SoulGuru Production Launch Pack"),
    readme.includes("Operator Order"),
    readme.includes("npm run soul:feedback:report"),
    envTemplate.includes("# SoulGuru Production Env Template"),
    envTemplate.includes("OPENAI_API_KEY="),
    checklist.includes("# SoulGuru Production Env Checklist"),
    launchPlan.includes("# SoulGuru Production Provider Launch Plan"),
    actionReport.includes("# SoulGuru Current Readiness Action Report"),
    actionReport.includes("Immediate Critical Actions"),
    actionReport.includes("Provider Setup Table"),
    actionReport.includes("Final Launch Verification"),
    completionAudit.includes("# SoulGuru Production Completion Audit"),
    completionAudit.includes("Requirement Audit"),
    completionAudit.includes("Final Completion Criteria"),
    supabaseSql.includes("-- SoulGuru Supabase production schema bundle"),
    supabaseSql.includes("001_initial_schema.sql"),
    supabaseSql.includes("012_shani_membership.sql"),
    supabaseSql.includes("013_hashed_user_keys.sql"),
    supabaseSql.includes("014_soul_wisdom_generation_locks.sql"),
    supabaseSql.includes("016_soul_wisdom_feedback.sql")
  ].every(Boolean));
}

function checkManifestContract() {
  const manifest = parseJson(readPackFile("manifest.json"));
  const missing = expectedFiles.filter((file) => !manifest?.files?.includes(file));
  const verification = manifest?.verification || [];

  pushCheck("Production launch pack manifest lists files and verification commands", [
    manifest?.name === "SoulGuru Production Launch Pack",
    manifest?.generatedAt === "2026-05-28T20:26:40.000Z",
    missing.length === 0,
    verification.includes("npm run android:security:check"),
    verification.includes("npm run android:artifact:check"),
    verification.includes("npm run production:actions"),
    verification.includes("npm run production:audit"),
    verification.includes("npm run soul:feedback:report"),
    verification.includes("npm run production:check -- --strict"),
    verification.some((command) => command.includes("release:check"))
  ].every(Boolean), missing);
}

function checkSecretSafety() {
  const combined = expectedFiles
    .map((file) => readPackFile(file))
    .join("\n");
  const leaked = Object.values(sentinelEnv)
    .filter((value) => /launch-pack-sentinel/.test(value))
    .filter((value) => combined.includes(value));

  pushCheck("Production launch pack never prints live secret values", leaked.length === 0, leaked);
}

function readPackFile(file) {
  try {
    return fs.readFileSync(path.join(outputDir, file), "utf8");
  } catch {
    return "";
  }
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
  console.log(`Production launch pack contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
    for (const detail of check.details || []) {
      console.log(`  - ${detail}`);
    }
  }
}
