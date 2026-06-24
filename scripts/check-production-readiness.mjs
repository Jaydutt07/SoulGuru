import { loadEnv } from "vite";
import { buildDeploymentReadiness } from "../src/backend/readinessService.js";

const args = new Set(process.argv.slice(2));
const mode = getArgValue("--mode") || process.env.NODE_ENV || "production";
const env = {
  ...loadEnv(mode, process.cwd(), ""),
  ...process.env
};
const report = buildDeploymentReadiness(env);
const strict = args.has("--strict");
const allowFail = args.has("--allow-fail");
const outputJson = args.has("--json");
const hasFailures = strict
  ? report.checks.some((check) => check.status === "fail")
  : !report.ok;

if (outputJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(report, { strict });
}

if (hasFailures && !allowFail) {
  process.exit(1);
}

function printReport(readiness, { strict }) {
  console.log(`SoulGuru production readiness: ${readiness.status}`);
  console.log(`Generated: ${readiness.generatedAt}`);
  console.log(`Checks: ${readiness.summary.passing}/${readiness.summary.total} passing, ${readiness.summary.warnings} warnings`);
  if (strict) {
    console.log("Mode: strict");
  }
  console.log("");

  for (const check of readiness.checks) {
    const marker = check.status === "pass" ? "PASS" : check.severity === "critical" ? "FAIL" : "WARN";
    console.log(`${marker} ${check.label}`);
    if (check.missingEnv.length > 0) {
      console.log(`  Missing: ${check.missingEnv.join(", ")}`);
    }
    if (check.advice) {
      console.log(`  ${check.advice}`);
    }
  }
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1) : "";
}
