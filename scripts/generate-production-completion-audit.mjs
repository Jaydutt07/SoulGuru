import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadEnv } from "vite";
import { buildDeploymentReadiness } from "../src/backend/readinessService.js";

const args = new Set(process.argv.slice(2));
const mode = getArgValue("--mode") || process.env.NODE_ENV || "production";
const outPath = getArgValue("--out");
const outputJson = args.has("--json");
const env = {
  ...loadEnv(mode, process.cwd(), ""),
  ...process.env
};

const generatedAt = buildGeneratedAt();
const readiness = buildDeploymentReadiness(env);
const checksById = new Map(readiness.checks.map((check) => [check.id, check]));
const apkPath = path.join(process.cwd(), "SoulGuru-debug.apk");
const report = buildReport();
const output = outputJson ? `${JSON.stringify(report, null, 2)}\n` : renderMarkdown(report);

if (outPath) {
  const absolutePath = path.resolve(process.cwd(), outPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, output);
  console.log(`Production completion audit written to ${absolutePath}`);
} else {
  process.stdout.write(output);
}

function buildReport() {
  const requirements = [
    requirement("appSurface", "Calm splash, OTP login/create-account flow, five product tabs, settings, and mobile-friendly app shell", {
      status: "implemented_local",
      evidence: [
        "`npm run client:surface:check`",
        "`docs/runtime-ui-qa-report.md`"
      ],
      remaining: ["Run runtime QA again after production provider values and domain are configured."]
    }),
    requirement("serverOpenAi", "OpenAI key stays backend-only for mobile/API readings", {
      status: checkStatus("openai", "complete", "needs_provider_configuration"),
      evidence: ["`npm run openai:check`", "`npm run public-env:check:strict`"],
      remaining: missingFor("openai")
    }),
    requirement("dailySoulGuruCache", "Cache one daily Soul Guru reading per user", {
      status: combinedStatus(["soulWisdomCache", "supabase"]),
      evidence: ["`npm run soul:cache:check`", "`npm run supabase:schema:check`"],
      remaining: missingFor("supabase")
    }),
    requirement("soulWisdomFeedback", "Capture Soul Guru reading feedback for prompt tuning without storing raw PII or raw reading text", {
      status: combinedStatus(["supabase"]),
      evidence: ["`npm run soul:feedback:check`", "`npm run local:smoke`", "`npm run supabase:migrations:check`"],
      remaining: missingFor("supabase")
    }),
    requirement("astrologyEngine", "Replace estimated astrology with proper chart/transit calculations", {
      status: checkStatus("birthPlaceAccuracy", "complete", "implemented_local_provider_warning"),
      evidence: ["`npm run astrology:check`", "`npm run place:geocoder:smoke -- --place=\"Paris, France\"`"],
      remaining: missingFor("birthPlaceAccuracy")
    }),
    requirement("astroSolves", "Astro Solves gives 3 persisted free questions with detailed root-cause and solution answers", {
      status: combinedStatus(["astroSolvesQuota", "supabase"]),
      evidence: ["`npm run astro:check`", "`npm run astro:quality`", "`npm run astro:quality:extended`", "`npm run astro:quality:ai`"],
      remaining: missingFor("supabase")
    }),
    requirement("moreGuidance", "Paid More Guidance page has deeper reading, history, saved advice, and 3-month tracking", {
      status: combinedStatus(["moreGuidanceAccess", "supabase", "razorpay"]),
      evidence: ["`npm run more-guidance:check`", "`npm run more-guidance:quality`", "`npm run more-guidance:quality:ai`"],
      remaining: missingFor("supabase", "razorpay")
    }),
    requirement("shani", "Shani tab has Saade Sati timeline, paid remedy memberships, and member-gated Pandit guidance", {
      status: combinedStatus(["shaniMembershipAccess", "razorpay"]),
      evidence: ["`npm run shani:check`", "`npm run shani:quality`", "`npm run shani:quality:ai`"],
      remaining: missingFor("shaniMembershipAccess", "razorpay")
    }),
    requirement("numbersHarmony", "Numbers and Harmony tabs provide numerology and compatibility surfaces", {
      status: "implemented_local",
      evidence: ["`npm run numbers:check`", "`npm run compatibility:check`", "`docs/runtime-ui-qa-report.md`"],
      remaining: ["Run runtime QA again after production provider values and domain are configured."]
    }),
    requirement("providerStack", "Planning-image provider stack is mapped to production readiness", {
      status: readiness.providerSummary.needsConfiguration === 0 ? "complete" : "needs_provider_configuration",
      evidence: ["`npm run production:providers`", "`npm run production:actions`", "`npm run providers:check`"],
      remaining: readiness.providers
        .filter((provider) => provider.status !== "ready")
        .map((provider) => `${provider.name}: ${formatMissing(provider.missingEnv)}`)
    }),
    requirement("security", "No OpenAI key or server secret is pushed to GitHub/browser/APK", {
      status: gitignoreContainsEnv() ? "implemented_local" : "incomplete",
      evidence: ["`npm run security:check`", "`npm run public-env:check:strict`", "`.gitignore` contains `.env`"],
      remaining: gitignoreContainsEnv() ? ["Run strict release scans before every production deploy."] : ["Add `.env` to `.gitignore`."]
    }),
    requirement("github", "Push code and SoulGuru details to the GitHub repo", {
      status: workflowActivationPending() ? "pushed_except_workflow_activation" : "complete",
      evidence: ["`git log --oneline origin/main -5`", "`docs/github-actions-ci.yml`", "`npm run ci:install-workflow`", "`npm run ci:check`"],
      remaining: workflowActivationPending()
        ? ["Run `npm run ci:install-workflow` and push `.github/workflows/ci.yml` after GitHub credentials include `workflow` scope or SSH workflow-write permission."]
        : []
    }),
    requirement("mobile", "Create a local mobile app artifact for phone testing", {
      status: fs.existsSync(apkPath) ? "complete_local" : "missing_artifact",
      evidence: ["`npm run android:apk:local`", "`npm run android:artifact:check`", apkEvidence()],
      remaining: checkStatus("domainDns", "none", "Build production APK only after `VITE_API_BASE_URL` points at the production HTTPS domain.")
    }),
    requirement("finalProduction", "Full production launch readiness", {
      status: readiness.status === "ready" ? "complete" : "needs_provider_configuration",
      evidence: [
        "`npm run production:check -- --strict`",
        "`npm run production:domain:smoke -- --expect-ready`",
        "`npm run deployment:smoke -- --url=https://your-production-domain.app --expect-ready`",
        "`npm run release:check -- --url=https://your-production-domain.app --include-ai --include-android-signing`"
      ],
      remaining: readiness.checks
        .filter((check) => check.status !== "pass")
        .map((check) => `${check.label}: ${formatMissing(check.missingEnv)}`)
    })
  ];

  return {
    title: "SoulGuru Production Completion Audit",
    generatedAt,
    status: readiness.status === "ready" ? "complete" : "needs_configuration",
    readiness: {
      status: readiness.status,
      summary: readiness.summary,
      providerSummary: readiness.providerSummary
    },
    requirements,
    finalCompletionCriteria: [
      "npm run production:check -- --strict",
      "npm run production:domain:smoke -- --expect-ready",
      "npm run deployment:smoke -- --url=https://your-production-domain.app --expect-ready",
      "npm run release:check -- --url=https://your-production-domain.app --include-ai --include-android-signing",
      "npm run android:apk:backend",
      "npm run android:artifact:check -- --expect-url=https://your-production-domain.app"
    ]
  };
}

