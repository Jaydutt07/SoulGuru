import { spawnSync } from "node:child_process";
import {
  PROVIDER_STACK,
  REQUIRED_PROVIDER_IDS
} from "../src/backend/providerStack.js";
import {
  PUBLIC_ENV_ALLOWLIST,
  SERVER_ONLY_ENV_KEYS
} from "../src/backend/envManifest.js";

const checks = [];

const result = spawnSync(process.execPath, ["scripts/generate-provider-launch-plan.mjs"], {
  cwd: process.cwd(),
  encoding: "utf8"
});
const output = result.stdout || "";
const stderr = result.stderr || "";

const jsonResult = spawnSync(process.execPath, ["scripts/generate-provider-launch-plan.mjs", "--json"], {
  cwd: process.cwd(),
  encoding: "utf8"
});
const jsonOutput = jsonResult.stdout || "";
const plan = parseJson(jsonOutput);

checkGeneratorRuns();
checkLaunchPlanCoversEveryProviderExactlyOnce();
checkLaunchPlanKeepsStackOrderPhases();
checkLaunchPlanCarriesPlanningImageCosts();
checkEnvVisibilityLabels();
checkProviderCommandsAndArtifactsArePresent();
checkFinalVerificationCommands();
checkDoesNotExposeRuntimeSecretValues();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkGeneratorRuns() {
  pushCheck("Provider launch plan generator runs in markdown and JSON modes", [
    result.status === 0,
    jsonResult.status === 0,
    output.includes("# SoulGuru Production Provider Launch Plan"),
    output.includes("placeholder-only"),
    plan?.title === "SoulGuru Production Provider Launch Plan",
    !stderr.trim()
  ].every(Boolean), stderr ? [stderr.trim()] : []);
}

function checkLaunchPlanCoversEveryProviderExactlyOnce() {
  const providerIds = plan?.phases?.flatMap((phase) => phase.providers.map((provider) => provider.id)) || [];
  const uniqueProviderIds = new Set(providerIds);
  const missing = REQUIRED_PROVIDER_IDS.filter((id) => !uniqueProviderIds.has(id));
  const unknown = providerIds.filter((id) => !REQUIRED_PROVIDER_IDS.includes(id));
  const duplicates = providerIds.filter((id, index, ids) => ids.indexOf(id) !== index);

  pushCheck("Provider launch plan covers every planned provider exactly once", [
    providerIds.length === REQUIRED_PROVIDER_IDS.length,
    uniqueProviderIds.size === REQUIRED_PROVIDER_IDS.length,
    missing.length === 0,
    unknown.length === 0,
    duplicates.length === 0
  ].every(Boolean), [...missing, ...unknown, ...duplicates]);
}

function checkLaunchPlanKeepsStackOrderPhases() {
  const phaseTitles = plan?.phases?.map((phase) => phase.title) || [];
  const expectedTitles = [
    "Source, AI, And CI Baseline",
    "Data, Auth, OTP, And Email",
    "Deployment, Domain, And DNS",
    "Payments And Paid Access",
    "Reliability, Analytics, And Memory"
  ];

  pushCheck("Provider launch plan groups setup into production launch phases", [
    expectedTitles.every((title) => phaseTitles.includes(title)),
    plan?.phases?.[0]?.providers?.some((provider) => provider.id === "github"),
    plan?.phases?.[1]?.providers?.some((provider) => provider.id === "supabase"),
    plan?.phases?.[1]?.providers?.some((provider) => provider.id === "msg91"),
    plan?.phases?.[2]?.providers?.some((provider) => provider.id === "vercel"),
    plan?.phases?.[3]?.providers?.some((provider) => provider.id === "razorpay"),
    plan?.phases?.[4]?.providers?.some((provider) => provider.id === "pinecone")
  ].every(Boolean));
}

function checkLaunchPlanCarriesPlanningImageCosts() {
  const providerCosts = plan?.phases?.flatMap((phase) =>
    phase.providers.map((provider) => `${provider.id}:${provider.planningImageCost || ""}`)
  ) || [];

  pushCheck("Provider launch plan preserves planning-image cost context", [
    output.includes("Planning image cost"),
    providerCosts.every((entry) => entry.split(":").slice(1).join(":").trim()),
    providerCosts.some((entry) => /namecheap/i.test(entry) && /INR 800\/year/i.test(entry)),
    providerCosts.some((entry) => /razorpay/i.test(entry) && /2\.5%/.test(entry)),
    providerCosts.some((entry) => /supabase/i.test(entry) && /free/i.test(entry)),
    providerCosts.some((entry) => /pinecone/i.test(entry) && /free/i.test(entry))
  ].every(Boolean));
}

