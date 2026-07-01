import { processRazorpayWebhook, verifyRazorpayWebhookSignature } from "../src/backend/payments.js";
import { getHttpMethod, handleCorsPreflight, readRequestBody, sendErrorJson, sendJson } from "../src/backend/request.js";

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (handleCorsPreflight(req, res)) return;

  if (getHttpMethod(req) !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const rawBody = await readRequestBody(req, 200000);
    const signature = req.headers["x-razorpay-signature"];
    const verified = verifyRazorpayWebhookSignature(
      rawBody,
      Array.isArray(signature) ? signature[0] : signature,
      process.env.RAZORPAY_WEBHOOK_SECRET
    );

    if (!verified) {
      sendJson(res, 401, { error: "Invalid webhook signature" });
      return;
    }

    const result = await processRazorpayWebhook(rawBody, process.env);
    sendJson(res, 200, result);
  } catch (error) {
    await sendErrorJson(req, res, error, { route: "razorpay-webhook", fallbackMessage: "Unable to process webhook" });
  }
}
