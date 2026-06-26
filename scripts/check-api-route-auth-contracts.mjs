import fs from "node:fs";
import path from "node:path";

const apiDir = "api";
const checks = [];

const protectedRoutes = [
  {
    file: "astro-solve.js",
    label: "Astro Solves",
    downstream: ["getAstroSolveAllowanceStatus", "createAstroSolve"]
  },
  {
    file: "create-razorpay-order.js",
    label: "More Guidance order creation",
    downstream: ["createRazorpayOrder"]
  },
  {
    file: "create-shani-order.js",
    label: "Shani order creation",
    downstream: ["createShaniRazorpayOrder"]
  },
  {
    file: "guidance-memory.js",
    label: "Guidance memory",
    downstream: ["searchGuidanceMemory", "upsertGuidanceMemory"]
  },
  {
    file: "more-guidance.js",
    label: "More Guidance",
    downstream: ["saveGuidance", "createMoreGuidanceReading", "getMoreGuidanceDashboard"]
  },
  {
    file: "shani-guidance.js",
    label: "Shani guidance",
    downstream: ["createPanditGuidance", "getShaniDashboard"]
  },
  {
    file: "soul-wisdom.js",
    label: "Soul Guru wisdom",
    downstream: ["createDailySoulWisdom"]
  },
  {
    file: "soul-wisdom-feedback.js",
    label: "Soul Guru reading feedback",
    downstream: ["submitSoulWisdomFeedback"]
  },
  {
    file: "user-profile.js",
    label: "User profile",
    downstream: ["handleUserProfile"]
  },
  {
    file: "verify-razorpay-payment.js",
    label: "More Guidance payment verification",
    downstream: ["verifyRazorpayCheckoutPayment"]
  },
  {
    file: "verify-shani-payment.js",
    label: "Shani payment verification",
    downstream: ["verifyShaniRazorpayCheckoutPayment"]
  }
];

const publicRoutes = [
  {
    file: "auth-otp.js",
    label: "OTP entrypoint",
    check: checkOtpRoute
  },
  {
    file: "health.js",
    label: "Health probe",
    check: checkHealthRoute
  },
  {
    file: "razorpay-webhook.js",
    label: "Razorpay signed webhook",
    check: checkRazorpayWebhookRoute
  },
  {
    file: "readiness.js",
    label: "Readiness probe",
    check: checkReadinessRoute
  }
];

checkRouteMatrixCoverage();

for (const route of protectedRoutes) {
  checkProtectedRoute(route);
}

for (const route of publicRoutes) {
  checkPublicRoute(route);
}

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkRouteMatrixCoverage() {
  const actualRoutes = fs.readdirSync(apiDir)
    .filter((file) => file.endsWith(".js"))
    .sort();
  const coveredRoutes = [...protectedRoutes, ...publicRoutes]
    .map((route) => route.file)
    .sort();

  const missing = actualRoutes.filter((file) => !coveredRoutes.includes(file));
  const stale = coveredRoutes.filter((file) => !actualRoutes.includes(file));
  const duplicates = coveredRoutes.filter((file, index) => coveredRoutes.indexOf(file) !== index);

  pushCheck("API auth matrix covers every route exactly once", [
    missing.length === 0,
    stale.length === 0,
    duplicates.length === 0
  ].every(Boolean), [
    ...missing.map((file) => `missing matrix entry for ${file}`),
    ...stale.map((file) => `stale matrix entry for ${file}`),
    ...duplicates.map((file) => `duplicate matrix entry for ${file}`)
  ]);
}

function checkProtectedRoute(route) {
  const text = readRoute(route.file);
  const details = [];
  const parseIndex = text.indexOf("parseJsonRequest(req)");
  const identityIndex = text.indexOf("const { payload, auth } = await applyVerifiedIdentity(req, parsedPayload, process.env);");
  const rateLimitIndex = text.indexOf("checkRateLimit({");

  requireCondition(
    details,
    text.includes('import { applyVerifiedIdentity } from "../src/backend/auth.js";'),
    "missing applyVerifiedIdentity import"
  );
  requireCondition(
    details,
    /getHttpMethod\(req\)\s*!==\s*"POST"/.test(text),
    "protected route is not POST-only"
  );
  requireCondition(
    details,
    parseIndex >= 0,
    "protected route does not parse JSON before identity"
  );
  requireCondition(
    details,
    identityIndex > parseIndex,
    "identity helper must run immediately after parsing"
  );
  requireCondition(
    details,
    rateLimitIndex > identityIndex,
    "rate limiting must use verified identity payload"
  );
  requireCondition(
    details,
    hasSendJsonWithAuth(text, identityIndex),
    "successful route response must return auth verification metadata"
  );

  for (const functionName of route.downstream) {
    const callIndex = indexOfAwaitedCall(text, functionName);
    requireCondition(
      details,
      callIndex > identityIndex,
      `${functionName} must run after applyVerifiedIdentity`
    );
  }

  pushCheck(`${route.label} route is identity-gated before business logic`, details.length === 0, details);
}

