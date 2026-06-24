import { getClientIp } from "./request.js";

const DEFAULT_LIMIT = 20;
const DEFAULT_WINDOW_SECONDS = 24 * 60 * 60;

export async function checkRateLimit({
  env = process.env,
  key,
  route = "default",
  limit = DEFAULT_LIMIT,
  windowSeconds = DEFAULT_WINDOW_SECONDS
}) {
  const restUrl = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;

  if (!restUrl || !token) {
    return { allowed: true, remaining: limit, skipped: true };
  }

  const redisKey = `soulguru:rate:${route}:${key || "anonymous"}`;
  try {
    const response = await fetch(`${restUrl.replace(/\/$/, "")}/pipeline`, {
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
  return String(
    user.authUserId ||
    user.id ||
    user.phone ||
    user.email ||
    getClientIp(req)
  ).toLowerCase().trim();
}
