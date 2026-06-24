import crypto from "node:crypto";
import { buildDeploymentReadiness } from "../src/backend/readinessService.js";
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
await checkWebhookDuplicateActivationRecoveryContract();
await checkSubscriptionWebhookIdempotencyContract();
checkRazorpayReadinessContract();

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
    RAZORPAY_KEY_SECRET: secret,
    PAYMENTS_ALLOW_LOCAL_ACTIVATION: "true"
  });

  pushCheck("Checkout verification returns local subscription only when explicitly allowed", [
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
    "Checkout verification requires persisted payment storage",
    () => verifyRazorpayCheckoutPayment({
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
    }),
    /Supabase is required/i
  );

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
  await expectRejects(
    "Webhook processing requires persisted event storage",
    () => processRazorpayWebhook(rawBody, {}),
    /Supabase is required/i
  );

  const result = await processRazorpayWebhook(rawBody, {
    PAYMENTS_ALLOW_LOCAL_ACTIVATION: "true"
  });

  pushCheck("Webhook processing degrades only in explicit local payment mode", [
    result.ok === true,
    result.stored === false,
    result.duplicate === false,
    result.activated === false,
    result.eventName === "payment.captured",
    /Supabase/i.test(result.reason || "")
  ].every(Boolean));
}

async function checkWebhookDuplicateActivationRecoveryContract() {
  const rawBody = JSON.stringify(webhookPayload());
  const supabase = createFakePaymentSupabase({ failSubscriptionInsert: true });

  await expectRejects(
    "Webhook activation failure surfaces after event storage",
    () => processRazorpayWebhook(rawBody, {}, { supabase }),
    /Unable to activate subscription/i
  );

  pushCheck("Webhook stores payment event before failed activation", [
    supabase.state.paymentEvents.size === 1,
    supabase.state.subscriptions.size === 0
  ].every(Boolean));

  supabase.state.failSubscriptionInsert = false;
  const replay = await processRazorpayWebhook(rawBody, {}, { supabase });
  const secondReplay = await processRazorpayWebhook(rawBody, {}, { supabase });

  pushCheck("Duplicate activation webhook repairs missing subscription", [
    replay.ok === true,
    replay.stored === true,
    replay.duplicate === true,
    replay.activated === true,
    replay.subscription?.active === true,
    replay.subscription?.providerPaymentId === "pay_contract_123",
    supabase.state.subscriptions.size === 1
  ].every(Boolean));

  pushCheck("Duplicate activation webhook stays idempotent after repair", [
    secondReplay.ok === true,
    secondReplay.stored === true,
    secondReplay.duplicate === true,
    secondReplay.activated === false,
    secondReplay.subscription?.active === true,
    supabase.state.subscriptions.size === 1
  ].every(Boolean));
}

async function checkSubscriptionWebhookIdempotencyContract() {
  const supabase = createFakePaymentSupabase();
  const first = await processRazorpayWebhook(JSON.stringify(subscriptionWebhookPayload({
    id: "evt_subscription_activated",
    event: "subscription.activated"
  })), {}, { supabase });
  const secondLifecycleEvent = await processRazorpayWebhook(JSON.stringify(subscriptionWebhookPayload({
    id: "evt_subscription_charged",
    event: "subscription.charged"
  })), {}, { supabase });
  const duplicate = await processRazorpayWebhook(JSON.stringify(subscriptionWebhookPayload({
    id: "evt_subscription_charged",
    event: "subscription.charged"
  })), {}, { supabase });

  pushCheck("Subscription webhook activates one membership by provider subscription id", [
    first.ok === true,
    first.activated === true,
    first.subscription?.providerSubscriptionId === "sub_contract_123",
    secondLifecycleEvent.ok === true,
    secondLifecycleEvent.duplicate === false,
    secondLifecycleEvent.activated === false,
    duplicate.ok === true,
    duplicate.duplicate === true,
    duplicate.activated === false,
    supabase.state.paymentEvents.size === 2,
    supabase.state.subscriptions.size === 1
  ].every(Boolean));
}

