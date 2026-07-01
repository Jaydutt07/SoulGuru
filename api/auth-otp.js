import { buildRateLimitKey, checkRateLimit } from "../src/backend/rateLimit.js";
import { getHttpMethod, handleCorsPreflight, parseJsonRequest, sendErrorJson, sendJson } from "../src/backend/request.js";
import { requestOtp, verifyOtp } from "../src/backend/otpService.js";

export default async function handler(req, res) {
  if (handleCorsPreflight(req, res)) return;

  if (getHttpMethod(req) !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const payload = await parseJsonRequest(req);
    const rate = await checkRateLimit({
      env: process.env,
      key: buildRateLimitKey(req, payload.user || { phone: payload.phone, email: payload.email }),
      route: "auth-otp",
      limit: Number(process.env.OTP_RATE_LIMIT || 10),
      windowSeconds: 60 * 60
    });

    if (!rate.allowed) {
      sendJson(res, 429, { error: "Too many OTP requests. Try again later.", rate });
      return;
    }

    const result = payload.action === "verify"
      ? await verifyOtp(payload, process.env)
      : await requestOtp(payload, process.env);

    sendJson(res, 200, { ...result, rate });
  } catch (error) {
    await sendErrorJson(req, res, error, { route: "auth-otp", fallbackMessage: "Unable to process OTP" });
  }
}
