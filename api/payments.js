import { applyVerifiedIdentity } from "../src/backend/auth.js";
import {
  createRazorpayOrder,
  createShaniRazorpayOrder,
  verifyRazorpayCheckoutPayment,
  verifyShaniRazorpayCheckoutPayment
} from "../src/backend/payments.js";
import { buildRateLimitKey, checkRateLimit } from "../src/backend/rateLimit.js";
import { getHttpMethod, handleCorsPreflight, parseJsonRequest, sendErrorJson, sendJson } from "../src/backend/request.js";

const PAYMENT_ACTIONS = new Set([
  "create-razorpay-order",
  "verify-razorpay-payment",
  "create-shani-order",
  "verify-shani-payment"
]);

export default async function handler(req, res) {
  if (handleCorsPreflight(req, res)) return;

  if (getHttpMethod(req) !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  let errorContext = {
    route: "payments",
    fallbackMessage: "Unable to process payment request"
  };

  try {
    const action = resolvePaymentAction(req);
    if (!PAYMENT_ACTIONS.has(action)) {
      sendJson(res, 404, { error: "Unknown payment action" });
      return;
    }

    const parsedPayload = await parseJsonRequest(req);
    const { payload, auth } = await applyVerifiedIdentity(req, parsedPayload, process.env);

    if (action === "create-razorpay-order") {
      errorContext = { route: "razorpay-order", fallbackMessage: "Unable to create order" };
      await handleCreateRazorpayOrder(req, res, payload, auth);
      return;
    }

    if (action === "verify-razorpay-payment") {
      errorContext = { route: "razorpay-verify", fallbackMessage: "Unable to verify payment" };
      await handleVerifyRazorpayPayment(req, res, payload, auth);
      return;
    }

    if (action === "create-shani-order") {
      errorContext = { route: "shani-razorpay-order", fallbackMessage: "Unable to create Shani order" };
      await handleCreateShaniOrder(req, res, payload, auth);
      return;
    }

    errorContext = { route: "shani-razorpay-verify", fallbackMessage: "Unable to verify Shani payment" };
    await handleVerifyShaniPayment(req, res, payload, auth);
  } catch (error) {
    await sendErrorJson(req, res, error, errorContext);
  }
}

async function handleCreateRazorpayOrder(req, res, payload, auth) {
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
  sendJson(res, 200, { ...order, auth });
}

async function handleVerifyRazorpayPayment(req, res, payload, auth) {
  const rate = await checkRateLimit({
    env: process.env,
    key: buildRateLimitKey(req, payload.user),
    route: "razorpay-verify",
    limit: Number(process.env.RAZORPAY_VERIFY_RATE_LIMIT || 20),
    windowSeconds: 60 * 60
  });

  if (!rate.allowed) {
    sendJson(res, 429, { error: "Too many payment verification attempts. Try again later.", rate });
    return;
  }

  const result = await verifyRazorpayCheckoutPayment(payload, process.env);
  sendJson(res, 200, { ...result, rate, auth });
}

async function handleCreateShaniOrder(req, res, payload, auth) {
  const rate = await checkRateLimit({
    env: process.env,
    key: buildRateLimitKey(req, payload.user),
    route: "shani-razorpay-order",
    limit: Number(process.env.RAZORPAY_ORDER_RATE_LIMIT || 10),
    windowSeconds: 60 * 60
  });

  if (!rate.allowed) {
    sendJson(res, 429, { error: "Too many Shani payment attempts. Try again later.", rate });
    return;
  }

  const order = await createShaniRazorpayOrder(payload, process.env);
  sendJson(res, 200, { ...order, rate, auth });
}

async function handleVerifyShaniPayment(req, res, payload, auth) {
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
}

function resolvePaymentAction(req) {
  const url = new URL(req.url || "/api/payments", "https://soulguru.local");
  const action = url.searchParams.get("action");
  if (action) return action;

  const pathAction = url.pathname.replace(/^\/api\//, "");
  return PAYMENT_ACTIONS.has(pathAction) ? pathAction : "";
}
