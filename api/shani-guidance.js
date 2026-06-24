import { applyVerifiedIdentity } from "../src/backend/auth.js";
import { createPanditGuidance, getShaniDashboard } from "../src/backend/shaniService.js";
import { buildRateLimitKey, checkRateLimit } from "../src/backend/rateLimit.js";
import { getHttpMethod, parseJsonRequest, sendJson } from "../src/backend/request.js";

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
      key: buildRateLimitKey(req, payload.user),
      route: "shani-guidance",
      limit: Number(process.env.SHANI_PANDIT_RATE_LIMIT || 40),
      windowSeconds: 24 * 60 * 60
    });

    if (!rate.allowed) {
      sendJson(res, 429, { error: "Shani guidance request limit reached. Please try again tomorrow.", rate });
      return;
    }

    if (payload.action === "pandit") {
      const result = await createPanditGuidance(payload, process.env);
      sendJson(res, result.allowed === false ? 402 : 200, { ...result, rate, auth });
      return;
    }

    const result = await getShaniDashboard(payload, process.env);
    sendJson(res, 200, { ...result, rate, auth });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { error: error.message || "Unable to load Shani guidance" });
  }
}
