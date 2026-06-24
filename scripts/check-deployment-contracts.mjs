import fs from "node:fs";

const checks = [];
const vercel = readJson("vercel.json");
const vercelIgnore = readLines(".vercelignore");

checkVercelBuildConfig();
checkVercelApiFunctionConfig();
checkVercelSecurityHeaders();
checkVercelCacheHeaders();
checkVercelSpaRewrite();
checkVercelIgnoreSafety();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkVercelBuildConfig() {
  pushCheck("Vercel builds the Vite production app", [
    vercel?.framework === "vite",
    vercel?.buildCommand === "npm run build",
    vercel?.outputDirectory === "dist"
  ].every(Boolean), [
    "Expected framework=vite, buildCommand=\"npm run build\", outputDirectory=dist."
  ]);
}

function checkVercelApiFunctionConfig() {
  const apiFunction = vercel?.functions?.["api/**/*.js"];
  pushCheck("Vercel API functions keep enough execution time for AI routes", [
    apiFunction,
    Number(apiFunction?.maxDuration) >= 30
  ].every(Boolean), [
    "Expected functions[\"api/**/*.js\"].maxDuration to be at least 30."
  ]);
}

function checkVercelSecurityHeaders() {
  const headers = findHeaderSet("/(.*)");
  const byKey = headerMap(headers);
  pushCheck("Vercel applies baseline browser security headers", [
    byKey["strict-transport-security"] === "max-age=63072000; includeSubDomains; preload",
    byKey["x-content-type-options"] === "nosniff",
    byKey["x-frame-options"] === "DENY",
    byKey["referrer-policy"] === "strict-origin-when-cross-origin",
    byKey["permissions-policy"]?.includes("camera=()"),
    byKey["permissions-policy"]?.includes("microphone=()"),
    byKey["permissions-policy"]?.includes("geolocation=()"),
    byKey["permissions-policy"]?.includes("payment=(self)")
  ].every(Boolean), [
    "Expected HSTS, nosniff, frame denial, referrer policy, and restricted permissions policy."
  ]);
}

function checkVercelCacheHeaders() {
  const apiHeaders = headerMap(findHeaderSet("/api/(.*)"));
  const assetHeaders = headerMap(findHeaderSet("/assets/(.*)"));

  pushCheck("Vercel prevents API response caching", apiHeaders["cache-control"] === "no-store, max-age=0", [
    "Expected /api/(.*) Cache-Control=no-store, max-age=0."
  ]);
  pushCheck("Vercel caches hashed frontend assets immutably", assetHeaders["cache-control"] === "public, max-age=31536000, immutable", [
    "Expected /assets/(.*) Cache-Control=public, max-age=31536000, immutable."
  ]);
}

function checkVercelSpaRewrite() {
  const rewrites = Array.isArray(vercel?.rewrites) ? vercel.rewrites : [];
  const hasApiSafeRewrite = rewrites.some((rewrite) => [
    rewrite.source === "/:path((?!api/).*)",
    rewrite.destination === "/index.html"
  ].every(Boolean));

  pushCheck("Vercel serves the app shell without swallowing API routes", hasApiSafeRewrite, [
    "Expected a non-api SPA rewrite to /index.html."
  ]);
}

function checkVercelIgnoreSafety() {
  const requiredPatterns = [
    ".env",
    ".env.*",
    ".env.local",
    "android",
    "dist",
    "node_modules",
    "*.apk",
    "*.aab",
    "*.jks",
    "*.keystore",
    "*.p12",
    "*.pfx"
  ];
  const missing = requiredPatterns.filter((pattern) => !vercelIgnore.includes(pattern));

  pushCheck("Vercel deploy uploads exclude local secrets, native builds, and release artifacts", missing.length === 0, missing);
}

function findHeaderSet(source) {
  const rules = Array.isArray(vercel?.headers) ? vercel.headers : [];
  return rules.find((rule) => rule.source === source)?.headers || [];
}

function headerMap(headers) {
  return Object.fromEntries((headers || []).map((header) => [
    String(header.key || "").toLowerCase(),
    String(header.value || "")
  ]));
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function readLines(file) {
  try {
    return fs.readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
  } catch {
    return [];
  }
}

function pushCheck(label, passed, details = []) {
  checks.push({
    label,
    passed,
    details: passed ? [] : details
  });
}

function printReport() {
  console.log(`Deployment contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
    for (const detail of check.details) {
      console.log(`  - ${detail}`);
    }
  }
}
