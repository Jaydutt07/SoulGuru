import { applyVerifiedIdentity } from "../src/backend/auth.js";
import { createMoreGuidanceReading, getMoreGuidanceDashboard, saveGuidance } from "../src/backend/guidanceService.js";
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
      route: "more-guidance",
      limit: Number(process.env.MORE_GUIDANCE_RATE_LIMIT || 80),
      windowSeconds: 24 * 60 * 60
    });

    if (!rate.allowed) {
      sendJson(res, 429, { error: "More Guidance request limit reached. Please try again tomorrow.", rate });
      return;
    }

    if (payload.action === "save-guidance") {
      const result = await saveGuidance(payload, process.env);
      sendJson(res, 200, { ...result, rate, auth });
      return;
    }

    if (payload.action === "deep-guidance") {
      const result = await createMoreGuidanceReading(payload, process.env);
      sendJson(res, result.allowed === false ? 402 : 200, { ...result, rate, auth });
      return;
    }

    const result = await getMoreGuidanceDashboard(payload, process.env);
    sendJson(res, 200, { ...result, rate, auth });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { error: error.message || "Unable to load More Guidance" });
  }
}
