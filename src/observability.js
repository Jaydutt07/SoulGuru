let SentryClient = null;
let posthogClient = null;
let sentryLoading = false;
let posthogLoading = false;
let observedUser = null;

export function initializeObservability(options = {}) {
  const env = options.env || import.meta.env || {};
  const loadSentry = options.loadSentry || (() => import("@sentry/react"));
  const loadPosthog = options.loadPosthog || (() => import("posthog-js"));
  const pending = [];

  const sentryDsn = env.VITE_SENTRY_DSN;
  if (sentryDsn && !SentryClient && !sentryLoading) {
    sentryLoading = true;
    pending.push(loadSentry()
      .then((Sentry) => {
        Sentry.init({
          dsn: sentryDsn,
          environment: env.MODE,
          tracesSampleRate: Number(env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.1)
        });
        SentryClient = Sentry;
        applyObservedUser();
      })
      .catch((error) => console.warn("Sentry initialization failed", error.message))
      .finally(() => {
        sentryLoading = false;
      }));
  }

  const posthogKey = env.VITE_POSTHOG_KEY;
  if (posthogKey && !posthogClient && !posthogLoading) {
    posthogLoading = true;
    pending.push(loadPosthog()
      .then((module) => {
        const posthog = module.default;
        posthog.init(posthogKey, {
          api_host: env.VITE_POSTHOG_HOST || "https://app.posthog.com",
          capture_pageview: false,
          autocapture: false
        });
        posthogClient = posthog;
        applyObservedUser();
      })
      .catch((error) => console.warn("PostHog initialization failed", error.message))
      .finally(() => {
        posthogLoading = false;
      }));
  }

  return Promise.allSettled(pending);
}

export function identifyUser(user) {
  observedUser = user || null;
  applyObservedUser();
}

export function clearObservedUser() {
  observedUser = null;
  if (SentryClient) {
    SentryClient.setUser(null);
  }
  if (posthogClient) {
    posthogClient.reset();
  }
}

export function trackEvent(name, properties = {}) {
  const safeProperties = sanitizeAnalyticsProperties(properties);
  if (posthogClient) {
    posthogClient.capture(name, safeProperties);
  }
  if (SentryClient) {
    SentryClient.addBreadcrumb({
      category: "soulguru",
      message: name,
      data: safeProperties,
      level: "info"
    });
  }
}

export function resetObservabilityForTests() {
  SentryClient = null;
  posthogClient = null;
  sentryLoading = false;
  posthogLoading = false;
  observedUser = null;
}

function applyObservedUser() {
  if (!observedUser) return;

  const userId = observedUser.id || stableBrowserId(observedUser);
  if (SentryClient) {
    SentryClient.setUser({
      id: userId,
      username: firstName(observedUser.name)
    });
  }

  if (posthogClient) {
    posthogClient.identify(userId, {
      created_at: observedUser.createdAt,
      has_more_guidance: Boolean(observedUser.soulGuruSubscription?.active)
    });
  }
}

function stableBrowserId(user) {
  return String(user.phone || user.email || user.name || "anonymous").split("").reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 7).toString(36);
}

function firstName(name) {
  return String(name || "SoulGuru user").trim().split(/\s+/)[0] || "SoulGuru user";
}

function sanitizeAnalyticsProperties(properties = {}) {
  return Object.fromEntries(Object.entries(properties || {}).flatMap(([key, value]) => {
    if (isSensitiveAnalyticsKey(key)) return [];
    if (value === null || value === undefined) return [];
    if (["string", "number", "boolean"].includes(typeof value)) return [[key, value]];
    if (value instanceof Date) return [[key, value.toISOString()]];
    return [];
  }));
}

function isSensitiveAnalyticsKey(key) {
  return /phone|email|birth|name|otp|token|secret|password|key/i.test(String(key || ""));
}
