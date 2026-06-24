import { applyVerifiedIdentity } from "../src/backend/auth.js";
import { createDailySoulWisdom } from "../src/backend/soulWisdomService.js";
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
      key: buildRateLimitKey(req, payload.user),
      route: "soul-wisdom",
      limit: Number(process.env.SOUL_WISDOM_RATE_LIMIT || 20),
      windowSeconds: 24 * 60 * 60
    });

    if (!rate.allowed) {
      sendJson(res, 429, { error: "Daily guidance limit reached. Please try again tomorrow.", rate });
      return;
    }

    const result = await createDailySoulWisdom(payload, process.env);
    sendJson(res, 200, { ...result, rate, auth });
  } catch (error) {
    await sendErrorJson(req, res, error, { route: "soul-wisdom", fallbackMessage: "Unable to create guidance" });
  }
}
