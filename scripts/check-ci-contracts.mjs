import fs from "node:fs";

const workflowPath = ".github/workflows/ci.yml";
const templatePath = "docs/github-actions-ci.yml";
const checks = [];

const workflow = readFile(workflowPath);
const template = readFile(templatePath);

pushCheck("Documented GitHub Actions CI template exists", Boolean(template));

if (template) {
  checkRequiredCommands(template);
}

if (workflow) {
  pushCheck("Active workflow matches documented CI template", normalize(workflow) === normalize(template));
}

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkRequiredCommands(workflowText) {
  const requiredCommands = [
    "npm run ci:check",
    "npm run soul:quality",
    "npm run soul:quality:extended",
    "npm run env:check",
    "npm run production:env:checklist",
    "npm run production:env:template",
    "npm run production:launch-plan",
    "npm run production:launch-pack",
    "npm run deployment:check",
    "npm run astrology:check",
    "npm run compatibility:check",
    "npm run auth:check",
    "npm run memory:check",
    "npm run rate-limit:check",
    "npm run request:check",
    "npm run readiness:check",
    "npm run observability:check",
    "npm run openai:check",
    "npm run backend-fetch:check",
    "npm run email:check",
    "npm run supabase:migrations:check",
    "npm run soul:cache:check",
    "npm run astro:check",
    "npm run otp:check",
    "npm run build",
    "npm run public-env:check",
    "npm run security:check",
    "npm run payments:check",
    "npm run more-guidance:check",
    "npm run shani:check",
    "npm run android:security:check",
    "npm run mobile:backend:check",
    "npm run local:smoke",
    "npm run deployment:smoke:check",
    "npm run production:domain:check",
    "npm audit --omit dev",
    "npm run production:check -- --allow-fail",
    "npm run android:apk"
  ];
  const missing = requiredCommands.filter((command) => !workflowText.includes(command));
  pushCheck("CI template runs the required release and mobile gates", missing.length === 0, missing);
}

function readFile(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function normalize(text) {
  return String(text || "").trim().replace(/\r\n/g, "\n");
}

function pushCheck(label, passed, details = []) {
  checks.push({ label, passed, details });
}

function printReport() {
  console.log(`CI contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
    for (const detail of check.details) {
      console.log(`  - ${detail}`);
    }
  }
}
