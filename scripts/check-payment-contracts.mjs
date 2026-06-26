import crypto from "node:crypto";
import { buildDeploymentReadiness } from "../src/backend/readinessService.js";
import {
  createRazorpayOrder,
  createShaniRazorpayOrder,
  processRazorpayWebhook,
  verifyShaniRazorpayCheckoutPayment,
  verifyRazorpayCheckoutPayment,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature
} from "../src/backend/payments.js";
import { buildBackendUserKey, isBackendUserKey } from "../src/backend/userIdentity.js";

const checks = [];

await checkOrderCreationContract();
await checkShaniOrderCreationContract();
await checkCheckoutSignatureContract();
await checkCheckoutVerificationContract();
await checkShaniCheckoutVerificationContract();
await checkCheckoutConfirmationEmailContract();
await checkCheckoutSubscriptionRaceContract();
await checkShaniCheckoutMembershipRaceContract();
await checkWebhookSignatureContract();
await checkWebhookProcessingContract();
await checkWebhookDuplicateActivationRecoveryContract();
await checkShaniWebhookActivationContract();
await checkWebhookSubscriptionRaceContract();
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
  let fetchCalls = 0;
  globalThis.fetch = async (url, options = {}) => {
    fetchCalls += 1;
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
    const user = {
      id: "user-contract",
      name: "Contract User",
      phone: "+15550000000",
      email: "contract@soulguru.local"
    };
    const order = await createRazorpayOrder({
      user,
      amount: 1,
      currency: "USD"
    }, {
      RAZORPAY_KEY_ID: "rzp_test_contract",
      RAZORPAY_KEY_SECRET: "contract-secret",
      MORE_GUIDANCE_PRICE_PAISE: "49900"
    });

    const expectedAuth = `Basic ${Buffer.from("rzp_test_contract:contract-secret").toString("base64")}`;
    const expectedUserKey = buildBackendUserKey(user);
    const expectedOrderToken = hmac(`order_contract_123|${expectedUserKey}|49900|INR`, "contract-secret");
    pushCheck("Razorpay order request", [
      seen.url === "https://api.razorpay.com/v1/orders",
      seen.method === "POST",
      seen.authorization === expectedAuth,
      seen.body.amount === 49900,
      seen.body.currency === "INR",
      seen.body.notes?.soulguru_plan === "more_guidance_3m",
      seen.body.notes?.user_key === expectedUserKey,
      isBackendUserKey(seen.body.notes?.user_key),
      seen.body.notes?.user_key !== user.id,
      order.provider === "razorpay",
      order.keyId === "rzp_test_contract",
      order.orderId === "order_contract_123",
      order.amount === 49900,
      order.currency === "INR",
      order.userKey === expectedUserKey,
      order.orderToken === expectedOrderToken
    ].every(Boolean));

    await expectRejects(
      "Razorpay order rejects anonymous paid identity",
      () => createRazorpayOrder({
        user: {},
        amount: 49900,
        currency: "INR"
      }, {
        RAZORPAY_KEY_ID: "rzp_test_contract",
        RAZORPAY_KEY_SECRET: "contract-secret",
        MORE_GUIDANCE_PRICE_PAISE: "49900"
      }),
      /identity is required/i,
      400
    );

    pushCheck("Anonymous Razorpay order is rejected before provider call", fetchCalls === 1);
  } finally {
    globalThis.fetch = originalFetch;
  }

  await expectRejects(
    "Razorpay missing keys",
    () => createRazorpayOrder({ user: {} }, {}),
    /keys are not configured/i
  );

  await expectRejects(
    "Razorpay order rejects missing configured price",
    () => createRazorpayOrder({ user: { id: "user-contract" } }, {
      RAZORPAY_KEY_ID: "rzp_test_contract",
      RAZORPAY_KEY_SECRET: "contract-secret"
    }),
    /MORE_GUIDANCE_PRICE_PAISE must be configured/i
  );

  await expectRejects(
    "Razorpay order rejects invalid configured price",
    () => createRazorpayOrder({ user: {} }, {
      RAZORPAY_KEY_ID: "rzp_test_contract",
      RAZORPAY_KEY_SECRET: "contract-secret",
      MORE_GUIDANCE_PRICE_PAISE: "0"
    }),
    /positive integer/i
  );
}

