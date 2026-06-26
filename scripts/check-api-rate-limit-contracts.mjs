import fs from "node:fs";
import path from "node:path";

const apiDir = "api";
const checks = [];

const rateLimitedRoutes = [
  {
    file: "astro-solve.js",
    label: "Astro Solves",
    route: "astro-solve",
    limitEnv: "ASTRO_SOLVE_RATE_LIMIT",
    defaultLimit: 20,
    windowExpression: "24 * 60 * 60",
    subject: "payload.user",
    downstream: ["createAstroSolve"]
  },
  {
    file: "auth-otp.js",
    label: "OTP",
    route: "auth-otp",
    limitEnv: "OTP_RATE_LIMIT",
    defaultLimit: 10,
    windowExpression: "60 * 60",
    subject: "payload.user || { phone: payload.phone, email: payload.email }",
    downstream: ["requestOtp", "verifyOtp"]
  },
  {
    file: "create-razorpay-order.js",
    label: "More Guidance order",
    route: "razorpay-order",
    limitEnv: "RAZORPAY_ORDER_RATE_LIMIT",
    defaultLimit: 10,
    windowExpression: "60 * 60",
    subject: "payload.user",
    downstream: ["createRazorpayOrder"]
  },
  {
    file: "create-shani-order.js",
    label: "Shani order",
    route: "shani-razorpay-order",
    limitEnv: "RAZORPAY_ORDER_RATE_LIMIT",
    defaultLimit: 10,
    windowExpression: "60 * 60",
    subject: "payload.user",
    downstream: ["createShaniRazorpayOrder"]
  },
  {
    file: "guidance-memory.js",
    label: "Guidance memory",
    route: "guidance-memory",
    limitEnv: "GUIDANCE_MEMORY_RATE_LIMIT",
    defaultLimit: 60,
    windowExpression: "24 * 60 * 60",
    subject: "payload.user",
    downstream: ["searchGuidanceMemory", "upsertGuidanceMemory"]
  },
  {
    file: "more-guidance.js",
    label: "More Guidance",
    route: "more-guidance",
    limitEnv: "MORE_GUIDANCE_RATE_LIMIT",
    defaultLimit: 80,
    windowExpression: "24 * 60 * 60",
    subject: "payload.user",
    downstream: ["saveGuidance", "createMoreGuidanceReading", "getMoreGuidanceDashboard"]
  },
  {
    file: "shani-guidance.js",
    label: "Shani guidance",
    route: "shani-guidance",
    limitEnv: "SHANI_PANDIT_RATE_LIMIT",
    defaultLimit: 40,
    windowExpression: "24 * 60 * 60",
    subject: "payload.user",
    downstream: ["createPanditGuidance", "getShaniDashboard"]
  },
  {
    file: "soul-wisdom.js",
    label: "Soul Guru wisdom",
    route: "soul-wisdom",
    limitEnv: "SOUL_WISDOM_RATE_LIMIT",
    defaultLimit: 20,
    windowExpression: "24 * 60 * 60",
    subject: "payload.user",
    downstream: ["createDailySoulWisdom"]
  },
  {
    file: "user-profile.js",
    label: "User profile",
    route: "user-profile",
    limitEnv: "USER_PROFILE_RATE_LIMIT",
    defaultLimit: 60,
    windowExpression: "60 * 60",
    subject: "payload.user || { phone: payload.phone, email: payload.email }",
    downstream: ["handleUserProfile"]
  },
  {
    file: "verify-razorpay-payment.js",
    label: "More Guidance payment verification",
    route: "razorpay-verify",
    limitEnv: "RAZORPAY_VERIFY_RATE_LIMIT",
    defaultLimit: 20,
    windowExpression: "60 * 60",
    subject: "payload.user",
    downstream: ["verifyRazorpayCheckoutPayment"]
  },
  {
    file: "verify-shani-payment.js",
    label: "Shani payment verification",
    route: "shani-razorpay-verify",
    limitEnv: "RAZORPAY_VERIFY_RATE_LIMIT",
    defaultLimit: 20,
    windowExpression: "60 * 60",
    subject: "payload.user",
    downstream: ["verifyShaniRazorpayCheckoutPayment"]
  }
];

const intentionallyUnmeteredRoutes = [
  "health.js",
  "razorpay-webhook.js",
  "readiness.js"
];

