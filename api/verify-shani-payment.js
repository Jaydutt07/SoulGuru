import { applyVerifiedIdentity } from "../src/backend/auth.js";
import { verifyShaniRazorpayCheckoutPayment } from "../src/backend/payments.js";
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
      route: "shani-razorpay-verify",
      limit: Number(process.env.RAZORPAY_VERIFY_RATE_LIMIT || 20),
      windowSeconds: 60 * 60
    });

    if (!rate.allowed) {
      sendJson(res, 429, { error: "Too many Shani payment verification attempts. Try again later.", rate });
      return;
    }

    const result = await verifyShaniRazorpayCheckoutPayment(payload, process.env);
    sendJson(res, 200, { ...result, rate, auth });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { error: error.message || "Unable to verify Shani payment" });
  }
}
