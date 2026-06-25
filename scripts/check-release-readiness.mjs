import { spawnSync } from "node:child_process";
import { loadEnv } from "vite";

const args = new Set(process.argv.slice(2));
const allowMissingExternal = args.has("--allow-missing-external");
const includeAi = args.has("--include-ai");
const includeAndroidSigning = args.has("--include-android-signing");
const deploymentUrl = getArgValue("--url") || "";
const mode = getArgValue("--mode") || process.env.NODE_ENV || "production";
const env = {
  ...loadEnv(mode, process.cwd(), ""),
  ...process.env
};

const failures = [];
const skipped = [];

await runStep("Public env safety", "node", ["scripts/check-public-env.mjs", "--strict"]);
await runStep("CI workflow contract", "npm", ["run", "ci:check"]);
await runStep("Environment manifest contract", "npm", ["run", "env:check"]);
await runStep("Deployment config contract", "npm", ["run", "deployment:check"]);
await runStep("Astrology engine contract", "npm", ["run", "astrology:check"]);
await runStep("Harmony compatibility contract", "npm", ["run", "compatibility:check"]);
await runStep("Numbers tab contract", "npm", ["run", "numbers:check"]);
await runStep("Auth contract checks", "npm", ["run", "auth:check"]);
await runStep("User profile contract checks", "npm", ["run", "profile:check"]);
await runStep("Guidance memory contract checks", "npm", ["run", "memory:check"]);
await runStep("Rate limit contract checks", "npm", ["run", "rate-limit:check"]);
await runStep("Request handling contract checks", "npm", ["run", "request:check"]);
await runStep("Production readiness contract checks", "npm", ["run", "readiness:check"]);
await runStep("Observability contract checks", "npm", ["run", "observability:check"]);
await runStep("OpenAI backend contract checks", "npm", ["run", "openai:check"]);
await runStep("Backend fetch timeout contract checks", "npm", ["run", "backend-fetch:check"]);
await runStep("Email contract checks", "npm", ["run", "email:check"]);
await runStep("Supabase migration contract", "npm", ["run", "supabase:migrations:check"]);
await runStep("Soul Guru daily cache contract", "npm", ["run", "soul:cache:check"]);
await runStep("Soul Guru local reading quality", "npm", ["run", "soul:quality"]);
await runStep("Soul Guru extended local reading diversity", "npm", ["run", "soul:quality:extended"]);
await runStep("Astro Solves contract checks", "npm", ["run", "astro:check"]);
await runStep("Astro Solves answer quality", "npm", ["run", "astro:quality"]);
await runStep("OTP contract checks", "npm", ["run", "otp:check"]);

if (includeAi) {
  if (hasEnv("OPENAI_API_KEY")) {
    await runStep("Soul Guru live OpenAI reading quality", "npm", ["run", "soul:quality:ai"]);
    await runStep("Astro Solves live OpenAI answer quality", "npm", ["run", "astro:quality:ai"]);
    await runStep("Shani Pandit live OpenAI answer quality", "npm", ["run", "shani:quality:ai"]);
  } else if (allowMissingExternal) {
    skipStep("Soul Guru live OpenAI reading quality", "OPENAI_API_KEY is not configured.");
    skipStep("Astro Solves live OpenAI answer quality", "OPENAI_API_KEY is not configured.");
    skipStep("Shani Pandit live OpenAI answer quality", "OPENAI_API_KEY is not configured.");
  } else {
    failStep("Soul Guru live OpenAI reading quality", "OPENAI_API_KEY is required for --include-ai.");
    failStep("Astro Solves live OpenAI answer quality", "OPENAI_API_KEY is required for --include-ai.");
    failStep("Shani Pandit live OpenAI answer quality", "OPENAI_API_KEY is required for --include-ai.");
  }
}

