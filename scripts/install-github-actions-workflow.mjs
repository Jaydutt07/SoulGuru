import fs from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const sourcePath = path.resolve(process.cwd(), getArgValue("--source") || "docs/github-actions-ci.yml");
const outputPath = path.resolve(process.cwd(), getArgValue("--out") || ".github/workflows/ci.yml");
const checkOnly = args.has("--check");
const force = args.has("--force");

const source = readRequiredFile(sourcePath);
const existing = readFile(outputPath);

if (checkOnly) {
  if (!existing) {
    fail(`GitHub Actions workflow is missing at ${relativePath(outputPath)}.`);
  }
  if (normalize(existing) !== normalize(source)) {
    fail(`GitHub Actions workflow at ${relativePath(outputPath)} does not match ${relativePath(sourcePath)}.`);
  }
  console.log(`GitHub Actions workflow matches ${relativePath(sourcePath)}.`);
  process.exit(0);
}

if (existing && normalize(existing) !== normalize(source) && !force) {
  fail([
    `Refusing to overwrite ${relativePath(outputPath)} because it differs from ${relativePath(sourcePath)}.`,
    "Re-run with --force after reviewing the difference."
  ].join(" "));
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, ensureTrailingNewline(source));
console.log(`GitHub Actions workflow installed at ${relativePath(outputPath)} from ${relativePath(sourcePath)}.`);
console.log("Push requires a GitHub token with workflow scope or an SSH key allowed to update workflow files.");

function readRequiredFile(file) {
  const text = readFile(file);
  if (!text) {
    fail(`Required workflow template not found at ${relativePath(file)}.`);
  }
  return text;
}

function readFile(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function normalize(text) {
  return ensureTrailingNewline(text).replace(/\r\n/g, "\n");
}

function ensureTrailingNewline(text) {
  return String(text || "").replace(/\s*$/, "\n");
}

function relativePath(file) {
  return path.relative(process.cwd(), file) || ".";
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}
