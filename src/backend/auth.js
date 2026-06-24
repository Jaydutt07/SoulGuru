import { verifyToken } from "@clerk/backend";

export async function applyVerifiedIdentity(req, payload = {}, env = process.env, deps = {}) {
  const token = getBearerToken(req);
  const requireAuth = String(env.CLERK_REQUIRE_AUTH || "false").toLowerCase() === "true";
  const verify = deps.verifyToken || verifyToken;

  if (!env.CLERK_SECRET_KEY) {
    if (requireAuth) {
      throw createAuthError("Authentication is not configured", 503);
    }
    return { payload, auth: { verified: false, skipped: true } };
  }

  if (!token) {
    if (requireAuth) {
      throw createAuthError("Authentication is required", 401);
    }
    return { payload, auth: { verified: false, missing: true } };
  }

  try {
    const claims = await verify(token, {
      secretKey: env.CLERK_SECRET_KEY,
      audience: splitCsv(env.CLERK_JWT_AUDIENCE),
      authorizedParties: splitCsv(env.CLERK_AUTHORIZED_PARTIES)
    });
    const authUserId = claims.sub;
    const nextPayload = {
      ...payload,
      user: {
        ...(payload.user || {}),
        authUserId,
        clerkSessionId: claims.sid || null
      }
    };

    return {
      payload: nextPayload,
      auth: {
        verified: true,
        authUserId,
        sessionId: claims.sid || null
      }
    };
  } catch {
    if (requireAuth) {
      throw createAuthError("Invalid authentication token", 401);
    }
    return { payload, auth: { verified: false, invalid: true } };
  }
}

export function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  const value = Array.isArray(header) ? header[0] : header;
  const match = String(value || "").match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function splitCsv(value) {
  const items = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

function createAuthError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