function renderMarkdown(report) {
  return [
    "# SoulGuru Production Completion Audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "This audit maps the original app objective to current evidence. It is secret-safe: it prints statuses, missing env names, evidence commands, and artifact paths only.",
    "",
    "## Summary",
    "",
    `- Overall status: ${report.status}`,
    `- Production readiness: ${report.readiness.summary.passing}/${report.readiness.summary.total} checks passing, ${report.readiness.summary.warnings} warnings`,
    `- Providers: ${report.readiness.providerSummary.ready}/${report.readiness.providerSummary.total} ready, ${report.readiness.providerSummary.needsConfiguration} need configuration`,
    "",
    "## Requirement Audit",
    "",
    "| Requirement | Status | Evidence | Remaining |",
    "| --- | --- | --- | --- |",
    ...report.requirements.map((item) => `| ${item.label} | \`${item.status}\` | ${item.evidence.join("<br>")} | ${formatRemaining(item.remaining)} |`),
    "",
    "## Final Completion Criteria",
    "",
    "The goal should be marked complete only after all of these pass with production provider values:",
    "",
    "```sh",
    ...report.finalCompletionCriteria,
    "```",
    ""
  ].join("\n");
}

function requirement(id, label, details) {
  return {
    id,
    label,
    status: details.status,
    evidence: details.evidence,
    remaining: normalizeRemaining(details.remaining)
  };
}

function checkStatus(id, passStatus, failStatus) {
  return checksById.get(id)?.status === "pass" ? passStatus : failStatus;
}

function combinedStatus(ids) {
  const failed = ids
    .map((id) => checksById.get(id))
    .filter((check) => check?.status !== "pass");
  return failed.length ? "implemented_local_provider_pending" : "complete";
}

function missingFor(...ids) {
  return ids
    .flatMap((id) => checksById.get(id)?.missingEnv || [])
    .filter(Boolean);
}

function workflowActivationPending() {
  const templatePath = path.join(process.cwd(), "docs", "github-actions-ci.yml");
  const activePath = path.join(process.cwd(), ".github", "workflows", "ci.yml");
  const template = readText(templatePath);
  const active = readText(activePath);
  if (!template) return true;
  if (!active) return true;
  if (normalizeWorkflow(active) !== normalizeWorkflow(template)) return true;
  return git(["rev-parse", "--abbrev-ref", "HEAD"]) !== "main";
}

function gitignoreContainsEnv() {
  try {
    return fs.readFileSync(path.join(process.cwd(), ".gitignore"), "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .includes(".env");
  } catch {
    return false;
  }
}

function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function normalizeWorkflow(text) {
  return String(text || "").trim().replace(/\r\n/g, "\n");
}

function apkEvidence() {
  if (!fs.existsSync(apkPath)) return "`SoulGuru-debug.apk` not found";
  const stats = fs.statSync(apkPath);
  const hash = crypto.createHash("sha256").update(fs.readFileSync(apkPath)).digest("hex");
  return `\`${apkPath}\` (${formatApkSize(stats.size)}, SHA-256 \`${hash}\`)`;
}

function formatApkSize(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function normalizeRemaining(remaining) {
  if (Array.isArray(remaining)) return remaining.filter(Boolean);
  if (!remaining || remaining === "none") return [];
  return [remaining];
}

function formatRemaining(items = []) {
  return items.length ? items.map(formatTableText).join("<br>") : "none";
}

function formatMissing(items = []) {
  return items.length ? items.join(", ") : "none";
}

function formatTableText(value) {
  return String(value || "").replace(/\|/g, "\\|");
}

function git(args) {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

function buildGeneratedAt() {
  if (process.env.SOURCE_DATE_EPOCH) {
    return new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString();
  }
  return new Date().toISOString();
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}