async function checkShaniOrderCreationContract() {
  const originalFetch = globalThis.fetch;
  const seen = {};
  let fetchCalls = 0;
  globalThis.fetch = async (url, options = {}) => {
    fetchCalls += 1;
    seen.url = url;
    seen.method = options.method;
    seen.authorization = options.headers?.Authorization;
    seen.body = JSON.parse(options.body || "{}");
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          id: "order_shani_contract_123",
          amount: seen.body.amount,
          currency: seen.body.currency,
          status: "created"
        };
      }
    };
  };

  try {
    const user = {
      id: "shani-user-contract",
      name: "Shani Contract User",
      phone: "+15550000003",
      email: "shani-contract@soulguru.local",
      birthDate: "1995-02-11",
      birthTime: "10:15",
      birthPlace: "Jaipur"
    };
    const order = await createShaniRazorpayOrder({
      planId: "6m",
      user,
      amount: 1,
      currency: "USD"
    }, {
      RAZORPAY_KEY_ID: "rzp_test_contract",
      RAZORPAY_KEY_SECRET: "contract-secret",
      SHANI_PLAN_6M_PRICE_PAISE: "54900"
    });

    const expectedAuth = `Basic ${Buffer.from("rzp_test_contract:contract-secret").toString("base64")}`;
    const expectedUserKey = buildBackendUserKey(user);
    const expectedOrderToken = hmac(`order_shani_contract_123|${expectedUserKey}|54900|INR|shani_remedy_6m`, "contract-secret");
    pushCheck("Shani Razorpay order request", [
      seen.url === "https://api.razorpay.com/v1/orders",
      seen.method === "POST",
      seen.authorization === expectedAuth,
      seen.body.amount === 54900,
      seen.body.currency === "INR",
      seen.body.notes?.soulguru_plan === "shani_remedy_6m",
      seen.body.notes?.soulguru_product === "shani_remedy",
      seen.body.notes?.shani_plan_id === "6m",
      seen.body.notes?.user_key === expectedUserKey,
      isBackendUserKey(seen.body.notes?.user_key),
      seen.body.notes?.user_key !== user.id,
      seen.body.notes?.birth_date === "1995-02-11",
      order.provider === "razorpay",
      order.orderId === "order_shani_contract_123",
      order.planId === "6m",
      order.planName === "6 months",
      order.amount === 54900,
      order.currency === "INR",
      order.userKey === expectedUserKey,
      order.orderToken === expectedOrderToken
    ].every(Boolean));

    await expectRejects(
      "Shani Razorpay order rejects unknown plan",
      () => createShaniRazorpayOrder({
        user: { id: "shani-user-contract" },
        planId: "unknown"
      }, {
        RAZORPAY_KEY_ID: "rzp_test_contract",
        RAZORPAY_KEY_SECRET: "contract-secret"
      }),
      /Unknown Shani remedy plan/i,
      400
    );

    pushCheck("Invalid Shani plan is rejected before provider call", fetchCalls === 1);
  } finally {
    globalThis.fetch = originalFetch;
  }

  await expectRejects(
    "Shani Razorpay order rejects invalid configured price",
    () => createShaniRazorpayOrder({
      user: { id: "shani-user-contract" },
      planId: "3m"
    }, {
      RAZORPAY_KEY_ID: "rzp_test_contract",
      RAZORPAY_KEY_SECRET: "contract-secret",
      SHANI_PLAN_3M_PRICE_PAISE: "0"
    }),
    /positive integer/i
  );

  await expectRejects(
    "Shani Razorpay order rejects missing selected plan price",
    () => createShaniRazorpayOrder({
      user: { id: "shani-user-contract" },
      planId: "3m"
    }, {
      RAZORPAY_KEY_ID: "rzp_test_contract",
      RAZORPAY_KEY_SECRET: "contract-secret"
    }),
    /SHANI_PLAN_3M_PRICE_PAISE must be configured/i
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
  const checkoutUser = {
    id: "user-contract",
    phone: "+15550000000"
  };
  const checkoutUserKey = buildBackendUserKey(checkoutUser);
  const orderToken = hmac(`${orderId}|${checkoutUserKey}|${amount}|${currency}`, secret);

  await expectRejects(
    "Checkout verification rejects missing configured price",
    () => verifyRazorpayCheckoutPayment({
      user: { id: "user-contract" },
      orderId,
      amount,
      currency,
      orderToken,
      paymentId,
      signature
    }, {
      RAZORPAY_KEY_SECRET: secret,
      PAYMENTS_ALLOW_LOCAL_ACTIVATION: "true"
    }),
    /MORE_GUIDANCE_PRICE_PAISE must be configured/i
  );

  const result = await verifyRazorpayCheckoutPayment({
    user: checkoutUser,
    orderId,
    amount,
    currency,
    orderToken,
    paymentId,
    signature
  }, {
    RAZORPAY_KEY_SECRET: secret,
    PAYMENTS_ALLOW_LOCAL_ACTIVATION: "true",
    MORE_GUIDANCE_PRICE_PAISE: "49900"
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
    result.subscription?.metadata?.user_key === checkoutUserKey,
    isBackendUserKey(result.subscription?.metadata?.user_key),
    Date.parse(result.subscription?.startedAt),
    Date.parse(result.subscription?.endsAt)
  ].every(Boolean));

  await expectRejects(
    "Checkout verification requires persisted payment storage",
    () => verifyRazorpayCheckoutPayment({
      user: checkoutUser,
      orderId,
      amount,
      currency,
      orderToken,
      paymentId,
      signature
    }, {
      RAZORPAY_KEY_SECRET: secret,
      MORE_GUIDANCE_PRICE_PAISE: "49900"
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
      RAZORPAY_KEY_SECRET: secret,
      MORE_GUIDANCE_PRICE_PAISE: "49900"
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
      RAZORPAY_KEY_SECRET: secret,
      MORE_GUIDANCE_PRICE_PAISE: "49900"
    }),
    /could not be matched/i
  );

  await expectRejects(
    "Checkout verification rejects anonymous paid identity",
    () => verifyRazorpayCheckoutPayment({
      user: {},
      orderId,
      amount,
      currency,
      orderToken: hmac(`${orderId}|anonymous|${amount}|${currency}`, secret),
      paymentId,
      signature
    }, {
      RAZORPAY_KEY_SECRET: secret,
      PAYMENTS_ALLOW_LOCAL_ACTIVATION: "true",
      MORE_GUIDANCE_PRICE_PAISE: "49900"
    }),
    /identity is required/i,
    400
  );

  await expectRejects(
    "Checkout verification rejects underpriced plan token",
    () => verifyRazorpayCheckoutPayment({
      user: { id: "user-contract" },
      orderId,
      amount: 1,
      currency,
      orderToken: hmac(`${orderId}|${checkoutUserKey}|1|${currency}`, secret),
      paymentId,
      signature
    }, {
      RAZORPAY_KEY_SECRET: secret,
      PAYMENTS_ALLOW_LOCAL_ACTIVATION: "true",
      MORE_GUIDANCE_PRICE_PAISE: "49900"
    }),
    /amount does not match/i,
    400
  );

  await expectRejects(
    "Checkout verification rejects tampered currency token",
    () => verifyRazorpayCheckoutPayment({
      user: { id: "user-contract" },
      orderId,
      amount,
      currency: "USD",
      orderToken: hmac(`${orderId}|${checkoutUserKey}|${amount}|USD`, secret),
      paymentId,
      signature
    }, {
      RAZORPAY_KEY_SECRET: secret,
      PAYMENTS_ALLOW_LOCAL_ACTIVATION: "true",
      MORE_GUIDANCE_PRICE_PAISE: "49900"
    }),
    /amount does not match/i,
    400
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
      RAZORPAY_KEY_SECRET: secret,
      MORE_GUIDANCE_PRICE_PAISE: "49900"
    }),
    /could not be matched/i
  );
}

