import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { SERVER_ONLY_ENV_KEYS } from "../src/backend/envManifest.js";

const artifactPath = getArgValue("--artifact") || getArgValue("--apk") || "SoulGuru-debug.apk";
const expectedUrl = normalizeUrl(getArgValue("--expect-url") || process.env.VITE_API_BASE_URL || "");
const allowLan = process.argv.includes("--allow-lan");
const allowLocalhost = process.argv.includes("--allow-localhost");
const findings = [];
const checks = [];

checkArtifactExists();
const entries = fs.existsSync(artifactPath) ? listArtifactEntries(artifactPath) : [];
const textEntries = entries.filter((entry) => isArtifactTextEntry(normalizeEntry(entry)));
const textByEntry = readArtifactTexts(artifactPath, textEntries);
const combinedText = Object.values(textByEntry).join("\n");

checkBundledAssets(entries);
checkExpectedBackendUrl(combinedText);
checkNoSecretLikeText(textByEntry);

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0 || findings.length > 0) {
  process.exit(1);
}

function checkArtifactExists() {
  pushCheck("Android artifact exists", fs.existsSync(artifactPath), [
    `Expected ${artifactPath} to exist.`
  ]);
}

function checkBundledAssets(entries) {
  const normalizedEntries = entries.map(normalizeEntry);
  const requiredPrefixes = [
    "assets/public/index.html",
    "assets/public/assets/index-",
    "assets/public/assets/react-vendor-",
    "assets/public/assets/sentry-vendor-",
    "assets/public/assets/posthog-vendor-",
    "assets/public/assets/astrology-vendor-",
    "assets/public/assets/paid-guidance-local-",
    "assets/public/assets/soul-wisdom-local-",
    "assets/public/assets/astro-solve-local-",
    "assets/public/assets/shani-local-"
  ];
  const missing = requiredPrefixes.filter((prefix) => (
    !normalizedEntries.some((entry) => entry === prefix || entry.startsWith(prefix))
  ));

  pushCheck("Android artifact contains expected production web chunks", missing.length === 0, missing);
}

function checkExpectedBackendUrl(text) {
  if (!expectedUrl) {
    pushCheck("Android artifact backend URL expectation is optional", true);
    return;
  }

  const url = parseExpectedUrl(expectedUrl);
  const found = text.includes(expectedUrl);

  pushCheck("Android artifact contains the expected backend URL", found, [
    `Expected bundled web assets to contain ${expectedUrl}.`
  ]);

  if (!url) return;

  const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  const isLan = isPrivateHost(url.hostname);
  const allowedProtocol = url.protocol === "https:" ||
    (allowLocalhost && isLocalhost) ||
    (allowLan && isLan);

  pushCheck("Android artifact backend URL is release-safe or explicitly local", [
    allowedProtocol,
    !isLocalhost || allowLocalhost,
    !isLan || allowLan
  ].every(Boolean), [
    "Use HTTPS for production artifacts, --allow-lan for local phone tests, or --allow-localhost only for emulator-only tests."
  ]);
}

function checkNoSecretLikeText(textByFile) {
  for (const [entry, text] of Object.entries(textByFile)) {
    scanServerOnlyEnvNames(entry, text);
    scanTokenPatterns(entry, text);
  }

  pushCheck("Android artifact does not expose server-only env names or secret-shaped tokens", findings.length === 0, findings);
}

function scanServerOnlyEnvNames(entry, text) {
  const found = SERVER_ONLY_ENV_KEYS.filter((name) => text.includes(name));
  if (found.length > 0) {
    findings.push(`${entry}: server-only env name(s) found: ${found.join(", ")}.`);
  }
}

function scanTokenPatterns(entry, text) {
  const patterns = [
    { name: "OpenAI API key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g },
    { name: "private key block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
    { name: "Resend API key", pattern: /\bre_[A-Za-z0-9_-]{20,}\b/g },
    { name: "JWT-like secret", pattern: /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/g },
    { name: "Razorpay secret", pattern: /\bRAZORPAY_KEY_SECRET\b|\brzp_(?:test|live)_[A-Za-z0-9]{20,}\b/g },
    { name: "Clerk secret", pattern: /\bCLERK_SECRET_KEY\b|\bsk_(?:test|live)_[A-Za-z0-9]{20,}\b/g }
  ];

  for (const { name, pattern } of patterns) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      findings.push(`${entry}: possible ${name} found.`);
    }
  }
}

function listArtifactEntries(file) {
  try {
    return execFileSync("unzip", ["-l", file], {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024
    })
      .split("\n")
      .map((line) => line.trim().match(/\s(\S+)$/)?.[1])
      .filter(Boolean)
      .filter((entry) => !entry.endsWith("/"));
  } catch (error) {
    pushCheck("Android artifact can be listed as a zip archive", false, [error.message]);
    return [];
  }
}

function readArtifactTexts(file, entries) {
  const result = {};
  for (const entry of entries) {
    try {
      result[normalizeEntry(entry)] = execFileSync("unzip", ["-p", file, entry], {
        encoding: "utf8",
        maxBuffer: 40 * 1024 * 1024
      });
    } catch (error) {
      findings.push(`${normalizeEntry(entry)}: could not be read from artifact (${error.message}).`);
    }
  }
  return result;
}

function isArtifactTextEntry(entry) {
  return entry === "assets/capacitor.config.json" ||
    (entry.startsWith("assets/public/") && /\.(html|js|json|css|map)$/i.test(entry));
}

function normalizeEntry(entry) {
  return String(entry || "").replace(/^base\//, "");
}

function parseExpectedUrl(value) {
  try {
    return new URL(value);
  } catch {
    pushCheck("Android artifact expected backend URL is valid", false, [
      `Invalid expected URL: ${value}`
    ]);
    return null;
  }
}

function normalizeUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function isPrivateHost(hostname) {
  const normalized = String(hostname || "").toLowerCase();
  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    return isPrivateHost(normalized.slice(1, -1));
  }
  if (normalized === "host.docker.internal") return true;
  if (normalized.startsWith("fe80:") || normalized.startsWith("fd")) return true;

  const parts = normalized.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  return (
    parts[0] === 10 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
}

function pushCheck(label, passed, details = []) {
  checks.push({ label, passed, details });
}

function printReport() {
  console.log(`Android artifact check: ${failed.length || findings.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
    if (!check.passed) {
      for (const detail of check.details || []) {
        console.log(`  - ${detail}`);
      }
    }
  }
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}
