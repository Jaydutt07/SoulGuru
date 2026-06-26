import path from "node:path";
import { spawn } from "node:child_process";
import { SOUL_WISDOM_PROMPT_VERSION } from "../src/soulWisdomVersion.js";

const checks = [];

await checkAllowsMissingEnvOnlyWhenExplicit();
await checkStrictMissingEnvFails();
await checkFixtureReportSummarizesPromptTuningSignals();
await checkJsonSamplesAreRedacted();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

async function checkAllowsMissingEnvOnlyWhenExplicit() {
  const result = await runReport(["--allow-missing-env"], emptySupabaseEnv());
  pushCheck("Soul Guru feedback report skips missing Supabase only when allowed", [
    result.status === 0,
    result.stdout.includes("skipped"),
    result.stdout.includes("SUPABASE_URL"),
    result.stdout.includes("SUPABASE_SERVICE_ROLE_KEY")
  ].every(Boolean));
}

async function checkStrictMissingEnvFails() {
  const result = await runReport([], emptySupabaseEnv());
  pushCheck("Soul Guru feedback report fails missing Supabase in strict mode", [
    result.status !== 0,
    result.stderr.includes("Missing Supabase configuration"),
    result.stderr.includes("SUPABASE_URL"),
    result.stderr.includes("SUPABASE_SERVICE_ROLE_KEY")
  ].every(Boolean));
}

async function checkFixtureReportSummarizesPromptTuningSignals() {
  const result = await runReport([`--fixture-json=${JSON.stringify(feedbackFixture())}`], emptySupabaseEnv());
  pushCheck("Soul Guru feedback report summarizes prompt-version miss signals", [
    result.status === 0,
    result.stdout.includes("SoulGuru feedback report: pass"),
    result.stdout.includes("rows=5"),
    result.stdout.includes("accurate=3; missed=2; missRate=40.0%"),
    result.stdout.includes(SOUL_WISDOM_PROMPT_VERSION),
    result.stdout.includes("too generic or repeated: 1"),
    result.stdout.includes("not personally accurate: 1"),
    result.stdout.includes("Review missed readings before the next prompt version")
  ].every(Boolean));
}

async function checkJsonSamplesAreRedacted() {
  const result = await runReport([
    `--fixture-json=${JSON.stringify(feedbackFixture())}`,
    "--json",
    "--include-samples"
  ], emptySupabaseEnv());
  let parsed = null;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    parsed = null;
  }

  pushCheck("Soul Guru feedback report JSON redacts optional missed samples", [
    result.status === 0,
    parsed?.ok === true,
    parsed?.totals?.missed === 2,
    parsed?.sanitizedMissedSamples?.some((sample) => sample.includes("[redacted-email]")),
    parsed?.sanitizedMissedSamples?.some((sample) => sample.includes("[redacted-phone]")),
    !result.stdout.includes("asha@example.com"),
    !result.stdout.includes("+919000000001"),
    !result.stdout.includes("sgu_11111111111111111111111111111111"),
    !result.stdout.includes("swr_22222222222222222222222222222222")
  ].every(Boolean));
}

function feedbackFixture() {
  return [
    {
      prompt_version: SOUL_WISDOM_PROMPT_VERSION,
      rating: "accurate",
      reason: "felt accurate and specific",
      reading_date: "2026-06-26",
      created_at: "2026-06-26T00:00:00.000Z"
    },
    {
      prompt_version: SOUL_WISDOM_PROMPT_VERSION,
      rating: "accurate",
      reason: "",
      reading_date: "2026-06-26",
      created_at: "2026-06-26T00:01:00.000Z"
    },
    {
      prompt_version: SOUL_WISDOM_PROMPT_VERSION,
      rating: "accurate",
      reason: "the work cue matched",
      reading_date: "2026-06-26",
      created_at: "2026-06-26T00:02:00.000Z"
    },
    {
      prompt_version: SOUL_WISDOM_PROMPT_VERSION,
      rating: "missed",
      reason: "too generic and repeated, contact asha@example.com",
      reading_date: "2026-06-26",
      created_at: "2026-06-26T00:03:00.000Z",
      user_key: "sgu_11111111111111111111111111111111"
    },
    {
      prompt_version: SOUL_WISDOM_PROMPT_VERSION,
      rating: "missed",
      reason: "not accurate for me, call +919000000001",
      reading_date: "2026-06-26",
      created_at: "2026-06-26T00:04:00.000Z",
      reading_hash: "swr_22222222222222222222222222222222"
    }
  ];
}

function emptySupabaseEnv() {
  return {
    SUPABASE_URL: "",
    SUPABASE_SERVICE_ROLE_KEY: ""
  };
}

function runReport(args = [], env = {}) {
  const reportPath = path.join(process.cwd(), "scripts", "report-soul-wisdom-feedback.mjs");
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [reportPath, ...args], {
      cwd: process.cwd(),
      env: {
        PATH: process.env.PATH,
        NODE_ENV: "production",
        ...env
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
  console.log(`Soul Guru feedback report contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}
