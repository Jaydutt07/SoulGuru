import { applyVerifiedIdentity } from "../src/backend/auth.js";
import { submitSoulWisdomFeedback } from "../src/backend/soulWisdomFeedbackService.js";
import { buildRateLimitKey, checkRateLimit } from "../src/backend/rateLimit.js";
import { getHttpMethod, handleCorsPreflight, parseJsonRequest, sendErrorJson, sendJson } from "../src/backend/request.js";

export default async function handler(req, res) {
  if (handleCorsPreflight(req, res)) return;

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
      route: "soul-wisdom-feedback",
      limit: Number(process.env.SOUL_WISDOM_FEEDBACK_RATE_LIMIT || 30),
      windowSeconds: 24 * 60 * 60
    });

    if (!rate.allowed) {
      sendJson(res, 429, { error: "Soul Guru feedback limit reached. Please try again tomorrow.", rate });
      return;
    }

    const result = await submitSoulWisdomFeedback(payload, process.env);
    sendJson(res, 200, { ...result, rate, auth });
  } catch (error) {
    await sendErrorJson(req, res, error, { route: "soul-wisdom-feedback", fallbackMessage: "Unable to save Soul Guru feedback" });
  }
}
