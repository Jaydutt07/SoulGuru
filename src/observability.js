let SentryClient = null;
let posthogClient = null;
let sentryLoading = false;
let posthogLoading = false;
let observedUser = null;

export function initializeObservability() {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  if (sentryDsn && !SentryClient && !sentryLoading) {
    sentryLoading = true;
    import("@sentry/react")
      .then((Sentry) => {
        Sentry.init({
          dsn: sentryDsn,
          environment: import.meta.env.MODE,
          tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.1)
        });
        SentryClient = Sentry;
        applyObservedUser();
      })
      .catch((error) => console.warn("Sentry initialization failed", error.message))
      .finally(() => {
        sentryLoading = false;
      });
  }

  const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
  if (posthogKey && !posthogClient && !posthogLoading) {
    posthogLoading = true;
    import("posthog-js")
      .then((module) => {
        const posthog = module.default;
        posthog.init(posthogKey, {
          api_host: import.meta.env.VITE_POSTHOG_HOST || "https://app.posthog.com",
          capture_pageview: false,
          autocapture: false
        });
        posthogClient = posthog;
        applyObservedUser();
      })
      .catch((error) => console.warn("PostHog initialization failed", error.message))
      .finally(() => {
        posthogLoading = false;
      });
  }
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
  if (posthogClient) {
    posthogClient.capture(name, properties);
  }
  if (SentryClient) {
    SentryClient.addBreadcrumb({
      category: "soulguru",
      message: name,
      data: properties,
      level: "info"
    });
  }
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