await runStep("Web production build", "npm", ["run", "build"]);
await runStep("Release secret and artifact scan", "npm", ["run", "security:check"]);
await runStep("Payment contract checks", "npm", ["run", "payments:check"]);
await runStep("More Guidance contract checks", "npm", ["run", "more-guidance:check"]);
await runStep("More Guidance paid reading quality", "npm", ["run", "more-guidance:quality"]);
await runStep("Shani contract checks", "npm", ["run", "shani:check"]);
await runStep("Shani Pandit answer quality", "npm", ["run", "shani:quality"]);
await runStep("Mobile backend validation contract checks", "npm", ["run", "mobile:backend:check"]);
await runStep("Local API smoke", "npm", ["run", "local:smoke"]);
await runStep("Deployment smoke contract checks", "npm", ["run", "deployment:smoke:check"]);
await runStep("Production domain smoke contract checks", "npm", ["run", "production:domain:check"]);
await runStep("Dependency audit", "npm", ["audit", "--omit", "dev"]);

if (allowMissingExternal) {
  await runStep("Production readiness report", "npm", ["run", "production:check", "--", "--strict", "--allow-fail"]);
  await runStep("Supabase schema check", "npm", ["run", "supabase:schema:check", "--", "--allow-missing-env"]);
} else {
  await runStep("Production readiness report", "npm", ["run", "production:check", "--", "--strict"]);
  await runStep("Supabase schema check", "npm", ["run", "supabase:schema:check"]);
}

const smokeUrl = deploymentUrl || String(env.VITE_API_BASE_URL || env.API_BASE_URL || "").trim();
if (allowMissingExternal) {
  await runStep("Production domain smoke", "npm", ["run", "production:domain:smoke", "--", "--allow-missing-env"]);
} else {
  await runStep("Production domain smoke", "npm", ["run", "production:domain:smoke", "--", "--expect-ready"]);
}

if (smokeUrl) {
  await runStep("Deployed backend smoke", "npm", [
    "run",
    "deployment:smoke",
    "--",
    `--url=${smokeUrl}`,
    "--expect-ready"
  ]);
} else if (allowMissingExternal) {
  skipStep("Deployed backend smoke", "VITE_API_BASE_URL/API_BASE_URL or --url is not configured.");
} else {
  failStep("Deployed backend smoke", "Provide --url=https://your-production-domain.app or set VITE_API_BASE_URL.");
}

if (hasEnv("VITE_API_BASE_URL")) {
  await runStep("Mobile backend URL check", "npm", ["run", "mobile:check-backend"]);
} else if (allowMissingExternal) {
  skipStep("Mobile backend URL check", "VITE_API_BASE_URL is not configured.");
} else {
  failStep("Mobile backend URL check", "VITE_API_BASE_URL is required for release mobile builds.");
}

if (includeAndroidSigning) {
  await runStep("Android release signing check", "node", ["scripts/validate-android-release-signing.mjs"]);
}

printSummary();

if (failures.length > 0) {
  process.exit(1);
}

async function runStep(label, command, stepArgs) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, stepArgs, {
    cwd: process.cwd(),
    env,
    stdio: "inherit"
  });

  if (result.error) {
    failStep(label, result.error.message);
    return;
  }

  if (result.status !== 0) {
    failStep(label, `${command} ${stepArgs.join(" ")} exited with ${result.status}.`);
  }
}

function failStep(label, reason) {
  failures.push({ label, reason });
  console.error(`Release readiness failure: ${label}: ${reason}`);
}

function skipStep(label, reason) {
  skipped.push({ label, reason });
  console.warn(`Release readiness skipped: ${label}: ${reason}`);
}

function printSummary() {
  console.log("\nRelease readiness summary");
  console.log(`Failures: ${failures.length}`);
  console.log(`Skipped: ${skipped.length}`);

  for (const item of skipped) {
    console.log(`SKIP ${item.label}: ${item.reason}`);
  }

  for (const item of failures) {
    console.log(`FAIL ${item.label}: ${item.reason}`);
  }

  if (failures.length === 0) {
    console.log("Release readiness check passed.");
  }
}

function hasEnv(name) {
  return Boolean(String(env[name] || "").trim());
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}