function checkPublicRoute(route) {
  const text = readRoute(route.file);
  const details = [];

  requireCondition(
    details,
    !text.includes("applyVerifiedIdentity"),
    "intentionally public route should not import or call applyVerifiedIdentity"
  );

  route.check(text, details);
  pushCheck(`${route.label} route has the intended public/provider-auth contract`, details.length === 0, details);
}

function checkOtpRoute(text, details) {
  const rateLimitIndex = text.indexOf("checkRateLimit({");
  const requestIndex = indexOfAwaitedCall(text, "requestOtp");
  const verifyIndex = indexOfAwaitedCall(text, "verifyOtp");

  requireCondition(details, /getHttpMethod\(req\)\s*!==\s*"POST"/.test(text), "OTP route must be POST-only");
  requireCondition(details, text.includes("parseJsonRequest(req)"), "OTP route must parse JSON input");
  requireCondition(details, rateLimitIndex >= 0, "OTP route must rate-limit before sending or verifying codes");
  requireCondition(details, requestIndex > rateLimitIndex, "requestOtp must run after rate limiting");
  requireCondition(details, verifyIndex > rateLimitIndex, "verifyOtp must run after rate limiting");
}

function checkHealthRoute(text, details) {
  requireCondition(details, text.includes("res.status(200).json"), "health route must return HTTP 200");
  requireCondition(details, text.includes("ok: true"), "health route must return ok: true");
  requireCondition(details, !text.includes("parseJsonRequest"), "health route should not parse request bodies");
}

function checkRazorpayWebhookRoute(text, details) {
  const readIndex = text.indexOf("readRequestBody(req, 200000)");
  const signatureIndex = text.indexOf("verifyRazorpayWebhookSignature(");
  const processIndex = indexOfAwaitedCall(text, "processRazorpayWebhook");

  requireCondition(details, /getHttpMethod\(req\)\s*!==\s*"POST"/.test(text), "webhook route must be POST-only");
  requireCondition(details, text.includes("bodyParser: false"), "webhook route must disable body parsing");
  requireCondition(details, readIndex >= 0, "webhook route must read the raw body");
  requireCondition(details, signatureIndex > readIndex, "webhook signature must be checked after raw-body read");
  requireCondition(details, processIndex > signatureIndex, "webhook processing must run after signature verification");
  requireCondition(details, text.includes("sendJson(res, 401"), "invalid webhook signatures must return 401");
  requireCondition(details, !text.includes("parseJsonRequest"), "webhook route must not parse JSON before signature verification");
}

function checkReadinessRoute(text, details) {
  requireCondition(details, /getHttpMethod\(req\)\s*!==\s*"GET"/.test(text), "readiness route must be GET-only");
  requireCondition(details, text.includes("buildDeploymentReadiness(process.env)"), "readiness route must use deployment readiness service");
  requireCondition(details, text.includes("readiness.ok ? 200 : 503"), "readiness route must return 503 when not ready");
  requireCondition(details, !text.includes("parseJsonRequest"), "readiness route should not parse request bodies");
}

function readRoute(file) {
  return fs.readFileSync(path.join(apiDir, file), "utf8");
}

function indexOfAwaitedCall(text, functionName) {
  const regex = new RegExp(`await\\s+${escapeRegExp(functionName)}\\s*\\(`);
  const match = text.match(regex);
  return match ? match.index : -1;
}

function hasSendJsonWithAuth(text, afterIndex) {
  const responseRegex = /sendJson\(res,[\s\S]{0,500}?\bauth\b[\s\S]{0,100}?\);/g;
  let match = responseRegex.exec(text);
  while (match) {
    if (match.index > afterIndex) {
      return true;
    }
    match = responseRegex.exec(text);
  }
  return false;
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
  console.log(`API route auth contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
    for (const detail of check.details) {
      console.log(`  - ${detail}`);
    }
  }
}
