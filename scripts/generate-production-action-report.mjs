import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "vite";
import { buildDeploymentReadiness } from "../src/backend/readinessService.js";

const args = new Set(process.argv.slice(2));
const outPath = getArgValue("--out");
const mode = getArgValue("--mode") || process.env.NODE_ENV || "production";
const outputJson = args.has("--json");
const env = {
  ...loadEnv(mode, process.cwd(), ""),
  ...process.env
};

const generatedAt = buildGeneratedAt();
const readiness = buildDeploymentReadiness(env);
const report = buildActionReport(readiness, generatedAt);
const output = outputJson
  ? `${JSON.stringify(report, null, 2)}\n`
  : renderMarkdown(report);

if (outPath) {
  const absolutePath = path.resolve(process.cwd(), outPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, output);
  console.log(`Production action report written to ${absolutePath}`);
} else {
  process.stdout.write(output);
}

function buildActionReport(readiness, timestamp) {
  const checks = readiness.checks || [];
  const providers = readiness.providers || [];
  const criticalActions = checks
    .filter((check) => check.status === "fail" && check.severity === "critical")
    .map(sanitizeCheck);
  const warningActions = checks
    .filter((check) => check.status === "warn" || (check.severity === "warning" && check.status === "fail"))
    .map(sanitizeCheck);

  return {
    title: "SoulGuru Current Readiness Action Report",
    generatedAt: timestamp,
    status: readiness.status,
    summary: readiness.summary,
    providerSummary: readiness.providerSummary,
    criticalActions,
    warningActions,
    providers: providers.map(sanitizeProvider),
    finalVerification: [
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
    "# SoulGuru Current Readiness Action Report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "This report is generated from the current environment and is secret-safe. It prints provider names, cost assumptions, statuses, missing env names, evidence files, and verification commands only.",
    "",
    "## Summary",
    "",
    `- Overall status: ${report.status}`,
    `- Readiness checks: ${report.summary.passing}/${report.summary.total} passing, ${report.summary.warnings} warnings`,
    `- Providers: ${report.providerSummary.ready}/${report.providerSummary.total} ready, ${report.providerSummary.needsConfiguration} need configuration, ${report.providerSummary.unmapped} unmapped`,
    "",
    "## Immediate Critical Actions",
    "",
    ...(report.criticalActions.length
      ? report.criticalActions.map((check, index) => `${index + 1}. ${check.label}: ${formatMissing(check.missingEnv)}. ${check.advice || ""}`.trim())
      : ["All critical readiness checks are passing."]),
    "",
    "## Warning Actions",
    "",
    ...(report.warningActions.length
      ? report.warningActions.map((check, index) => `${index + 1}. ${check.label}: ${formatMissing(check.missingEnv)}. ${check.advice || ""}`.trim())
      : ["No warning-level readiness actions are currently open."]),
    "",
    "## Provider Setup Table",
    "",
    "| Provider | Cost Assumption | Status | Missing / Evidence | Verify |",
    "| --- | --- | --- | --- | --- |",
    ...report.providers.map((provider) => {
      const evidence = provider.missingEnv.length
        ? formatMissing(provider.missingEnv)
        : provider.missingCheckIds.length
          ? `Unmapped checks: ${provider.missingCheckIds.map((id) => `\`${id}\``).join(", ")}`
          : provider.artifacts.map((artifact) => `\`${artifact}\``).join(", ");
      const commands = provider.commands.map((command) => `\`${command}\``).join("<br>");
      return `| ${provider.name} | ${formatTableText(provider.planningImageCost || "not specified")} | ${provider.status} | ${evidence} | ${commands} |`;
    }),
    "",
    "## Final Launch Verification",
    "",
    "Run these after the provider setup table shows ready:",
    "",
    "```sh",
    ...report.finalVerification,
    "```",
    ""
  ].join("\n");
}

function sanitizeCheck(check) {
  return {
    id: check.id,
    label: check.label,
    severity: check.severity,
    status: check.status,
    missingEnv: [...(check.missingEnv || [])],
    advice: check.advice || ""
  };
}

function sanitizeProvider(provider) {
  return {
    id: provider.id,
    name: provider.name,
    planningImageLabel: provider.planningImageLabel,
    planningImageCost: provider.planningImageCost || "",
    purpose: provider.purpose,
    status: provider.status,
    missingEnv: [...(provider.missingEnv || [])],
    missingCheckIds: [...(provider.missingCheckIds || [])],
    artifacts: [...(provider.artifacts || [])],
    commands: [...(provider.commands || [])],
    notes: provider.notes || ""
  };
}

function formatMissing(items = []) {
  return items.length ? items.map((item) => `\`${item}\``).join(", ") : "none";
}

function formatTableText(value) {
  return String(value || "").replace(/\|/g, "\\|");
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