async function checkShaniCheckoutVerificationContract() {
  const secret = "checkout-secret";
  const orderId = "order_shani_checkout";
  const paymentId = "pay_shani_checkout";
  const signature = hmac(`${orderId}|${paymentId}`, secret);
  const amount = 29900;
  const currency = "INR";
  const checkoutUser = {
    id: "shani-checkout-user",
    phone: "+15550000004",
    birthDate: "1995-02-11",
    birthTime: "10:15",
    birthPlace: "Jaipur"
  };
  const checkoutUserKey = buildBackendUserKey(checkoutUser);
  const orderToken = hmac(`${orderId}|${checkoutUserKey}|${amount}|${currency}|shani_remedy_3m`, secret);

  await expectRejects(
    "Shani checkout verification rejects missing selected plan price",
    () => verifyShaniRazorpayCheckoutPayment({
      user: { id: "shani-checkout-user" },
      planId: "3m",
      orderId,
      amount,
      currency,
      orderToken,
      paymentId,
      signature
    }, {
      RAZORPAY_KEY_SECRET: secret,
      PAYMENTS_ALLOW_LOCAL_ACTIVATION: "true"
    }),
    /SHANI_PLAN_3M_PRICE_PAISE must be configured/i
  );

  const result = await verifyShaniRazorpayCheckoutPayment({
    user: checkoutUser,
    planId: "3m",
    orderId,
    amount,
    currency,
    orderToken,
    paymentId,
    signature
  }, {
    RAZORPAY_KEY_SECRET: secret,
    PAYMENTS_ALLOW_LOCAL_ACTIVATION: "true",
    SHANI_PLAN_3M_PRICE_PAISE: "29900"
  });

  pushCheck("Shani checkout verification returns local membership only when explicitly allowed", [
    result.verified === true,
    result.stored === false,
    result.membership?.active === true,
    result.membership?.planId === "3m",
    result.membership?.planName === "3 months",
    result.membership?.provider === "razorpay",
    result.membership?.providerPaymentId === paymentId,
    result.membership?.metadata?.order_id === orderId,
    result.membership?.metadata?.user_key === checkoutUserKey,
    isBackendUserKey(result.membership?.metadata?.user_key),
    Date.parse(result.membership?.startedAt),
    Date.parse(result.membership?.endsAt)
  ].every(Boolean));

  await expectRejects(
    "Shani checkout verification requires persisted membership storage",
    () => verifyShaniRazorpayCheckoutPayment({
      user: { id: "shani-checkout-user" },
      planId: "3m",
      orderId,
      amount,
      currency,
      orderToken,
      paymentId,
      signature
    }, {
      RAZORPAY_KEY_SECRET: secret,
      SHANI_PLAN_3M_PRICE_PAISE: "29900"
    }),
    /Supabase is required/i
  );

  await expectRejects(
    "Shani checkout verification rejects cross-plan order token",
    () => verifyShaniRazorpayCheckoutPayment({
      user: { id: "shani-checkout-user" },
      planId: "6m",
      orderId,
      amount: 54900,
      currency,
      orderToken,
      paymentId,
      signature
    }, {
      RAZORPAY_KEY_SECRET: secret,
      PAYMENTS_ALLOW_LOCAL_ACTIVATION: "true",
      SHANI_PLAN_6M_PRICE_PAISE: "54900"
    }),
    /could not be matched/i,
    401
  );

  await expectRejects(
    "Shani checkout verification rejects underpriced plan",
    () => verifyShaniRazorpayCheckoutPayment({
      user: { id: "shani-checkout-user" },
      planId: "3m",
      orderId,
      amount: 1,
      currency,
      orderToken: hmac(`${orderId}|${checkoutUserKey}|1|${currency}|shani_remedy_3m`, secret),
      paymentId,
      signature
    }, {
      RAZORPAY_KEY_SECRET: secret,
      PAYMENTS_ALLOW_LOCAL_ACTIVATION: "true",
      SHANI_PLAN_3M_PRICE_PAISE: "29900"
    }),
    /amount does not match/i,
    400
  );
}