checkRouteCoverage();
for (const route of rateLimitedRoutes) {
  checkRoute(route);
}

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkRouteCoverage() {
  const actualRoutes = fs.readdirSync(apiDir)
    .filter((file) => file.endsWith(".js"))
    .sort();
  const covered = [...rateLimitedRoutes.map((route) => route.file), ...intentionallyUnmeteredRoutes].sort();
  const missing = actualRoutes.filter((file) => !covered.includes(file));
  const stale = covered.filter((file) => !actualRoutes.includes(file));
  const duplicates = covered.filter((file, index) => covered.indexOf(file) !== index);

  pushCheck("API rate-limit matrix covers every route exactly once", [
    missing.length === 0,
    stale.length === 0,
    duplicates.length === 0
  ].every(Boolean), [
    ...missing.map((file) => `missing rate-limit matrix entry for ${file}`),
    ...stale.map((file) => `stale rate-limit matrix entry for ${file}`),
    ...duplicates.map((file) => `duplicate rate-limit matrix entry for ${file}`)
  ]);
}

function checkRoute(route) {
  const text = readRoute(route.file);
  const details = [];
  const parseIndex = text.indexOf("parseJsonRequest(req)");
  const rateStart = text.indexOf("const rate = await checkRateLimit({");
  const blockedIndex = text.indexOf("if (!rate.allowed)");
  const firstDownstreamIndex = minPositive(route.downstream.map((name) => indexOfAwaitedCall(text, name)));

  requireCondition(details, text.includes('import { buildRateLimitKey, checkRateLimit } from "../src/backend/rateLimit.js";'), "missing rate-limit import");
  requireCondition(details, parseIndex >= 0, "route must parse JSON before rate limiting");
  requireCondition(details, rateStart > parseIndex, "rate limit must run after parsing");
  requireCondition(details, text.includes("env: process.env"), "rate limit must use production env");
  requireCondition(details, text.includes(`key: buildRateLimitKey(req, ${route.subject})`), `rate limit subject must be ${route.subject}`);
  requireCondition(details, text.includes(`route: "${route.route}"`), `rate limit route must be "${route.route}"`);
  requireCondition(details, text.includes(`limit: Number(process.env.${route.limitEnv} || ${route.defaultLimit})`), `rate limit must use ${route.limitEnv} with default ${route.defaultLimit}`);
  requireCondition(details, text.includes(`windowSeconds: ${route.windowExpression}`), `rate-limit window must be ${route.windowExpression}`);
  requireCondition(details, blockedIndex > rateStart, "route must check rate.allowed before business logic");
  requireCondition(details, /sendJson\(res,\s*429,[\s\S]{0,180}?\brate\b[\s\S]{0,60}?\);/.test(text.slice(blockedIndex)), "blocked requests must return 429 with rate metadata");
  requireCondition(details, firstDownstreamIndex > blockedIndex, "business logic must run only after the 429 guard");

  if (route.file === "soul-wisdom.js") {
    const cachedReadIndex = indexOfAwaitedCall(text, "readCachedDailySoulWisdom");
    const cachedSendIndex = text.indexOf("rate: { allowed: true, cached: true, skipped: true }");
    requireCondition(details, text.includes("createDailySoulWisdom, readCachedDailySoulWisdom"), "Soul Guru route must import cache-first reader");
    requireCondition(details, cachedReadIndex > parseIndex, "Soul Guru cache read must run after parsing and auth");
    requireCondition(details, cachedReadIndex < rateStart, "Soul Guru cached reads must happen before rate-limit increments");
    requireCondition(details, cachedSendIndex > cachedReadIndex && cachedSendIndex < rateStart, "Soul Guru cached responses must return with skipped rate metadata before rate limiting");
  }

  for (const functionName of route.downstream) {
    const callIndex = indexOfAwaitedCall(text, functionName);
    requireCondition(details, callIndex > blockedIndex, `${functionName} must run after rate limiting`);
  }

  pushCheck(`${route.label} route has the expected Upstash rate-limit contract`, details.length === 0, details);
}

function readRoute(file) {
  return fs.readFileSync(path.join(apiDir, file), "utf8");
}

function indexOfAwaitedCall(text, functionName) {
  const regex = new RegExp(`await\\s+${escapeRegExp(functionName)}\\s*\\(`);
  const match = text.match(regex);
  return match ? match.index : -1;
}

function minPositive(values) {
  const positives = values.filter((value) => value >= 0);
  return positives.length ? Math.min(...positives) : -1;
}

function requireCondition(details, passed, message) {
  if (!passed) {
    details.push(message);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pushCheck(label, passed, details = []) {
  checks.push({ label, passed, details });
}

function printReport() {
  console.log(`API route rate-limit contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
    for (const detail of check.details) {
      console.log(`  - ${detail}`);
    }
  }
}
