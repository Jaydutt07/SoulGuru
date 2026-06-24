import crypto from "node:crypto";
import {
  createRazorpayOrder,
  processRazorpayWebhook,
  verifyRazorpayCheckoutPayment,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature
} from "../src/backend/payments.js";

const checks = [];

await checkOrderCreationContract();
await checkCheckoutSignatureContract();
await checkCheckoutVerificationContract();
await checkWebhookSignatureContract();
await checkWebhookProcessingContract();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

async function checkOrderCreationContract() {
  const originalFetch = globalThis.fetch;
  const seen = {};
  globalThis.fetch = async (url, options = {}) => {
    seen.url = url;
    seen.method = options.method;
    seen.authorization = options.headers?.Authorization;
    seen.body = JSON.parse(options.body || "{}");
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          id: "order_contract_123",
          amount: seen.body.amount,
          currency: seen.body.currency,
          status: "created"
        };
      }
    };
  };

  try {
    const order = await createRazorpayOrder({
      user: {
        id: "user-contract",
        name: "Contract User",
        phone: "+15550000000",
        email: "contract@soulguru.local"
      }
    }, {
      RAZORPAY_KEY_ID: "rzp_test_contract",
      RAZORPAY_KEY_SECRET: "contract-secret",
      MORE_GUIDANCE_PRICE_PAISE: "49900"
    });

    const expectedAuth = `Basic ${Buffer.from("rzp_test_contract:contract-secret").toString("base64")}`;
    const expectedOrderToken = hmac("order_contract_123|user-contract|49900|INR", "contract-secret");
    pushCheck("Razorpay order request", [
      seen.url === "https://api.razorpay.com/v1/orders",
      seen.method === "POST",
      seen.authorization === expectedAuth,
      seen.body.amount === 49900,
      seen.body.currency === "INR",
      seen.body.notes?.soulguru_plan === "more_guidance_3m",
      seen.body.notes?.user_key === "user-contract",
      order.provider === "razorpay",
      order.keyId === "rzp_test_contract",
      order.orderId === "order_contract_123",
      order.orderToken === expectedOrderToken
    ].every(Boolean));
  } finally {
    globalThis.fetch = originalFetch;
  }

  await expectRejects(
    "Razorpay missing keys",
    () => createRazorpayOrder({ user: {} }, {}),
    /keys are not configured/i
  );
}

async function checkCheckoutSignatureContract() {
  const secret = "checkout-secret";
  const orderId = "order_contract_123";
  const paymentId = "pay_contract_123";
  const signature = hmac(`${orderId}|${paymentId}`, secret);

  pushCheck("Checkout signature accepts valid HMAC", verifyRazorpayPaymentSignature({
    orderId,
    paymentId,
    signature
  }, secret));
  pushCheck("Checkout signature rejects tampering", !verifyRazorpayPaymentSignature({
    orderId,
    paymentId: `${paymentId}_tampered`,
    signature
  }, secret));
  pushCheck("Checkout signature rejects missing data", !verifyRazorpayPaymentSignature({
    orderId,
    paymentId,
    signature: ""
  }, secret));
}

async function checkCheckoutVerificationContract() {
  const secret = "checkout-secret";
  const orderId = "order_contract_123";
  const paymentId = "pay_contract_123";
  const signature = hmac(`${orderId}|${paymentId}`, secret);
  const amount = 49900;
  const currency = "INR";
  const orderToken = hmac(`${orderId}|user-contract|${amount}|${currency}`, secret);
  const result = await verifyRazorpayCheckoutPayment({
    user: {
      id: "user-contract",
      phone: "+15550000000"
    },
    orderId,
    amount,
    currency,
    orderToken,
    paymentId,
    signature
  }, {
    RAZORPAY_KEY_SECRET: secret
  });

  pushCheck("Checkout verification returns local subscription contract", [
    result.verified === true,
    result.stored === false,
    result.subscription?.active === true,
    result.subscription?.name === "Soul Guru + Astro Solve",
    result.subscription?.duration === "3 months",
    result.subscription?.astroBonusQuestions === 15,
    result.subscription?.provider === "razorpay",
    result.subscription?.providerPaymentId === paymentId,
    result.subscription?.metadata?.order_id === orderId,
    Date.parse(result.subscription?.startedAt),
    Date.parse(result.subscription?.endsAt)
  ].every(Boolean));

  await expectRejects(
    "Checkout verification rejects bad signature",
    () => verifyRazorpayCheckoutPayment({
      user: { id: "user-contract" },
      orderId,
      amount,
      currency,
      orderToken,
      paymentId,
      signature: "bad-signature"
    }, {
      RAZORPAY_KEY_SECRET: secret
    }),
    /could not be verified/i
  );

  await expectRejects(
    "Checkout verification rejects mismatched order token",
    () => verifyRazorpayCheckoutPayment({
      user: { id: "different-user" },
      orderId,
      amount,
      currency,
      orderToken,
      paymentId,
      signature
    }, {
      RAZORPAY_KEY_SECRET: secret
    }),
    /could not be matched/i
  );

  await expectRejects(
    "Checkout verification requires backend order token",
    () => verifyRazorpayCheckoutPayment({
      user: { id: "user-contract" },
      orderId,
      amount,
      currency,
      paymentId,
      signature
    }, {
      RAZORPAY_KEY_SECRET: secret
    }),
    /could not be matched/i
  );
}

async function checkWebhookSignatureContract() {
  const secret = "webhook-secret";
  const rawBody = JSON.stringify(webhookPayload());
  const signature = hmac(rawBody, secret);

  pushCheck("Webhook signature accepts valid HMAC", verifyRazorpayWebhookSignature(rawBody, signature, secret));
  pushCheck("Webhook signature rejects body tampering", !verifyRazorpayWebhookSignature(`${rawBody} `, signature, secret));
  pushCheck("Webhook signature rejects missing secret", !verifyRazorpayWebhookSignature(rawBody, signature, ""));
}

async function checkWebhookProcessingContract() {
  const rawBody = JSON.stringify(webhookPayload());
  const result = await processRazorpayWebhook(rawBody, {});

  pushCheck("Webhook processing degrades without Supabase", [
    result.ok === true,
    result.stored === false,
    result.duplicate === false,
    result.activated === false,
    result.eventName === "payment.captured",
    /Supabase/i.test(result.reason || "")
  ].every(Boolean));
}

function webhookPayload() {
  return {
    id: "evt_contract_123",
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_contract_123",
          order_id: "order_contract_123",
          email: "contract@soulguru.local",
          contact: "+15550000000",
          notes: {
            soulguru_plan: "more_guidance_3m",
            user_key: "user-contract",
            name: "Contract User",
            email: "contract@soulguru.local",
            phone: "+15550000000"
          }
        }
      }
    }
  };
}

function hmac(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

async function expectRejects(label, action, pattern) {
  try {
    await action();
    pushCheck(label, false);
  } catch (error) {
    pushCheck(label, pattern.test(String(error.message || "")));
  }
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function printReport() {
  console.log(`Payment contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}
