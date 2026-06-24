import crypto from "node:crypto";
import { getClientIp } from "./request.js";

const DEFAULT_LIMIT = 20;
const DEFAULT_WINDOW_SECONDS = 24 * 60 * 60;
const HASHED_KEY_PATTERN = /^rl_[a-f0-9]{32}$/;

export async function checkRateLimit({
  env = process.env,
  key,
  route = "default",
  limit = DEFAULT_LIMIT,
  windowSeconds = DEFAULT_WINDOW_SECONDS,
  fetchImpl = fetch
}) {
  const restUrl = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;

  if (!restUrl || !token) {
    return { allowed: true, remaining: limit, skipped: true };
  }

  const redisKey = buildRedisRateLimitKey(route, key);
  try {
    const response = await fetchImpl(`${restUrl.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, windowSeconds, "NX"]
      ])
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
    return { allowed: true, remaining: limit, degraded: true };
  }
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

function buildRedisRateLimitKey(route, key) {
  return `soulguru:rate:${sanitizeRoute(route)}:${normalizeRateLimitKey(key)}`;
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
