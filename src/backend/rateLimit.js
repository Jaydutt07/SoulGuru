import crypto from "node:crypto";
import { fetchWithTimeout } from "./fetchWithTimeout.js";
import { getClientIp } from "./request.js";

const DEFAULT_LIMIT = 20;
const DEFAULT_WINDOW_SECONDS = 24 * 60 * 60;
const HASHED_KEY_PATTERN = /^rl_[a-f0-9]{32}$/;
const MAX_MEMORY_BUCKETS = 1000;
const memoryBuckets = new Map();

export async function checkRateLimit({
  env = process.env,
  key,
  route = "default",
  limit = DEFAULT_LIMIT,
  windowSeconds = DEFAULT_WINDOW_SECONDS,
  fetchImpl = globalThis.fetch,
  now = Date.now()
}) {
  const restUrl = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;

  if (!restUrl || !token) {
    if (isUpstashRateLimitRequired(env)) {
      throwHttpError(
        "Rate limiting is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN before serving protected routes.",
        503
      );
    }
    return { allowed: true, remaining: limit, skipped: true };
  }

  const redisKey = buildRedisRateLimitKey(route, key);
  try {
    const response = await fetchWithTimeout(`${restUrl.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, windowSeconds, "NX"]
      ])
    }, {
      env,
      fetchImpl,
      label: "Upstash rate limit"
    });

    if (!response.ok) {
      throw new Error(`Upstash rate limit failed with ${response.status}`);
    }

    const results = await response.json();
    const count = Number(results?.[0]?.result || 0);
    return {
      allowed: count <= limit,
      count,
      limit,
      remaining: Math.max(0, limit - count),
      resetSeconds: windowSeconds
    };
  } catch (error) {
    console.warn("Rate limit check degraded", error.message);
    return {
      ...checkMemoryRateLimit({
        route,
        key,
        limit,
        windowSeconds,
        now
      }),
      degraded: true,
      fallback: "memory"
    };
  }
}

export function isUpstashRateLimitRequired(env = process.env) {
  return String(env.RATE_LIMIT_REQUIRE_UPSTASH || "false").toLowerCase() === "true";
}

export function buildRateLimitKey(req, user = {}) {
  return hashRateLimitSubject(
    user.authUserId ||
    user.id ||
    user.phone ||
    user.email ||
    getClientIp(req)
  );
}

export function hashRateLimitSubject(value) {
  const normalized = String(value || "anonymous").toLowerCase().trim() || "anonymous";
  return `rl_${crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 32)}`;
}

export function checkMemoryRateLimit({
  route = "default",
  key = "anonymous",
  limit = DEFAULT_LIMIT,
  windowSeconds = DEFAULT_WINDOW_SECONDS,
  now = Date.now()
} = {}) {
  const bucketKey = buildRedisRateLimitKey(route, key);
  const currentTime = Number(now);
  const safeNow = Number.isFinite(currentTime) ? currentTime : Date.now();
  const safeWindowSeconds = Math.max(1, Number(windowSeconds) || DEFAULT_WINDOW_SECONDS);
  const resetAt = safeNow + safeWindowSeconds * 1000;
  let bucket = memoryBuckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= safeNow) {
    bucket = { count: 0, resetAt };
  }

  bucket.count += 1;
  memoryBuckets.set(bucketKey, bucket);
  pruneMemoryBuckets(safeNow);

  return {
    allowed: bucket.count <= limit,
    count: bucket.count,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetSeconds: Math.max(1, Math.ceil((bucket.resetAt - safeNow) / 1000))
  };
}

export function resetRateLimitMemoryForTests() {
  memoryBuckets.clear();
}

function buildRedisRateLimitKey(route, key) {
  return `soulguru:rate:${sanitizeRoute(route)}:${normalizeRateLimitKey(key)}`;
}

function pruneMemoryBuckets(now) {
  for (const [key, bucket] of memoryBuckets) {
    if (bucket.resetAt <= now) {
      memoryBuckets.delete(key);
    }
  }

  while (memoryBuckets.size > MAX_MEMORY_BUCKETS) {
    const oldestKey = memoryBuckets.keys().next().value;
    if (!oldestKey) break;
    memoryBuckets.delete(oldestKey);
  }
}

function normalizeRateLimitKey(key) {
  const value = String(key || "").toLowerCase().trim();
  if (HASHED_KEY_PATTERN.test(value)) return value;
  return hashRateLimitSubject(value || "anonymous");
}

function sanitizeRoute(route) {
  const value = String(route || "default")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return value || "default";
}

function throwHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}
