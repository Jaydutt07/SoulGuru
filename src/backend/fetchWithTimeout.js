export const DEFAULT_BACKEND_FETCH_TIMEOUT_MS = 12000;
export const MIN_BACKEND_FETCH_TIMEOUT_MS = 100;
export const MAX_BACKEND_FETCH_TIMEOUT_MS = 60000;

export function buildBackendFetchOptions(env = process.env, overrides = {}) {
  return {
    timeoutMs: parseBoundedInteger(
      overrides.timeoutMs ?? env.BACKEND_FETCH_TIMEOUT_MS,
      DEFAULT_BACKEND_FETCH_TIMEOUT_MS,
      MIN_BACKEND_FETCH_TIMEOUT_MS,
      MAX_BACKEND_FETCH_TIMEOUT_MS
    )
  };
}

export async function fetchWithTimeout(url, options = {}, deps = {}) {
  const env = deps.env || process.env;
  const fetchImpl = deps.fetchImpl || globalThis.fetch;
  const label = deps.label || "Backend request";
  const { timeoutMs } = buildBackendFetchOptions(env, deps);

  if (typeof fetchImpl !== "function") {
    throw new Error(`${label} could not run because fetch is unavailable`);
  }

  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const upstreamSignal = options.signal;
  let removeUpstreamAbort = () => {};

  if (controller && upstreamSignal) {
    if (upstreamSignal.aborted) {
      controller.abort(upstreamSignal.reason);
    } else if (typeof upstreamSignal.addEventListener === "function") {
      const onAbort = () => controller.abort(upstreamSignal.reason);
      upstreamSignal.addEventListener("abort", onAbort, { once: true });
      removeUpstreamAbort = () => upstreamSignal.removeEventListener("abort", onAbort);
    }
  }

  const requestOptions = controller
    ? { ...options, signal: controller.signal }
    : { ...options };
  let timedOut = false;
  let timeoutId;

  const requestPromise = Promise.resolve().then(() => fetchImpl(url, requestOptions));
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      const error = createTimeoutError(label, timeoutMs);
      if (controller) controller.abort(error);
      reject(error);
    }, timeoutMs);
  });

  try {
    return await Promise.race([requestPromise, timeoutPromise]);
  } catch (error) {
    if (timedOut) {
      throw createTimeoutError(label, timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    removeUpstreamAbort();
    requestPromise.catch(() => {});
  }
}

function createTimeoutError(label, timeoutMs) {
  const error = new Error(`${label} timed out after ${timeoutMs}ms`);
  error.name = "BackendFetchTimeoutError";
  error.code = "ETIMEDOUT";
  error.timeoutMs = timeoutMs;
  return error;
}

function parseBoundedInteger(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(number)));
}
