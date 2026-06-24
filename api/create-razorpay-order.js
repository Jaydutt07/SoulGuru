import { createRazorpayOrder } from "../src/backend/payments.js";
import { buildRateLimitKey, checkRateLimit } from "../src/backend/rateLimit.js";
import { getHttpMethod, parseJsonRequest, sendJson } from "../src/backend/request.js";

export default async function handler(req, res) {
  if (getHttpMethod(req) !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const payload = await parseJsonRequest(req);
    const rate = await checkRateLimit({
      env: process.env,
      key: buildRateLimitKey(req, payload.user),
      route: "razorpay-order",
      limit: Number(process.env.RAZORPAY_ORDER_RATE_LIMIT || 10),
      windowSeconds: 60 * 60
    });

    if (!rate.allowed) {
      sendJson(res, 429, { error: "Too many payment attempts. Try again later.", rate });
      return;
    }

    const order = await createRazorpayOrder(payload, process.env);
    sendJson(res, 200, order);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Unable to create order" });
  }
}
