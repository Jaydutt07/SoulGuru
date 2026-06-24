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