async function checkCheckoutConfirmationEmailContract() {
  const secret = "checkout-secret";
  const orderId = "order_contract_email";
  const paymentId = "pay_contract_email";
  const amount = 49900;
  const currency = "INR";
  const signature = hmac(`${orderId}|${paymentId}`, secret);
  const user = {
    id: "email-checkout-user",
    name: "Asha Rao",
    phone: "+15550000008",
    email: "Asha <asha@soulguru.local>"
  };
  const orderToken = hmac(`${orderId}|${buildBackendUserKey(user)}|${amount}|${currency}`, secret);
  const supabase = createFakePaymentSupabase();
  const fetchCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    fetchCalls.push({ url, options });
    return {
      ok: true,
      status: 200,
      async json() {
        return { id: "email_checkout_contract_1" };
      }
    };
  };

  try {
    const result = await verifyRazorpayCheckoutPayment({
      user,
      orderId,
      amount,
      currency,
      orderToken,
      paymentId,
      signature
    }, {
      RAZORPAY_KEY_SECRET: secret,
      MORE_GUIDANCE_PRICE_PAISE: "49900",
      RESEND_API_KEY: "re_checkout_contract",
      RESEND_FROM_EMAIL: "SoulGuru <hello@soulguru.app>"
    }, { supabase });
    const emailBody = JSON.parse(fetchCalls[0]?.options?.body || "{}");

    pushCheck("Checkout activation sends More Guidance confirmation email", [
      result.verified === true,
      result.stored === true,
      result.activated === true,
      result.email?.sent === true,
      result.email?.id === "email_checkout_contract_1",
      fetchCalls.length === 1,
      fetchCalls[0].url === "https://api.resend.com/emails",
      fetchCalls[0].options.headers.Authorization === "Bearer re_checkout_contract",
      emailBody.from === "SoulGuru <hello@soulguru.app>",
      emailBody.to?.[0] === "asha@soulguru.local",
      emailBody.subject === "Your Soul Guru + Astro Solve guidance is active",
      emailBody.text.includes("15 additional Astro Solves questions"),
      emailBody.tags?.[0]?.name === "event",
      emailBody.tags?.[0]?.value === "more_guidance_activated"
    ].every(Boolean));
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function checkCheckoutSubscriptionRaceContract() {
  const secret = "checkout-secret";
  const orderId = "order_contract_race";
  const paymentId = "pay_contract_race";
  const amount = 49900;
  const currency = "INR";
  const signature = hmac(`${orderId}|${paymentId}`, secret);
  const raceUser = {
    id: "race-user",
    phone: "+15550000002"
  };
  const orderToken = hmac(`${orderId}|${buildBackendUserKey(raceUser)}|${amount}|${currency}`, secret);
  const supabase = createFakePaymentSupabase({ raceSubscriptionInsert: true });

  const result = await verifyRazorpayCheckoutPayment({
    user: raceUser,
    orderId,
    amount,
    currency,
    orderToken,
    paymentId,
    signature
  }, {
    RAZORPAY_KEY_SECRET: secret,
    MORE_GUIDANCE_PRICE_PAISE: "49900"
  }, { supabase });

  pushCheck("Checkout activation treats unique subscription race as existing membership", [
    result.verified === true,
    result.stored === true,
    result.activated === false,
    result.subscription?.active === true,
    result.subscription?.providerPaymentId === paymentId,
    supabase.state.paymentEvents.size === 1,
    supabase.state.subscriptions.size === 1,
    supabase.state.racedSubscriptionInsertCount === 1
  ].every(Boolean));
}

async function checkShaniCheckoutMembershipRaceContract() {
  const secret = "checkout-secret";
  const orderId = "order_shani_race";
  const paymentId = "pay_shani_race";
  const amount = 29900;
  const currency = "INR";
  const signature = hmac(`${orderId}|${paymentId}`, secret);
  const raceUser = {
    id: "shani-race-user",
    phone: "+15550000005"
  };
  const orderToken = hmac(`${orderId}|${buildBackendUserKey(raceUser)}|${amount}|${currency}|shani_remedy_3m`, secret);
  const supabase = createFakePaymentSupabase({ raceShaniInsert: true });

  const result = await verifyShaniRazorpayCheckoutPayment({
    user: raceUser,
    planId: "3m",
    orderId,
    amount,
    currency,
    orderToken,
    paymentId,
    signature
  }, {
    RAZORPAY_KEY_SECRET: secret,
    SHANI_PLAN_3M_PRICE_PAISE: "29900"
  }, { supabase });

  pushCheck("Shani checkout activation treats unique membership race as existing membership", [
    result.verified === true,
    result.stored === true,
    result.activated === false,
    result.membership?.active === true,
    result.membership?.providerPaymentId === paymentId,
    supabase.state.paymentEvents.size === 1,
    supabase.state.shaniMemberships.size === 1,
    supabase.state.racedShaniInsertCount === 1
  ].every(Boolean));
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

  const supabase = createFakePaymentSupabase();
  await expectRejects(
    "Webhook activation rejects missing paid identity",
    () => processRazorpayWebhook(JSON.stringify(webhookPayload({
      id: "evt_missing_identity",
      userKey: "",
      email: "",
      phone: "",
      contact: ""
    })), {}, { supabase }),
    /stable SoulGuru user identity/i,
    400
  );
  pushCheck("Webhook missing paid identity does not create subscription", supabase.state.subscriptions.size === 0);
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

async function checkShaniWebhookActivationContract() {
  const supabase = createFakePaymentSupabase();
  const first = await processRazorpayWebhook(JSON.stringify(shaniWebhookPayload({
    id: "evt_shani_captured",
    paymentId: "pay_shani_webhook",
    orderId: "order_shani_webhook",
    planId: "1y"
  })), {
    SHANI_PLAN_1Y_PRICE_PAISE: "99900"
  }, { supabase });
  const duplicate = await processRazorpayWebhook(JSON.stringify(shaniWebhookPayload({
    id: "evt_shani_captured",
    paymentId: "pay_shani_webhook",
    orderId: "order_shani_webhook",
    planId: "1y"
  })), {
    SHANI_PLAN_1Y_PRICE_PAISE: "99900"
  }, { supabase });

  pushCheck("Shani webhook activates one remedy membership by provider payment id", [
    first.ok === true,
    first.stored === true,
    first.duplicate === false,
    first.activated === true,
    first.membership?.active === true,
    first.membership?.planId === "1y",
    first.membership?.providerPaymentId === "pay_shani_webhook",
    duplicate.ok === true,
    duplicate.duplicate === true,
    duplicate.activated === false,
    duplicate.membership?.active === true,
    supabase.state.paymentEvents.size === 1,
    supabase.state.shaniMemberships.size === 1
  ].every(Boolean));
}

async function checkWebhookSubscriptionRaceContract() {
  const supabase = createFakePaymentSupabase({ raceSubscriptionInsert: true });
  const result = await processRazorpayWebhook(JSON.stringify(webhookPayload({
    id: "evt_contract_race",
    paymentId: "pay_contract_race_webhook",
    orderId: "order_contract_race_webhook"
  })), {}, { supabase });

  pushCheck("Webhook activation treats unique subscription race as existing membership", [
    result.ok === true,
    result.stored === true,
    result.duplicate === false,
    result.activated === false,
    result.subscription?.active === true,
    result.subscription?.providerPaymentId === "pay_contract_race_webhook",
    supabase.state.paymentEvents.size === 1,
    supabase.state.subscriptions.size === 1,
    supabase.state.racedSubscriptionInsertCount === 1
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
    OTP_SMS_WEBHOOK_TOKEN: "sms-webhook-token-123",
    RAZORPAY_KEY_ID: "rzp_test_contract",
    RAZORPAY_KEY_SECRET: "razorpay-secret",
    RAZORPAY_WEBHOOK_SECRET: "webhook-secret",
    RAZORPAY_WEBHOOK_URL: "https://soulguru.app/api/razorpay-webhook",
    RAZORPAY_WEBHOOK_READY: "true",
    MORE_GUIDANCE_PRICE_PAISE: "49900",
    SHANI_PLAN_3M_PRICE_PAISE: "29900",
    SHANI_PLAN_6M_PRICE_PAISE: "54900",
    SHANI_PLAN_1Y_PRICE_PAISE: "99900",
    SHANI_PLAN_FULL_PRICE_PAISE: "149900"
  });
  const localActivationReport = buildDeploymentReadiness({
    OPENAI_API_KEY: "sk-contract",
    OPENAI_MODEL: "gpt-5.5",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role",
    OTP_HASH_SECRET: "otp-secret",
    OTP_SMS_WEBHOOK_URL: "https://sms.example.test",
    OTP_SMS_WEBHOOK_TOKEN: "sms-webhook-token-123",
    RAZORPAY_KEY_ID: "rzp_test_contract",
    RAZORPAY_KEY_SECRET: "razorpay-secret",
    RAZORPAY_WEBHOOK_SECRET: "webhook-secret",
    RAZORPAY_WEBHOOK_URL: "https://soulguru.app/api/razorpay-webhook",
    RAZORPAY_WEBHOOK_READY: "true",
    MORE_GUIDANCE_PRICE_PAISE: "49900",
    SHANI_PLAN_3M_PRICE_PAISE: "29900",
    SHANI_PLAN_6M_PRICE_PAISE: "54900",
    SHANI_PLAN_1Y_PRICE_PAISE: "99900",
    SHANI_PLAN_FULL_PRICE_PAISE: "149900",
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

function webhookPayload({
  id = "evt_contract_123",
  paymentId = "pay_contract_123",
  orderId = "order_contract_123",
  userKey = "user-contract",
  email = "contract@soulguru.local",
  phone = "+15550000000",
  contact = "+15550000000"
} = {}) {
  return {
    id,
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: orderId,
          email,
          contact,
          notes: {
            soulguru_plan: "more_guidance_3m",
            user_key: userKey,
            name: "Contract User",
            email,
            phone
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

function shaniWebhookPayload({
  id = "evt_shani_123",
  paymentId = "pay_shani_123",
  orderId = "order_shani_123",
  userKey = "shani-user-contract",
  planId = "3m",
  email = "shani@soulguru.local",
  phone = "+15550000006",
  contact = "+15550000006"
} = {}) {
  return {
    id,
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: orderId,
          email,
          contact,
          notes: {
            soulguru_plan: `shani_remedy_${planId}`,
            soulguru_product: "shani_remedy",
            shani_plan_id: planId,
            user_key: userKey,
            name: "Shani User",
            email,
            phone,
            birth_date: "1995-02-11",
            birth_time: "10:15",
            birth_place: "Jaipur"
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
    shaniMemberships: new Map(),
    calls: [],
    failSubscriptionInsert: Boolean(options.failSubscriptionInsert),
    raceSubscriptionInsert: Boolean(options.raceSubscriptionInsert),
    racedSubscriptionInsertCount: 0,
    failShaniInsert: Boolean(options.failShaniInsert),
    raceShaniInsert: Boolean(options.raceShaniInsert),
    racedShaniInsertCount: 0,
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

        if (state.raceSubscriptionInsert && state.racedSubscriptionInsertCount === 0) {
          state.racedSubscriptionInsertCount += 1;
          const subscription = buildFakeSubscriptionRow(state, payload);
          state.subscriptions.set(subscription.id, subscription);
          query.result = {
            data: null,
            error: {
              code: "23505",
              message: "duplicate provider subscription"
            }
          };
          return query;
        }

        const subscription = {
          ...buildFakeSubscriptionRow(state, payload)
        };
        state.subscriptions.set(subscription.id, subscription);
        query.result = { data: subscription, error: null };
        return query;
      }

      if (table === "shani_remedy_memberships") {
        if (state.failShaniInsert) {
          query.result = {
            data: null,
            error: { message: "contract Shani membership insert failure" }
          };
          return query;
        }

        if (state.raceShaniInsert && state.racedShaniInsertCount === 0) {
          state.racedShaniInsertCount += 1;
          const membership = buildFakeShaniMembershipRow(state, payload);
          state.shaniMemberships.set(membership.id, membership);
          query.result = {
            data: null,
            error: {
              code: "23505",
              message: "duplicate provider Shani membership"
            }
          };
          return query;
        }

        const membership = {
          ...buildFakeShaniMembershipRow(state, payload)
        };
        state.shaniMemberships.set(membership.id, membership);
        query.result = { data: membership, error: null };
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

      if (table === "shani_remedy_memberships") {
        return {
          data: clone(findSubscription(state.shaniMemberships, query.filters)) || null,
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

function buildFakeSubscriptionRow(state, payload) {
  return {
    ...clone(payload),
    id: `subscription-${state.nextSubscriptionId++}`,
    created_at: "2026-06-24T00:00:00.000Z"
  };
}

function buildFakeShaniMembershipRow(state, payload) {
  return {
    ...clone(payload),
    id: `shani-membership-${state.nextSubscriptionId++}`,
    created_at: "2026-06-24T00:00:00.000Z"
  };
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

async function expectRejects(label, action, pattern, statusCode) {
  try {
    await action();
    pushCheck(label, false);
  } catch (error) {
    pushCheck(label, [
      pattern.test(String(error.message || "")),
      statusCode ? error.statusCode === statusCode : true
    ].every(Boolean));
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
