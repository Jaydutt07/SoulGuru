import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { SERVER_ONLY_ENV_KEYS } from "../src/backend/envManifest.js";

const root = process.cwd();
const artifactPath = getArgValue("--artifact") || getArgValue("--apk") || "SoulGuru-debug.apk";
const findings = [];

const trackedFiles = getTrackedFiles();
for (const file of trackedFiles) {
  checkForbiddenTrackedPath(file);
  if (isTextLike(file)) {
    scanTextFile(file, readTextFile(path.join(root, file)), { mobileArtifact: false });
  }
}

scanMobileArtifact(artifactPath);

if (findings.length > 0) {
  console.error("Release safety check failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log(`Release safety check: pass (${trackedFiles.length} tracked files scanned${fs.existsSync(artifactPath) ? `, ${artifactPath} scanned` : ""}).`);

function getTrackedFiles() {
  const output = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" });
  return output.split("\0").filter(Boolean);
}

function checkForbiddenTrackedPath(file) {
  const normalized = file.replace(/\\/g, "/");
  const forbidden = [
    {
      test: (value) => /^\.env($|\.)/.test(value) && value !== ".env.example",
      reason: "environment file is tracked"
    },
    {
      test: (value) => /\.(apk|aab)$/i.test(value),
      reason: "Android build artifact is tracked"
    },
    {
      test: (value) => value === "SoulGuru-debug.apk",
      reason: "debug APK artifact is tracked"
    },
    {
      test: (value) => value.startsWith("dist/"),
      reason: "web build output is tracked"
    },
    {
      test: (value) => value.startsWith("android/app/build/") || value.startsWith("android/build/"),
      reason: "Android build output is tracked"
    },
    {
      test: (value) => value.startsWith("android/app/src/main/assets/public/"),
      reason: "Capacitor synced web assets are tracked"
    },
    {
      test: (value) => /\.(jks|keystore|p12|pfx|pem)$/i.test(value),
      reason: "signing key material is tracked"
    }
  ];

  for (const item of forbidden) {
    if (item.test(normalized)) {
      findings.push(`${file}: ${item.reason}.`);
    }
  }
}

function scanTextFile(file, text, { mobileArtifact }) {
  scanTokenPatterns(file, text);
  scanSensitiveAssignments(file, text);
  if (mobileArtifact) {
    scanMobileArtifactForbiddenNames(file, text);
  }
}

function scanTokenPatterns(file, text) {
  const patterns = [
    { name: "OpenAI API key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g },
    { name: "private key block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
    { name: "Resend API key", pattern: /\bre_[A-Za-z0-9_-]{20,}\b/g },
    { name: "JWT-like secret", pattern: /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/g }
  ];

  for (const { name, pattern } of patterns) {
    if (pattern.test(text)) {
      findings.push(`${file}: possible ${name} found.`);
    }
  }
}

function scanSensitiveAssignments(file, text) {
  const assignmentPattern = /^[ \t]*(?:export[ \t]+)?([A-Z0-9_]*(?:API_KEY|SECRET|SERVICE_ROLE|PRIVATE|TOKEN|PASSWORD)[A-Z0-9_]*)[ \t]*=[ \t]*(['"]?)([^'"\r\n#]*)\2/gm;
  let match;
  while ((match = assignmentPattern.exec(text))) {
    const [, key, , rawValue] = match;
    const value = String(rawValue || "").trim();
    if (!isPlaceholderValue(value) && !isKnownPublicKey(key)) {
      findings.push(`${file}: ${key} appears to have a real value.`);
    }
  }
}

function scanMobileArtifactForbiddenNames(file, text) {
  const found = SERVER_ONLY_ENV_KEYS.filter((name) => text.includes(name));
  if (found.length > 0) {
    findings.push(`${file}: server-only env name(s) found in mobile bundle: ${found.join(", ")}.`);
  }
}

function scanMobileArtifact(file) {
  if (!fs.existsSync(file)) return;

  const listing = execFileSync("unzip", ["-l", file], { encoding: "utf8" });
  const entries = listing
    .split("\n")
    .map((line) => line.trim().match(/\s(\S+)$/)?.[1])
    .filter(Boolean)
    .filter((entry) => {
      const normalized = entry.replace(/^base\//, "");
      return normalized === "assets/capacitor.config.json" ||
        (normalized.startsWith("assets/public/") && /\.(html|js|json|css|map)$/i.test(normalized));
    });

  for (const entry of entries) {
    const text = execFileSync("unzip", ["-p", file, entry], {
      encoding: "utf8",
      maxBuffer: 30 * 1024 * 1024
    });
    scanTextFile(`${file}!${entry}`, text, { mobileArtifact: true });
  }
}

function isTextLike(file) {
  const ext = path.extname(file).toLowerCase();
  const textExtensions = new Set([
    "",
    ".cjs",
    ".css",
    ".env",
    ".example",
    ".gradle",
    ".html",
    ".js",
    ".json",
    ".jsx",
    ".md",
    ".mjs",
    ".properties",
    ".sql",
    ".ts",
    ".tsx",
    ".txt",
    ".xml",
    ".yml",
    ".yaml"
  ]);
  return textExtensions.has(ext);
}

function readTextFile(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.includes(0)) return "";
  return buffer.toString("utf8");
}

function isPlaceholderValue(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");

  if (!normalized) return true;
  if (normalized.startsWith("${{") || normalized.startsWith("$")) return true;
  if (/^(true|false|null|undefined)$/i.test(normalized)) return true;
  if (/^(your|replace|change|changeme|placeholder|example|dummy|test|todo|xxx|xxxx|redacted)/i.test(normalized)) return true;
  if (/^<[^>]+>$/.test(normalized)) return true;
  if (/^\*+$/.test(normalized)) return true;

  return false;
}

function isKnownPublicKey(key) {
  return [
    "VITE_CLERK_PUBLISHABLE_KEY",
    "VITE_POSTHOG_KEY",
    "VITE_SENTRY_DSN",
    "RAZORPAY_KEY_ID"
  ].includes(key);
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}