function checkRazorpayReadinessContract() {
  const readyReport = buildDeploymentReadiness({
    OPENAI_API_KEY: "sk-contract",
    OPENAI_MODEL: "gpt-5.5",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role",
    OTP_HASH_SECRET: "otp-secret",
    OTP_SMS_WEBHOOK_URL: "https://sms.example.test",
    RAZORPAY_KEY_ID: "rzp_test_contract",
    RAZORPAY_KEY_SECRET: "razorpay-secret",
    RAZORPAY_WEBHOOK_SECRET: "webhook-secret",
    MORE_GUIDANCE_PRICE_PAISE: "49900"
  });
  const localActivationReport = buildDeploymentReadiness({
    OPENAI_API_KEY: "sk-contract",
    OPENAI_MODEL: "gpt-5.5",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role",
    OTP_HASH_SECRET: "otp-secret",
    OTP_SMS_WEBHOOK_URL: "https://sms.example.test",
    RAZORPAY_KEY_ID: "rzp_test_contract",
    RAZORPAY_KEY_SECRET: "razorpay-secret",
    RAZORPAY_WEBHOOK_SECRET: "webhook-secret",
    MORE_GUIDANCE_PRICE_PAISE: "49900",
    PAYMENTS_ALLOW_LOCAL_ACTIVATION: "true"
  });
  const readyRazorpay = readyReport.checks.find((check) => check.id === "razorpay");
  const unsafeRazorpay = localActivationReport.checks.find((check) => check.id === "razorpay");

  pushCheck("Production readiness accepts persisted Razorpay activation", readyRazorpay?.status === "pass");
  pushCheck("Production readiness rejects local payment activation", [
    unsafeRazorpay?.status === "fail",
    unsafeRazorpay?.missingEnv.includes("PAYMENTS_ALLOW_LOCAL_ACTIVATION=false")
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

function subscriptionWebhookPayload({ id = "evt_subscription_123", event = "subscription.activated" } = {}) {
  return {
    id,
    event,
    payload: {
      subscription: {
        entity: {
          id: "sub_contract_123",
          notes: {
            soulguru_plan: "more_guidance_3m",
            user_key: "subscription-user",
            name: "Subscription User",
            email: "subscription@soulguru.local",
            phone: "+15550000001"
          }
        }
      }
    }
  };
}

function createFakePaymentSupabase(options = {}) {
  const state = {
    paymentEvents: new Map(),
    subscriptions: new Map(),
    calls: [],
    failSubscriptionInsert: Boolean(options.failSubscriptionInsert),
    nextSubscriptionId: 1
  };

  return {
    state,
    from(table) {
      return createFakePaymentQuery(state, table);
    }
  };
}

function createFakePaymentQuery(state, table) {
  const query = {
    filters: {},
    result: { data: null, error: null },
    select() {
      return query;
    },
    eq(column, value) {
      query.filters[column] = value;
      return query;
    },
    insert(payload) {
      state.calls.push({
        table,
        operation: "insert",
        payload: clone(payload)
      });

      if (table === "payment_events") {
        const key = payload.provider_event_id;
        if (state.paymentEvents.has(key)) {
          query.result = {
            data: null,
            error: {
              code: "23505",
              message: "duplicate provider_event_id"
            }
          };
          return query;
        }

        const event = clone(payload);
        state.paymentEvents.set(key, event);
        query.result = { data: event, error: null };
        return query;
      }

      if (table === "more_guidance_subscriptions") {
        if (state.failSubscriptionInsert) {
          query.result = {
            data: null,
            error: { message: "contract subscription insert failure" }
          };
          return query;
        }

        const subscription = {
          ...clone(payload),
          id: `subscription-${state.nextSubscriptionId++}`,
          created_at: "2026-06-24T00:00:00.000Z"
        };
        state.subscriptions.set(subscription.id, subscription);
        query.result = { data: subscription, error: null };
        return query;
      }

      return query;
    },
    async maybeSingle() {
      if (table === "payment_events") {
        return {
          data: clone(state.paymentEvents.get(query.filters.provider_event_id)) || null,
          error: null
        };
      }

      if (table === "more_guidance_subscriptions") {
        return {
          data: clone(findSubscription(state.subscriptions, query.filters)) || null,
          error: null
        };
      }

      return query.result;
    },
    async single() {
      return query.result;
    },
    then(resolve, reject) {
      return Promise.resolve(query.result).then(resolve, reject);
    }
  };

  return query;
}

function findSubscription(subscriptions, filters) {
  return Array.from(subscriptions.values()).find((subscription) => {
    if (filters.provider && subscription.provider !== filters.provider) return false;
    if (filters.provider_payment_id && subscription.provider_payment_id !== filters.provider_payment_id) return false;
    if (filters.provider_subscription_id && subscription.provider_subscription_id !== filters.provider_subscription_id) return false;
    if (filters.user_key && subscription.user_key !== filters.user_key) return false;
    return true;
  });
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
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
