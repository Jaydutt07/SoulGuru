import crypto from "node:crypto";

const SENTRY_VERSION = "7";

export async function captureApiError(error, options = {}, env = process.env, deps = {}) {
  const statusCode = Number(options.statusCode || error?.statusCode || 500);
  if (statusCode < 500) {
    return { configured: Boolean(getSentryDsn(env)), captured: false, skipped: true, reason: "non-5xx" };
  }

  const dsn = parseSentryDsn(getSentryDsn(env));
  if (!dsn) {
    return { configured: false, captured: false, skipped: true, reason: "missing-dsn" };
  }

  const fetchImpl = deps.fetch || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return { configured: true, captured: false, skipped: true, reason: "fetch-unavailable" };
  }

  const now = deps.now || new Date();
  const event = buildSentryEvent(error, {
    ...options,
    statusCode,
    now,
    environment: env.SENTRY_ENVIRONMENT || env.VERCEL_ENV || env.NODE_ENV || "production"
  });

  const envelope = [
    JSON.stringify({
      event_id: event.event_id,
      dsn: dsn.raw,
      sent_at: now.toISOString()
    }),
    JSON.stringify({ type: "event" }),
    JSON.stringify(event)
  ].join("\n");

  try {
    const response = await fetchImpl(dsn.envelopeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": buildSentryAuthHeader(dsn.publicKey)
      },
      body: envelope
    });

    return {
      configured: true,
      captured: Boolean(response?.ok),
      status: response?.status || 0,
      eventId: event.event_id
    };
  } catch {
    return { configured: true, captured: false, skipped: true, reason: "capture-failed" };
  }
}

export function buildSentryEvent(error, options = {}) {
  const req = options.req || {};
  const route = String(options.route || "unknown");
  const statusCode = Number(options.statusCode || error?.statusCode || 500);
  const now = options.now || new Date();
  const errorName = String(error?.name || "Error");
  const errorMessage = sanitizeText(error?.message || "Unhandled API error");

  return {
    event_id: createEventId(options.eventIdSeed || `${route}|${now.toISOString()}|${errorMessage}`),
    timestamp: now.toISOString(),
    platform: "javascript",
    level: "error",
    logger: "soulguru-api",
    environment: options.environment || "production",
    transaction: route,
    message: `${route}: ${errorMessage}`,
    tags: {
      route,
      status_code: String(statusCode),
      method: getRequestMethod(req)
    },
    request: sanitizeRequest(req),
    exception: {
      values: [{
        type: errorName,
        value: errorMessage,
        stacktrace: sanitizeStacktrace(error?.stack)
      }]
    },
    extra: sanitizeExtra(options.extra)
  };
}

export function parseSentryDsn(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const publicKey = url.username;
    const pathParts = url.pathname.split("/").filter(Boolean);
    const projectId = pathParts.pop();
    if (!url.protocol || !url.host || !publicKey || !projectId) return null;

    const pathPrefix = pathParts.length ? `/${pathParts.join("/")}` : "";
    return {
      raw,
      publicKey,
      projectId,
      envelopeUrl: `${url.protocol}//${url.host}${pathPrefix}/api/${projectId}/envelope/`
    };
  } catch {
    return null;
  }
}

export function getSentryDsn(env = process.env) {
  return env.SENTRY_DSN || env.VITE_SENTRY_DSN || "";
}

function buildSentryAuthHeader(publicKey) {
  return [
    `Sentry sentry_version=${SENTRY_VERSION}`,
    `sentry_client=soulguru-api/1.0`,
    `sentry_key=${publicKey}`
  ].join(", ");
}

function sanitizeRequest(req) {
  const method = getRequestMethod(req);
  const url = sanitizeUrl(req.url || "");
  const headers = sanitizeHeaders(req.headers || {});
  return {
    method,
    url,
    headers
  };
}

function sanitizeHeaders(headers) {
  const allowed = ["host", "user-agent", "x-forwarded-host", "x-forwarded-proto", "x-vercel-id"];
  return Object.fromEntries(allowed.flatMap((name) => {
    const value = headers[name] || headers[name.toLowerCase()];
    if (!value) return [];
    return [[name, Array.isArray(value) ? value.join(",") : String(value)]];
  }));
}

function sanitizeUrl(value) {
  const raw = String(value || "");
  if (!raw) return "";

  try {
    const url = new URL(raw, "https://soulguru.local");
    for (const key of [...url.searchParams.keys()]) {
      if (isSensitiveKey(key)) {
        url.searchParams.set(key, "[Filtered]");
      }
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return raw.split("?")[0] || "";
  }
}

function sanitizeStacktrace(stack = "") {
  const frames = String(stack || "")
    .split("\n")
    .slice(1, 12)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      function: sanitizeText(line.replace(/\s+/g, " ")).slice(0, 240)
    }));

  return frames.length ? { frames: frames.reverse() } : undefined;
}

function sanitizeExtra(extra = {}) {
  return Object.fromEntries(Object.entries(extra || {}).flatMap(([key, value]) => {
    if (isSensitiveKey(key) || value === null || value === undefined) return [];
    if (["string", "number", "boolean"].includes(typeof value)) {
      return [[key, typeof value === "string" ? sanitizeText(value) : value]];
    }
    return [];
  }));
}

function sanitizeText(value) {
  return String(value || "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[Filtered]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[Filtered]")
    .replace(/(token|secret|password|otp|api[_-]?key|authorization)\s*[:=]\s*[^,\s)]+/gi, "$1=[Filtered]")
    .replace(/\b(rzp|sk|pk|phc|sess|eyJ)[A-Za-z0-9._-]{12,}\b/g, "[Filtered]");
}

function isSensitiveKey(key) {
  return /authorization|cookie|phone|email|birth|name|otp|token|secret|password|key|signature|payment|order/i.test(String(key || ""));
}

function getRequestMethod(req) {
  return String(req?.method || "GET").toUpperCase();
}

function createEventId(seed) {
  return crypto.createHash("sha256").update(String(seed || "")).digest("hex").slice(0, 32);
}
