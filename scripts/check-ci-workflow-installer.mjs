import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const checks = [];
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "soulguru-ci-workflow-"));
const outputPath = path.join(tempDir, ".github", "workflows", "ci.yml");
const sourceText = fs.readFileSync(path.join(process.cwd(), "docs", "github-actions-ci.yml"), "utf8");

const installResult = runInstaller([`--out=${outputPath}`]);
const checkResult = runInstaller([`--out=${outputPath}`, "--check"]);
fs.writeFileSync(outputPath, "name: stale workflow\n");
const mismatchResult = runInstaller([`--out=${outputPath}`, "--check"]);
const forceResult = runInstaller([`--out=${outputPath}`, "--force"]);

checkInstallerWritesWorkflow();
checkInstallerCheckMode();
checkInstallerRejectsMismatch();
checkInstallerForceRepairsMismatch();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkInstallerWritesWorkflow() {
  pushCheck("CI workflow installer writes the documented workflow", [
    installResult.status === 0,
    fs.existsSync(outputPath),
    normalize(fs.readFileSync(outputPath, "utf8")) === normalize(sourceText),
    installResult.stdout.includes("GitHub Actions workflow installed")
  ].every(Boolean), [installResult.stderr].filter(Boolean));
}

function checkInstallerCheckMode() {
  pushCheck("CI workflow installer check mode accepts matching workflow", [
    checkResult.status === 0,
    checkResult.stdout.includes("matches")
  ].every(Boolean), [checkResult.stderr].filter(Boolean));
}

function checkInstallerRejectsMismatch() {
  pushCheck("CI workflow installer check mode rejects mismatched workflow", [
    mismatchResult.status !== 0,
    mismatchResult.stderr.includes("does not match")
  ].every(Boolean), [mismatchResult.stdout, mismatchResult.stderr].filter(Boolean));
}

function checkInstallerForceRepairsMismatch() {
  pushCheck("CI workflow installer force mode repairs mismatched workflow", [
    forceResult.status === 0,
    normalize(fs.readFileSync(outputPath, "utf8")) === normalize(sourceText)
  ].every(Boolean), [forceResult.stderr].filter(Boolean));
}

function runInstaller(args) {
  return spawnSync(process.execPath, ["scripts/install-github-actions-workflow.mjs", ...args], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
}

function normalize(text) {
  return String(text || "").trim().replace(/\r\n/g, "\n");
}

function pushCheck(label, passed, details = []) {
  checks.push({ label, passed, details });
}

function printReport() {
  console.log(`CI workflow installer contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
    if (check.passed) continue;
    for (const detail of check.details || []) {
      const text = String(detail || "").trim();
      if (text) console.log(`  - ${text}`);
    }
  }
}
