import { applyVerifiedIdentity } from "../src/backend/auth.js";
import { handleUserProfile } from "../src/backend/profileService.js";
import { buildRateLimitKey, checkRateLimit } from "../src/backend/rateLimit.js";
import { getHttpMethod, parseJsonRequest, sendErrorJson, sendJson } from "../src/backend/request.js";

export default async function handler(req, res) {
  if (getHttpMethod(req) !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const parsedPayload = await parseJsonRequest(req);
    const { payload, auth } = await applyVerifiedIdentity(req, parsedPayload, process.env);
    const rate = await checkRateLimit({
      env: process.env,
      key: buildRateLimitKey(req, payload.user || { phone: payload.phone, email: payload.email }),
      route: "user-profile",
      limit: Number(process.env.USER_PROFILE_RATE_LIMIT || 60),
      windowSeconds: 60 * 60
    });

    if (!rate.allowed) {
      sendJson(res, 429, { error: "Too many profile requests. Try again later.", rate });
      return;
    }

    const result = await handleUserProfile(payload, process.env);
    sendJson(res, 200, { ...result, rate, auth });
  } catch (error) {
    await sendErrorJson(req, res, error, { route: "user-profile", fallbackMessage: "Unable to update profile" });
  }
}
