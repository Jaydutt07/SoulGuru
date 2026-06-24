import fs from "node:fs";
import path from "node:path";
import {
  buildSentryEvent,
  captureApiError,
  parseSentryDsn
} from "../src/backend/observabilityService.js";
import {
  clearObservedUser,
  identifyUser,
  initializeObservability,
  resetObservabilityForTests,
  trackEvent
} from "../src/observability.js";

const checks = [];

await checkNoKeysDoesNotLoadClients();
await checkInitializationOptions();
await checkPendingIdentityAppliesAfterLoad();
await checkTrackEventSanitizesSensitiveProperties();
await checkClearObservedUserResetsClients();
await checkBackendSentryCaptureSanitizesApiErrors();
await checkBackendSentrySkipsUnreportableErrors();
await checkApiRoutesUseBackendErrorHelper();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

async function checkNoKeysDoesNotLoadClients() {
  resetObservabilityForTests();
  let sentryLoads = 0;
  let posthogLoads = 0;
  await initializeObservability({
    env: { MODE: "production" },
    loadSentry: async () => {
      sentryLoads += 1;
      return createSentrySpy();
    },
    loadPosthog: async () => {
      posthogLoads += 1;
      return { default: createPosthogSpy() };
    }
  });

  pushCheck("Observability does not load clients without public keys", [
    sentryLoads === 0,
    posthogLoads === 0
  ].every(Boolean));
}

async function checkInitializationOptions() {
  resetObservabilityForTests();
  const sentry = createSentrySpy();
  const posthog = createPosthogSpy();

  await initializeObservability({
    env: {
      MODE: "production",
      VITE_SENTRY_DSN: "https://public@sentry.example/1",
      VITE_SENTRY_TRACES_SAMPLE_RATE: "0.25",
      VITE_POSTHOG_KEY: "phc_public_contract",
      VITE_POSTHOG_HOST: "https://analytics.soulguru.example"
    },
    loadSentry: async () => sentry,
    loadPosthog: async () => ({ default: posthog })
  });

  pushCheck("Observability initializes Sentry and PostHog with privacy defaults", [
    sentry.initCalls.length === 1,
    sentry.initCalls[0].dsn === "https://public@sentry.example/1",
    sentry.initCalls[0].environment === "production",
    sentry.initCalls[0].tracesSampleRate === 0.25,
    posthog.initCalls.length === 1,
    posthog.initCalls[0].key === "phc_public_contract",
    posthog.initCalls[0].options.api_host === "https://analytics.soulguru.example",
    posthog.initCalls[0].options.capture_pageview === false,
    posthog.initCalls[0].options.autocapture === false
  ].every(Boolean));
}

async function checkPendingIdentityAppliesAfterLoad() {
  resetObservabilityForTests();
  const sentry = createSentrySpy();
  const posthog = createPosthogSpy();
  const user = analyticsUser();
  identifyUser(user);

  await initializeObservability({
    env: {
      MODE: "production",
      VITE_SENTRY_DSN: "https://public@sentry.example/1",
      VITE_POSTHOG_KEY: "phc_public_contract"
    },
    loadSentry: async () => sentry,
    loadPosthog: async () => ({ default: posthog })
  });

  const sentryUser = sentry.setUserCalls[0];
  const posthogIdentify = posthog.identifyCalls[0];
  const posthogPayloadText = JSON.stringify(posthogIdentify || {});

  pushCheck("Observed user identity excludes phone and email", [
    sentryUser.id === "profile-contract-1",
    sentryUser.username === "Asha",
    posthogIdentify.id === "profile-contract-1",
    posthogIdentify.properties.created_at === "2026-06-01T00:00:00.000Z",
    posthogIdentify.properties.has_more_guidance === true,
    !posthogPayloadText.includes(user.phone),
    !posthogPayloadText.includes(user.email),
    !("phone" in posthogIdentify.properties),
    !("email" in posthogIdentify.properties)
  ].every(Boolean));
}

