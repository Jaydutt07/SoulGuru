import fs from "node:fs";

const checks = [];
const vercel = readJson("vercel.json");
const vercelIgnore = readLines(".vercelignore");
const indexHtml = readFile("index.html");
const manifest = readJson("public/manifest.webmanifest");
const viteConfig = readFile("vite.config.js");

checkVercelBuildConfig();
checkViteChunkingConfig();
checkVercelApiFunctionConfig();
checkVercelSecurityHeaders();
checkVercelCacheHeaders();
checkVercelSpaRewrite();
checkVercelIgnoreSafety();
checkAppShellMetadata();
checkPwaManifest();
checkInstallAssets();

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

function checkViteChunkingConfig() {
  pushCheck("Vite production build keeps large app modules in stable chunks", [
    viteConfig.includes("manualChunks(id)"),
    viteConfig.includes("\"react-vendor\""),
    viteConfig.includes("\"sentry-vendor\""),
    viteConfig.includes("\"posthog-vendor\""),
    viteConfig.includes("\"astrology-vendor\""),
    viteConfig.includes("\"paid-guidance-local\""),
    viteConfig.includes("\"soul-wisdom-local\""),
    viteConfig.includes("\"astro-solve-local\""),
    viteConfig.includes("\"shani-local\"")
  ].every(Boolean), [
    "Expected vite.config.js to split heavy vendor and local guidance modules into named chunks."
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
  const csp = parseCsp(byKey["content-security-policy"] || "");
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

  pushCheck("Vercel applies production Content Security Policy", [
    cspDirectiveIncludes(csp, "default-src", "'self'"),
    cspDirectiveIncludes(csp, "base-uri", "'self'"),
    cspDirectiveIncludes(csp, "object-src", "'none'"),
    cspDirectiveIncludes(csp, "frame-ancestors", "'none'"),
    cspDirectiveIncludes(csp, "script-src", "'self'"),
    cspDirectiveIncludes(csp, "script-src", "https://checkout.razorpay.com"),
    cspDirectiveIncludes(csp, "script-src", "https://*.clerk.accounts.dev"),
    cspDirectiveIncludes(csp, "script-src", "https://*.clerk.com"),
    cspDirectiveIncludes(csp, "script-src", "https://*.soulguru.app"),
    cspDirectiveIncludes(csp, "connect-src", "'self'"),
    cspDirectiveIncludes(csp, "connect-src", "https://api.razorpay.com"),
    cspDirectiveIncludes(csp, "connect-src", "https://checkout.razorpay.com"),
    cspDirectiveIncludes(csp, "connect-src", "https://*.clerk.accounts.dev"),
    cspDirectiveIncludes(csp, "connect-src", "https://*.soulguru.app"),
    cspDirectiveIncludes(csp, "connect-src", "https://*.sentry.io"),
    cspDirectiveIncludes(csp, "connect-src", "https://*.posthog.com"),
    cspDirectiveIncludes(csp, "connect-src", "https://*.i.posthog.com"),
    cspDirectiveIncludes(csp, "img-src", "data:"),
    cspDirectiveIncludes(csp, "img-src", "blob:"),
    cspDirectiveIncludes(csp, "style-src", "'unsafe-inline'"),
    cspDirectiveIncludes(csp, "frame-src", "https://checkout.razorpay.com"),
    cspDirectiveIncludes(csp, "frame-src", "https://api.razorpay.com"),
    cspDirectiveIncludes(csp, "frame-src", "https://*.soulguru.app"),
    cspDirectiveIncludes(csp, "worker-src", "blob:"),
    cspDirectiveIncludes(csp, "manifest-src", "'self'"),
    cspDirectiveIncludes(csp, "form-action", "'self'"),
    csp.has("upgrade-insecure-requests")
  ].every(Boolean), [
    "Expected CSP to restrict defaults, block framing/objects, and explicitly allow Razorpay, Clerk, Sentry, and PostHog browser origins."
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

function checkAppShellMetadata() {
  const requiredSnippets = [
    "<title>SoulGuru | Personal Daily Guidance</title>",
    "name=\"description\"",
    "name=\"theme-color\" content=\"#a9dbe4\"",
    "rel=\"manifest\" href=\"/manifest.webmanifest\"",
    "rel=\"icon\" type=\"image/svg+xml\" href=\"/icons/soulguru-icon.svg\"",
    "rel=\"apple-touch-icon\" href=\"/icons/apple-touch-icon.png\"",
    "property=\"og:title\" content=\"SoulGuru | Personal Daily Guidance\"",
    "name=\"twitter:card\" content=\"summary\""
  ];
  const missing = requiredSnippets.filter((snippet) => !indexHtml.includes(snippet));

  pushCheck("App shell exposes production install and share metadata", missing.length === 0, missing);
}

function checkPwaManifest() {
  const icons = Array.isArray(manifest?.icons) ? manifest.icons : [];
  const iconMap = new Map(icons.map((icon) => [icon.src, icon]));
  const required = [
    manifest?.name === "SoulGuru",
    manifest?.short_name === "SoulGuru",
    manifest?.start_url === "/",
    manifest?.scope === "/",
    manifest?.display === "standalone",
    manifest?.orientation === "portrait",
    manifest?.theme_color === "#a9dbe4",
    manifest?.background_color === "#f6fbfa",
    iconMap.get("/icons/soulguru-icon-192.png")?.sizes === "192x192",
    iconMap.get("/icons/soulguru-icon-512.png")?.sizes === "512x512",
    iconMap.get("/icons/soulguru-icon-512.png")?.purpose?.includes("maskable")
  ];

  pushCheck("PWA manifest describes the SoulGuru mobile install surface", required.every(Boolean), [
    "Expected manifest name, standalone portrait display, brand colors, and 192/512 maskable icons."
  ]);
}

function checkInstallAssets() {
  const requiredFiles = [
    "public/icons/soulguru-icon.svg",
    "public/icons/soulguru-icon-192.png",
    "public/icons/soulguru-icon-512.png",
    "public/icons/apple-touch-icon.png",
    "public/robots.txt"
  ];
  const missing = requiredFiles.filter((file) => !fileExists(file));

  pushCheck("Install icons and crawl policy assets exist", missing.length === 0, missing);
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

function parseCsp(value) {
  return new Map(String(value || "")
    .split(";")
    .map((directive) => directive.trim())
    .filter(Boolean)
    .map((directive) => {
      const [name, ...tokens] = directive.split(/\s+/);
      return [String(name || "").toLowerCase(), tokens];
    }));
}

function cspDirectiveIncludes(csp, directive, token) {
  return (csp.get(directive) || []).includes(token);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function readFile(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function fileExists(file) {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
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
