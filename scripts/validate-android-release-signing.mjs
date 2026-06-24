import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { loadEnv } from "vite";

const root = process.cwd();
const mode = process.env.NODE_ENV || "production";
const env = {
  ...loadEnv(mode, root, ""),
  ...process.env
};

const required = [
  "ANDROID_KEYSTORE_PATH",
  "ANDROID_KEYSTORE_PASSWORD",
  "ANDROID_KEY_ALIAS",
  "ANDROID_KEY_PASSWORD"
];

const missing = required.filter((key) => !String(env[key] || "").trim());
if (missing.length > 0) {
  fail(`Missing Android release signing env var(s): ${missing.join(", ")}.`);
}

for (const key of required) {
  if (isPlaceholderValue(env[key])) {
    fail(`${key} still looks like a placeholder.`);
  }
}

const rawKeystorePath = String(env.ANDROID_KEYSTORE_PATH || "").trim();
if (!path.isAbsolute(rawKeystorePath)) {
  fail("ANDROID_KEYSTORE_PATH must be an absolute path so Gradle can sign from any working directory.");
}

const keystorePath = path.normalize(rawKeystorePath);
if (!fs.existsSync(keystorePath)) {
  fail(`Android keystore file does not exist: ${keystorePath}`);
}

const stat = fs.statSync(keystorePath);
if (!stat.isFile()) {
  fail(`Android keystore path is not a file: ${keystorePath}`);
}

if (stat.size < 128) {
  fail("Android keystore file is unexpectedly small.");
}

if (!/\.(jks|keystore|p12|pfx)$/i.test(keystorePath)) {
  fail("Android keystore file should use .jks, .keystore, .p12, or .pfx.");
}

const relativeKeystore = path.relative(root, keystorePath);
const keystoreInsideRepo = relativeKeystore && !relativeKeystore.startsWith("..") && !path.isAbsolute(relativeKeystore);
if (keystoreInsideRepo && isTracked(relativeKeystore)) {
  fail(`Android keystore is tracked by git: ${relativeKeystore}. Move it outside git or untrack it before release.`);
}

if (keystoreInsideRepo) {
  console.warn(`Android release signing warning: keystore is inside the worktree at ${relativeKeystore}; keep it untracked and ignored.`);
}

console.log(`Android release signing check passed: ${keystorePath}`);

function fail(message) {
  console.error(`Android release signing check failed: ${message}`);
  process.exit(1);
}

function isTracked(file) {
  try {
    execFileSync("git", ["ls-files", "--error-unmatch", file], {
      cwd: root,
      stdio: "ignore"
    });
    return true;
  } catch {
    return false;
  }
}

function isPlaceholderValue(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");

  if (!normalized) return true;
  if (normalized.startsWith("${{") || normalized.startsWith("$")) return true;
  if (/^(your|replace|change|changeme|placeholder|example|dummy|test|todo|xxx|xxxx|redacted)/i.test(normalized)) return true;
  if (/^<[^>]+>$/.test(normalized)) return true;
  if (/^\*+$/.test(normalized)) return true;

  return false;
}