async function checkTrackEventSanitizesSensitiveProperties() {
  resetObservabilityForTests();
  const sentry = createSentrySpy();
  const posthog = createPosthogSpy();
  await initializeObservability({
    env: {
      MODE: "production",
      VITE_SENTRY_DSN: "https://public@sentry.example/1",
      VITE_POSTHOG_KEY: "phc_public_contract"
    },
    loadSentry: async () => sentry,
    loadPosthog: async () => ({ default: posthog })
  });

  trackEvent("astro_solve_completed", {
    source: "api",
    phone: "+919000000001",
    email: "asha@example.com",
    birthDate: "1994-08-17",
    fullName: "Asha Rao",
    token: "secret-token",
    nested: { email: "nested@example.com" },
    count: 2,
    at: new Date("2026-06-24T00:00:00.000Z")
  });

  const capture = posthog.captureCalls[0];
  const breadcrumb = sentry.breadcrumbCalls[0];
  const payloadText = JSON.stringify({ capture, breadcrumb });

  pushCheck("Tracked events sanitize sensitive analytics properties", [
    capture.name === "astro_solve_completed",
    capture.properties.source === "api",
    capture.properties.count === 2,
    capture.properties.at === "2026-06-24T00:00:00.000Z",
    breadcrumb.category === "soulguru",
    breadcrumb.message === "astro_solve_completed",
    breadcrumb.data.source === "api",
    !payloadText.includes("+919000000001"),
    !payloadText.includes("asha@example.com"),
    !payloadText.includes("1994-08-17"),
    !payloadText.includes("Asha Rao"),
    !payloadText.includes("secret-token"),
    !("phone" in capture.properties),
    !("email" in capture.properties),
    !("birthDate" in capture.properties),
    !("fullName" in capture.properties),
    !("nested" in capture.properties)
  ].every(Boolean));
}

async function checkClearObservedUserResetsClients() {
  resetObservabilityForTests();
  const sentry = createSentrySpy();
  const posthog = createPosthogSpy();
  await initializeObservability({
    env: {
      MODE: "production",
      VITE_SENTRY_DSN: "https://public@sentry.example/1",
      VITE_POSTHOG_KEY: "phc_public_contract"
    },
    loadSentry: async () => sentry,
    loadPosthog: async () => ({ default: posthog })
  });

  identifyUser(analyticsUser());
  clearObservedUser();

  pushCheck("Clearing observed user resets Sentry and PostHog identity", [
    sentry.setUserCalls.length >= 2,
    sentry.setUserCalls.at(-1) === null,
    posthog.resetCalls === 1
  ].every(Boolean));
}

async function checkBackendSentryCaptureSanitizesApiErrors() {
  const fetchCalls = [];
  const error = new Error("Supabase service role failed for asha@example.com");
  error.name = "DatabaseError";
  error.stack = "DatabaseError: failed\n    at handler (/api/soul-wisdom.js:30:10)";

  const result = await captureApiError(error, {
    route: "soul-wisdom",
    statusCode: 503,
    req: {
      method: "POST",
      url: "/api/soul-wisdom?token=secret-token&phone=%2B919000000001&date=2026-06-24",
      headers: {
        host: "soulguru.example",
        authorization: "Bearer secret",
        cookie: "session=secret",
        "user-agent": "contract-test",
        "x-vercel-id": "bom1::contract"
      }
    }
  }, {
    SENTRY_DSN: "https://public@sentry.example/42",
    SENTRY_ENVIRONMENT: "production"
  }, {
    now: new Date("2026-06-24T00:00:00.000Z"),
    fetch: async (url, request) => {
      fetchCalls.push({ url, request });
      return { ok: true, status: 202 };
    }
  });

  const dsn = parseSentryDsn("https://public@sentry.example/42");
  const envelope = String(fetchCalls[0]?.request?.body || "");
  const event = JSON.parse(envelope.split("\n")[2] || "{}");
  const payloadText = JSON.stringify({ event, request: fetchCalls[0]?.request });

  pushCheck("Backend Sentry capture sends sanitized 5xx API errors", [
    result.captured === true,
    result.status === 202,
    dsn?.envelopeUrl === "https://sentry.example/api/42/envelope/",
    fetchCalls.length === 1,
    fetchCalls[0].url === "https://sentry.example/api/42/envelope/",
    fetchCalls[0].request.headers["Content-Type"] === "application/x-sentry-envelope",
    fetchCalls[0].request.headers["X-Sentry-Auth"].includes("sentry_key=public"),
    event.transaction === "soul-wisdom",
    event.tags.status_code === "503",
    event.request.url.includes("token=%5BFiltered%5D"),
    event.request.url.includes("phone=%5BFiltered%5D"),
    event.request.url.includes("date=2026-06-24"),
    event.request.headers.host === "soulguru.example",
    event.request.headers["user-agent"] === "contract-test",
    !payloadText.includes("Bearer secret"),
    !payloadText.includes("session=secret"),
    !payloadText.includes("secret-token"),
    !payloadText.includes("asha@example.com"),
    !payloadText.includes("+919000000001"),
    !payloadText.includes("authorization"),
    !payloadText.includes("cookie")
  ].every(Boolean));
}