function checkEnvVisibilityLabels() {
  const envEntries = plan?.phases?.flatMap((phase) =>
    phase.providers.flatMap((provider) => provider.envScope || [])
  ) || [];
  const entryByName = new Map(envEntries.map((entry) => [entry.name, entry]));
  const missingServerSecretLabels = SERVER_ONLY_ENV_KEYS
    .filter((name) => entryByName.has(name))
    .filter((name) => entryByName.get(name).visibility !== "server-only secret");
  const missingPublicLabels = PUBLIC_ENV_ALLOWLIST
    .filter((name) => entryByName.has(name))
    .filter((name) => entryByName.get(name).visibility !== "public Vite env");

  pushCheck("Provider launch plan labels public env and server-only secrets", [
    missingServerSecretLabels.length === 0,
    missingPublicLabels.length === 0,
    output.includes("server-only secret"),
    output.includes("public Vite env")
  ].every(Boolean), [...missingServerSecretLabels, ...missingPublicLabels]);
}

function checkProviderCommandsAndArtifactsArePresent() {
  const missing = PROVIDER_STACK.flatMap((provider) => [
    ...provider.commands
      .filter((command) => !output.includes(`\`${command}\``))
      .map((command) => `${provider.id}:command:${command}`),
    ...provider.artifacts
      .filter((artifact) => !output.includes(`\`${artifact}\``))
      .map((artifact) => `${provider.id}:artifact:${artifact}`)
  ]);

  pushCheck("Provider launch plan includes provider evidence artifacts and verification commands", missing.length === 0, missing);
}

function checkFinalVerificationCommands() {
  const expectedCommands = [
    "npm run providers:check",
    "npm run production:providers",
    "npm run production:check -- --strict",
    "npm run production:domain:smoke -- --expect-ready",
    "npm run release:check -- --url=https://your-production-domain.app --include-ai --include-android-signing",
    "npm run android:apk:backend",
    "npm run android:artifact:check -- --expect-url=https://your-production-domain.app"
  ];
  const missing = expectedCommands.filter((command) => !output.includes(`\`${command}\``));

  pushCheck("Provider launch plan includes final release verification commands", missing.length === 0, missing);
}

function checkDoesNotExposeRuntimeSecretValues() {
  const sentinelEnv = {
    ...process.env,
    OPENAI_API_KEY: "openai-launch-plan-sentinel",
    MSG91_AUTH_KEY: "msg91-launch-plan-sentinel",
    SUPABASE_SERVICE_ROLE_KEY: "supabase-launch-plan-sentinel",
    RAZORPAY_KEY_SECRET: "razorpay-launch-plan-sentinel",
    RAZORPAY_WEBHOOK_SECRET: "razorpay-webhook-launch-plan-sentinel",
    RESEND_API_KEY: "resend-launch-plan-sentinel",
    CLERK_SECRET_KEY: "clerk-launch-plan-sentinel",
    UPSTASH_REDIS_REST_TOKEN: "upstash-launch-plan-sentinel",
    PINECONE_API_KEY: "pinecone-launch-plan-sentinel"
  };
  const sentinelResult = spawnSync(process.execPath, ["scripts/generate-provider-launch-plan.mjs"], {
    cwd: process.cwd(),
    env: sentinelEnv,
    encoding: "utf8"
  });
  const sentinelOutput = sentinelResult.stdout || "";
  const leaked = Object.values(sentinelEnv)
    .filter((value) => /launch-plan-sentinel/.test(value))
    .filter((value) => sentinelOutput.includes(value));

  pushCheck("Provider launch plan never prints live secret values", [
    sentinelResult.status === 0,
    leaked.length === 0
  ].every(Boolean), leaked);
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
  console.log(`Provider launch plan contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
    for (const detail of check.details || []) {
      console.log(`  - ${detail}`);
    }
  }
}