async function checkBackendSentrySkipsUnreportableErrors() {
  let fetchCalls = 0;
  const clientError = new Error("Authentication is required");
  clientError.statusCode = 401;

  const skippedClient = await captureApiError(clientError, {
    route: "soul-wisdom",
    req: { method: "POST", url: "/api/soul-wisdom" }
  }, {
    SENTRY_DSN: "https://public@sentry.example/42"
  }, {
    fetch: async () => {
      fetchCalls += 1;
      return { ok: true, status: 202 };
    }
  });

  const skippedMissing = await captureApiError(new Error("boom"), {
    route: "soul-wisdom",
    statusCode: 500
  }, {}, {
    fetch: async () => {
      fetchCalls += 1;
      return { ok: true, status: 202 };
    }
  });

  pushCheck("Backend Sentry capture skips client errors and missing DSN", [
    skippedClient.skipped === true,
    skippedClient.reason === "non-5xx",
    skippedMissing.skipped === true,
    skippedMissing.reason === "missing-dsn",
    fetchCalls === 0
  ].every(Boolean));
}

async function checkApiRoutesUseBackendErrorHelper() {
  const apiDir = path.join(process.cwd(), "api");
  const ignored = new Set(["health.js", "readiness.js"]);
  const files = fs.readdirSync(apiDir)
    .filter((file) => file.endsWith(".js") && !ignored.has(file));
  const missing = files.filter((file) => {
    const source = fs.readFileSync(path.join(apiDir, file), "utf8");
    return !source.includes("sendErrorJson(req, res, error");
  });

  pushCheck("API routes report caught backend errors through shared helper", missing.length === 0);
}

function analyticsUser() {
  return {
    id: "profile-contract-1",
    name: "Asha Rao",
    phone: "+919000000001",
    email: "asha@example.com",
    birthDate: "1994-08-17",
    createdAt: "2026-06-01T00:00:00.000Z",
    soulGuruSubscription: {
      active: true
    }
  };
}

function createSentrySpy() {
  return {
    initCalls: [],
    setUserCalls: [],
    breadcrumbCalls: [],
    init(options) {
      this.initCalls.push(options);
    },
    setUser(user) {
      this.setUserCalls.push(user);
    },
    addBreadcrumb(breadcrumb) {
      this.breadcrumbCalls.push(breadcrumb);
    },
    captureException(error) {
      this.captureExceptionCall = error;
    }
  };
}

function createPosthogSpy() {
  return {
    initCalls: [],
    identifyCalls: [],
    captureCalls: [],
    resetCalls: 0,
    init(key, options) {
      this.initCalls.push({ key, options });
    },
    identify(id, properties) {
      this.identifyCalls.push({ id, properties });
    },
    capture(name, properties) {
      this.captureCalls.push({ name, properties });
    },
    reset() {
      this.resetCalls += 1;
    }
  };
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function printReport() {
  console.log(`Observability contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}
