import crypto from "node:crypto";
import { buildMembershipEmail, buildShaniMembershipEmail, sendEmail } from "./emailService.js";
import { fetchWithTimeout } from "./fetchWithTimeout.js";
import { buildShaniReport } from "./shaniService.js";
import { createSupabaseAdmin } from "./supabaseAdmin.js";
import {
  buildBackendUserKey,
  getBackendUserIdentity,
  normalizeBackendUserKey
} from "./userIdentity.js";

const RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders";
const MEMBERSHIP_PLAN_NAME = "Soul Guru + Astro Solve";
const MORE_GUIDANCE_CURRENCY = "INR";
const SUBSCRIPTION_SELECT = "id, plan_name, status, starts_at, ends_at, astro_bonus_questions, provider, provider_payment_id, provider_subscription_id, metadata";
const SHANI_CURRENCY = "INR";
const SHANI_PRODUCT_KEY = "shani_remedy";
const SHANI_MEMBERSHIP_SELECT = "id, plan_id, plan_name, status, starts_at, ends_at, provider, provider_payment_id, provider_subscription_id, metadata, created_at";
const SHANI_PLAN_DEFINITIONS = Object.freeze({
  "3m": {
    id: "3m",
    name: "3 months",
    duration: "3 months",
    envKey: "SHANI_PLAN_3M_PRICE_PAISE",
    months: 3
  },
  "6m": {
    id: "6m",
    name: "6 months",
    duration: "6 months",
    envKey: "SHANI_PLAN_6M_PRICE_PAISE",
    months: 6
  },
  "1y": {
    id: "1y",
    name: "1 year",
    duration: "1 year",
    envKey: "SHANI_PLAN_1Y_PRICE_PAISE",
    months: 12
  },
  full: {
    id: "full",
    name: "Remaining timeline",
    duration: "Remaining timeline",
    envKey: "SHANI_PLAN_FULL_PRICE_PAISE",
    fullTimeline: true
  }
});

export async function createRazorpayOrder({ user = {} }, env = process.env, deps = {}) {
  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys are not configured");
  }

  const amountPaise = getMoreGuidancePricePaise(env);
  const currency = MORE_GUIDANCE_CURRENCY;
  const userKey = requirePaymentUserKey(user);
  const response = await fetchWithTimeout(RAZORPAY_ORDERS_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency,
      receipt: `soulguru-${Date.now()}`,
      notes: {
        soulguru_plan: "more_guidance_3m",
        user_key: userKey,
        user_id: user.id || "",
        name: user.name || "",
        phone: user.phone || "",
        email: user.email || ""
      }
    })
  }, {
    env,
    fetchImpl: deps.fetch || globalThis.fetch,
    label: "Razorpay More Guidance order"
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.description || `Razorpay order failed with ${response.status}`);
  }

  const responseAmount = Number(data.amount);
  const responseCurrency = String(data.currency || "").toUpperCase();
  if (responseAmount !== amountPaise || responseCurrency !== currency) {
    throw new Error("Razorpay order response did not match the More Guidance plan");
  }

  return {
    provider: "razorpay",
    keyId,
    orderId: data.id,
    amount: responseAmount,
    currency: responseCurrency,
    status: data.status,
    userKey,
    orderToken: signRazorpayOrder({
      orderId: data.id,
      userKey,
      amount: responseAmount,
      currency: responseCurrency
    }, keySecret)
  };
}

export async function createShaniRazorpayOrder({ user = {}, planId = "3m" }, env = process.env, deps = {}) {
  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys are not configured");
  }

  const plan = getShaniPlan(planId, env);
  const amountPaise = plan.pricePaise;
  const currency = SHANI_CURRENCY;
  const userKey = requirePaymentUserKey(user);
  const planKey = buildShaniPlanKey(plan.id);
  const response = await fetchWithTimeout(RAZORPAY_ORDERS_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency,
      receipt: `soulguru-shani-${plan.id}-${Date.now()}`,
      notes: {
        soulguru_plan: planKey,
        soulguru_product: SHANI_PRODUCT_KEY,
        shani_plan_id: plan.id,
        user_key: userKey,
        user_id: user.id || "",
        name: user.name || "",
        phone: user.phone || "",
        email: user.email || "",
        birth_date: user.birthDate || "",
        birth_time: user.birthTime || "",
        birth_place: user.birthPlace || ""
      }
    })
  }, {
    env,
    fetchImpl: deps.fetch || globalThis.fetch,
    label: "Razorpay Shani order"
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.description || `Razorpay order failed with ${response.status}`);
  }

  const responseAmount = Number(data.amount);
  const responseCurrency = String(data.currency || "").toUpperCase();
  if (responseAmount !== amountPaise || responseCurrency !== currency) {
    throw new Error("Razorpay order response did not match the Shani remedy plan");
  }

  return {
    provider: "razorpay",
    keyId,
    orderId: data.id,
    amount: responseAmount,
    currency: responseCurrency,
    status: data.status,
    userKey,
    planId: plan.id,
    planName: plan.name,
    duration: plan.duration,
    orderToken: signRazorpayOrder({
      orderId: data.id,
      userKey,
      amount: responseAmount,
      currency: responseCurrency,
      planKey
    }, keySecret)
  };
}

export function verifyRazorpayWebhookSignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const actual = String(signature);
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export function verifyRazorpayPaymentSignature({ orderId, paymentId, signature }, secret) {
  if (!orderId || !paymentId || !signature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  const actual = String(signature);
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export async function verifyRazorpayCheckoutPayment({ user = {}, orderId, paymentId, signature, amount, currency = "INR", orderToken }, env = process.env, deps = {}) {
  const expectedAmount = getMoreGuidancePricePaise(env);
  const expectedCurrency = MORE_GUIDANCE_CURRENCY;
  if (Number(amount) !== expectedAmount || String(currency || "").toUpperCase() !== expectedCurrency) {
    const error = new Error("Payment amount does not match the More Guidance plan");
    error.statusCode = 400;
    throw error;
  }

  const verified = verifyRazorpayPaymentSignature({
    orderId,
    paymentId,
    signature
  }, env.RAZORPAY_KEY_SECRET);

  if (!verified) {
    const error = new Error("Payment signature could not be verified");
    error.statusCode = 401;
    throw error;
  }

  const userKey = requirePaymentUserKey(user);
  if (!verifyRazorpayOrderToken({
    orderId,
    userKey,
    amount,
    currency,
    orderToken
  }, env.RAZORPAY_KEY_SECRET)) {
    const error = new Error("Payment order could not be matched to this SoulGuru account");
    error.statusCode = 401;
    throw error;
  }

  const startsAt = new Date();
  const endsAt = addMonths(startsAt, 3);
  const supabase = hasOwn(deps, "supabase") ? deps.supabase : createSupabaseAdmin(env);

  if (!supabase) {
    if (!isLocalPaymentActivationAllowed(env)) {
      const error = new Error("Supabase is required to persist More Guidance payments");
      error.statusCode = 503;
      throw error;
    }

    return {
      verified: true,
      stored: false,
      subscription: buildSubscriptionPayload({
        startsAt,
        endsAt,
        userKey,
        paymentId,
        orderId
      })
    };
  }

  await insertPaymentEvent(supabase, {
    providerEventId: `checkout:${paymentId}`,
    eventName: "checkout.payment.verified",
    payload: {
      provider: "razorpay",
      payment_id: paymentId,
      order_id: orderId,
      user_key: userKey
    }
  });

  const activation = await activateMoreGuidanceSubscription(supabase, {
    user,
    userKey,
    paymentId,
    orderId,
    startsAt,
    endsAt
  });
  const emailResult = activation.created
    ? await sendMembershipConfirmation(user.email, {
      name: user.name,
      endsAt: activation.subscription.endsAt
    }, env)
    : { sent: false, skipped: true, reason: "Membership already active" };

  return {
    verified: true,
    stored: true,
    activated: activation.created,
    subscription: activation.subscription,
    email: emailResult
  };
}

export async function verifyShaniRazorpayCheckoutPayment({
  user = {},
  planId = "3m",
  orderId,
  paymentId,
  signature,
  amount,
  currency = "INR",
  orderToken
}, env = process.env, deps = {}) {
  const plan = getShaniPlan(planId, env);
  const expectedAmount = plan.pricePaise;
  const expectedCurrency = SHANI_CURRENCY;
  if (Number(amount) !== expectedAmount || String(currency || "").toUpperCase() !== expectedCurrency) {
    const error = new Error("Payment amount does not match the Shani remedy plan");
    error.statusCode = 400;
    throw error;
  }

  const verified = verifyRazorpayPaymentSignature({
    orderId,
    paymentId,
    signature
  }, env.RAZORPAY_KEY_SECRET);

  if (!verified) {
    const error = new Error("Payment signature could not be verified");
    error.statusCode = 401;
    throw error;
  }

  const userKey = requirePaymentUserKey(user);
  const planKey = buildShaniPlanKey(plan.id);
  if (!verifyRazorpayOrderToken({
    orderId,
    userKey,
    amount,
    currency,
    orderToken,
    planKey
  }, env.RAZORPAY_KEY_SECRET)) {
    const error = new Error("Payment order could not be matched to this Shani remedy plan");
    error.statusCode = 401;
    throw error;
  }

  const startsAt = new Date();
  const endsAt = getShaniMembershipEndsAt(plan, startsAt, user);
  const supabase = hasOwn(deps, "supabase") ? deps.supabase : createSupabaseAdmin(env);

  if (!supabase) {
    if (!isLocalPaymentActivationAllowed(env)) {
      const error = new Error("Supabase is required to persist Shani remedy payments");
      error.statusCode = 503;
      throw error;
    }

    return {
      verified: true,
      stored: false,
      membership: buildShaniMembershipPayload({
        startsAt,
        endsAt,
        userKey,
        paymentId,
        orderId,
        plan
      })
    };
  }

  await insertPaymentEvent(supabase, {
    providerEventId: `checkout:shani:${paymentId}`,
    eventName: "checkout.shani.verified",
    payload: {
      provider: "razorpay",
      product: SHANI_PRODUCT_KEY,
      plan_id: plan.id,
      payment_id: paymentId,
      order_id: orderId,
      user_key: userKey
    }
  });

  const activation = await activateShaniRemedyMembership(supabase, {
    user,
    userKey,
    paymentId,
    orderId,
    plan,
    startsAt,
    endsAt
  });
  const emailResult = activation.created
    ? await sendShaniMembershipConfirmation(user.email, {
      name: user.name,
      planName: activation.membership.planName,
      endsAt: activation.membership.endsAt
    }, env)
    : { sent: false, skipped: true, reason: "Membership already active" };

  return {
    verified: true,
    stored: true,
    activated: activation.created,
    membership: activation.membership,
    email: emailResult
  };
}

export async function processRazorpayWebhook(rawBody, env = process.env, deps = {}) {
  const payload = JSON.parse(rawBody || "{}");
  const eventName = payload.event || "unknown";
  const payment = payload.payload?.payment?.entity;
  const subscription = payload.payload?.subscription?.entity;
  const notes = payment?.notes || subscription?.notes || {};
  const providerEventId = payload.id || payment?.id || subscription?.id || hashPayload(rawBody);
  const supabase = hasOwn(deps, "supabase") ? deps.supabase : createSupabaseAdmin(env);
  const activationRequest = buildWebhookActivationRequest({ eventName, notes, payment, subscription, env });

  if (!supabase) {
    if (!isLocalPaymentActivationAllowed(env)) {
      const error = new Error("Supabase is required to persist Razorpay webhook events");
      error.statusCode = 503;
      throw error;
    }

    return {
      ok: true,
      stored: false,
      duplicate: false,
      activated: false,
      eventName,
      reason: "Supabase is not configured; local payment mode is enabled"
    };
  }

  const inserted = await insertPaymentEvent(supabase, {
    providerEventId,
    eventName,
    payload
  });

  if (!inserted) {
    if (!activationRequest) {
      return { ok: true, stored: true, duplicate: true, activated: false, eventName };
    }

    const activation = await activateWebhookRequest(supabase, activationRequest);
    const emailResult = await sendActivationConfirmationEmail(activationRequest, activation, env);

    return {
      ok: true,
      stored: true,
      duplicate: true,
      activated: activation.created,
      eventName,
      userKey: activationRequest.userKey,
      ...activation.payload,
      email: emailResult
    };
  }

  if (!activationRequest) {
    return { ok: true, stored: true, duplicate: false, activated: false, eventName };
  }

  const activation = await activateWebhookRequest(supabase, activationRequest);

  const emailResult = await sendActivationConfirmationEmail(activationRequest, activation, env);

  return {
    ok: true,
    stored: true,
    duplicate: false,
    activated: activation.created,
    eventName,
    userKey: activationRequest.userKey,
    ...activation.payload,
    email: emailResult
  };
}

async function activateMoreGuidanceSubscription(supabase, {
  user = {},
  userKey,
  paymentId,
  orderId,
  providerSubscriptionId = null,
  startsAt = new Date(),
  endsAt = addMonths(startsAt, 3)
}) {
  const existing = await findExistingRazorpaySubscription(supabase, { paymentId, providerSubscriptionId });
  if (existing) {
    return {
      created: false,
      subscription: mapSubscription(existing)
    };
  }

  const { data, error } = await supabase
    .from("more_guidance_subscriptions")
    .insert({
      user_key: userKey,
      plan_name: MEMBERSHIP_PLAN_NAME,
      status: "active",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      astro_bonus_questions: 15,
      provider: "razorpay",
      provider_payment_id: paymentId || null,
      provider_subscription_id: providerSubscriptionId || null,
      metadata: {
        order_id: orderId || null,
        email: user.email || null,
        phone: user.phone || null
      }
    })
    .select(SUBSCRIPTION_SELECT)
    .single();

  if (error) {
    if (error.code === "23505") {
      const racedExisting = await findExistingRazorpaySubscription(supabase, { paymentId, providerSubscriptionId });
      if (racedExisting) {
        return {
          created: false,
          subscription: mapSubscription(racedExisting)
        };
      }
    }

    throw new Error(`Unable to activate subscription: ${error.message}`);
  }

  return {
    created: true,
    subscription: mapSubscription(data)
  };
}

async function activateShaniRemedyMembership(supabase, {
  user = {},
  userKey,
  paymentId,
  orderId,
  providerSubscriptionId = null,
  plan,
  startsAt = new Date(),
  endsAt = addMonths(startsAt, 3)
}) {
  const existing = await findExistingShaniRazorpayMembership(supabase, { paymentId, providerSubscriptionId });
  if (existing) {
    return {
      created: false,
      membership: mapShaniMembership(existing)
    };
  }

  const { data, error } = await supabase
    .from("shani_remedy_memberships")
    .insert({
      user_key: userKey,
      plan_id: plan.id,
      plan_name: plan.name,
      status: "active",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      provider: "razorpay",
      provider_payment_id: paymentId || null,
      provider_subscription_id: providerSubscriptionId || null,
      metadata: {
        order_id: orderId || null,
        duration: plan.duration,
        email: user.email || null,
        phone: user.phone || null,
        product: SHANI_PRODUCT_KEY
      }
    })
    .select(SHANI_MEMBERSHIP_SELECT)
    .single();

  if (error) {
    if (error.code === "23505") {
      const racedExisting = await findExistingShaniRazorpayMembership(supabase, { paymentId, providerSubscriptionId });
      if (racedExisting) {
        return {
          created: false,
          membership: mapShaniMembership(racedExisting)
        };
      }
    }

    throw new Error(`Unable to activate Shani remedy membership: ${error.message}`);
  }

  return {
    created: true,
    membership: mapShaniMembership(data)
  };
}

async function findExistingRazorpaySubscription(supabase, { paymentId, providerSubscriptionId }) {
  if (paymentId) {
    const { data, error } = await supabase
      .from("more_guidance_subscriptions")
      .select(SUBSCRIPTION_SELECT)
      .eq("provider", "razorpay")
      .eq("provider_payment_id", paymentId)
      .maybeSingle();

    if (error) {
      throw new Error(`Unable to check existing subscription: ${error.message}`);
    }
    if (data) return data;
  }

  if (providerSubscriptionId) {
    const { data, error } = await supabase
      .from("more_guidance_subscriptions")
      .select(SUBSCRIPTION_SELECT)
      .eq("provider", "razorpay")
      .eq("provider_subscription_id", providerSubscriptionId)
      .maybeSingle();

    if (error) {
      throw new Error(`Unable to check existing subscription: ${error.message}`);
    }
    if (data) return data;
  }

  return null;
}

async function findExistingShaniRazorpayMembership(supabase, { paymentId, providerSubscriptionId }) {
  if (paymentId) {
    const { data, error } = await supabase
      .from("shani_remedy_memberships")
      .select(SHANI_MEMBERSHIP_SELECT)
      .eq("provider", "razorpay")
      .eq("provider_payment_id", paymentId)
      .maybeSingle();

    if (error) {
      throw new Error(`Unable to check existing Shani membership: ${error.message}`);
    }
    if (data) return data;
  }

  if (providerSubscriptionId) {
    const { data, error } = await supabase
      .from("shani_remedy_memberships")
      .select(SHANI_MEMBERSHIP_SELECT)
      .eq("provider", "razorpay")
      .eq("provider_subscription_id", providerSubscriptionId)
      .maybeSingle();

    if (error) {
      throw new Error(`Unable to check existing Shani membership: ${error.message}`);
    }
    if (data) return data;
  }

  return null;
}

function buildSubscriptionPayload({ startsAt, endsAt, userKey, paymentId, orderId }) {
  return {
    active: true,
    name: MEMBERSHIP_PLAN_NAME,
    duration: "3 months",
    astroBonusQuestions: 15,
    startedAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    provider: "razorpay",
    providerPaymentId: paymentId || null,
    metadata: {
      order_id: orderId || null,
      user_key: userKey
    }
  };
}

function buildShaniMembershipPayload({ startsAt, endsAt, userKey, paymentId, orderId, plan }) {
  return {
    active: true,
    planId: plan.id,
    planName: plan.name,
    duration: plan.duration,
    startedAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    provider: "razorpay",
    providerPaymentId: paymentId || null,
    metadata: {
      order_id: orderId || null,
      user_key: userKey,
      product: SHANI_PRODUCT_KEY
    }
  };
}

function mapSubscription(data) {
  return {
    id: data.id,
    active: data.status === "active" && new Date(data.ends_at).getTime() > Date.now(),
    name: data.plan_name,
    duration: "3 months",
    astroBonusQuestions: data.astro_bonus_questions,
    startedAt: data.starts_at,
    endsAt: data.ends_at,
    provider: data.provider,
    providerPaymentId: data.provider_payment_id,
    providerSubscriptionId: data.provider_subscription_id,
    metadata: data.metadata || {}
  };
}

function mapShaniMembership(data) {
  return {
    id: data.id,
    active: data.status === "active" && new Date(data.ends_at).getTime() > Date.now(),
    planId: data.plan_id,
    planName: data.plan_name,
    duration: data.metadata?.duration || data.plan_name,
    status: data.status,
    startedAt: data.starts_at,
    endsAt: data.ends_at,
    provider: data.provider,
    providerPaymentId: data.provider_payment_id,
    providerSubscriptionId: data.provider_subscription_id,
    metadata: data.metadata || {},
    createdAt: data.created_at
  };
}

async function insertPaymentEvent(supabase, { providerEventId, eventName, payload }) {
  const { data: existing, error: readError } = await supabase
    .from("payment_events")
    .select("provider_event_id")
    .eq("provider_event_id", providerEventId)
    .maybeSingle();

  if (readError) {
    throw new Error(`Unable to check payment event: ${readError.message}`);
  }
  if (existing) return false;

  const { error } = await supabase
    .from("payment_events")
    .insert({
      provider: "razorpay",
      provider_event_id: providerEventId,
      event_name: eventName,
      payload
    });

  if (error) {
    if (error.code === "23505") return false;
    throw new Error(`Unable to store payment event: ${error.message}`);
  }

  return true;
}

async function activateWebhookRequest(supabase, request) {
  if (request.type === "shani") {
    const activation = await activateShaniRemedyMembership(supabase, request);
    return {
      created: activation.created,
      membership: activation.membership,
      payload: { membership: activation.membership }
    };
  }

  const activation = await activateMoreGuidanceSubscription(supabase, request);
  return {
    created: activation.created,
    subscription: activation.subscription,
    payload: { subscription: activation.subscription }
  };
}

function buildWebhookActivationRequest({ eventName, notes, payment, subscription, env }) {
  const canActivate = ["payment.captured", "subscription.activated", "subscription.charged"].includes(eventName);
  if (!canActivate) return null;

  if (notes.soulguru_plan === "more_guidance_3m") {
    return buildMoreGuidanceWebhookActivationRequest({ notes, payment, subscription });
  }

  const shaniPlanId = parseShaniPlanId(notes.soulguru_plan || notes.shani_plan_id);
  if (shaniPlanId) {
    return buildShaniWebhookActivationRequest({ notes, payment, subscription, planId: shaniPlanId, env });
  }

  return null;
}

function buildMoreGuidanceWebhookActivationRequest({ notes, payment, subscription }) {
  const user = {
    ...notes,
    email: notes.email || payment?.email || "",
    phone: notes.phone || payment?.contact || "",
    name: notes.name || ""
  };
  const noteUserKey = normalizeUserKey(notes.user_key);
  const userKey = noteUserKey && noteUserKey !== "anonymous"
    ? noteUserKey
    : requirePaymentUserKey(user, "Razorpay webhook is missing a stable SoulGuru user identity");
  const startsAt = new Date();
  const endsAt = addMonths(startsAt, 3);

  return {
    type: "more-guidance",
    user,
    userKey,
    paymentId: payment?.id || null,
    orderId: payment?.order_id || null,
    providerSubscriptionId: subscription?.id || null,
    startsAt,
    endsAt
  };
}

function buildShaniWebhookActivationRequest({ notes, payment, subscription, planId, env }) {
  const user = {
    ...notes,
    email: notes.email || payment?.email || "",
    phone: notes.phone || payment?.contact || "",
    name: notes.name || "",
    birthDate: notes.birth_date || notes.birthDate || "",
    birthTime: notes.birth_time || notes.birthTime || "",
    birthPlace: notes.birth_place || notes.birthPlace || ""
  };
  const noteUserKey = normalizeUserKey(notes.user_key);
  const userKey = noteUserKey && noteUserKey !== "anonymous"
    ? noteUserKey
    : requirePaymentUserKey(user, "Razorpay webhook is missing a stable SoulGuru user identity");
  const plan = getShaniPlan(planId, env);
  const startsAt = new Date();
  const endsAt = getShaniMembershipEndsAt(plan, startsAt, user);

  return {
    type: "shani",
    user,
    userKey,
    paymentId: payment?.id || null,
    orderId: payment?.order_id || null,
    providerSubscriptionId: subscription?.id || null,
    plan,
    startsAt,
    endsAt
  };
}

async function sendMembershipConfirmation(to, details, env) {
  try {
    const email = buildMembershipEmail(details);
    return await sendEmail({
      to,
      subject: email.subject,
      text: email.text,
      html: email.html,
      tags: [{ name: "event", value: "more_guidance_activated" }]
    }, env);
  } catch (error) {
    console.warn("Membership email failed", error.message);
    return { sent: false, degraded: true };
  }
}

async function sendShaniMembershipConfirmation(to, details, env) {
  try {
    const email = buildShaniMembershipEmail(details);
    return await sendEmail({
      to,
      subject: email.subject,
      text: email.text,
      html: email.html,
      tags: [{ name: "event", value: "shani_remedy_activated" }]
    }, env);
  } catch (error) {
    console.warn("Shani membership email failed", error.message);
    return { sent: false, degraded: true };
  }
}

async function sendActivationConfirmationEmail(activationRequest, activation, env) {
  if (!activation.created) {
    return { sent: false, skipped: true, reason: "Membership already active" };
  }

  if (activationRequest.type === "more-guidance") {
    return sendMembershipConfirmation(activationRequest.user.email, {
      name: activationRequest.user.name,
      endsAt: activation.subscription.endsAt
    }, env);
  }

  if (activationRequest.type === "shani") {
    return sendShaniMembershipConfirmation(activationRequest.user.email, {
      name: activationRequest.user.name,
      planName: activation.membership.planName,
      endsAt: activation.membership.endsAt
    }, env);
  }

  return { sent: false, skipped: true, reason: "Unknown membership type" };
}

function buildPaymentUserKey(user) {
  return buildBackendUserKey(user);
}

function requirePaymentUserKey(user, message = "Payment user identity is required") {
  if (!getBackendUserIdentity(user)) {
    throwHttpError(message, 400);
  }
  return buildPaymentUserKey(user);
}

function normalizeUserKey(value) {
  return normalizeBackendUserKey(value);
}

function isLocalPaymentActivationAllowed(env) {
  return String(env.PAYMENTS_ALLOW_LOCAL_ACTIVATION || "false").toLowerCase() === "true";
}

function getMoreGuidancePricePaise(env) {
  return getPositiveIntegerEnv(env, "MORE_GUIDANCE_PRICE_PAISE");
}

function getShaniPlan(planId, env = process.env) {
  const normalizedPlanId = normalizeShaniPlanId(planId);
  const definition = SHANI_PLAN_DEFINITIONS[normalizedPlanId];
  if (!definition) {
    throwHttpError("Unknown Shani remedy plan", 400);
  }

  return {
    ...definition,
    pricePaise: getPositiveIntegerEnv(env, definition.envKey)
  };
}

function getPositiveIntegerEnv(env, key) {
  const raw = String(env[key] || "").trim();
  if (!raw) {
    throw new Error(`${key} must be configured as a positive integer`);
  }
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${key} must be a positive integer`);
  }
  const amount = Number(raw);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error(`${key} must be a positive integer`);
  }
  return amount;
}

function normalizeShaniPlanId(planId) {
  const value = String(planId || "").toLowerCase().trim();
  if (value === "three-months" || value === "3-months" || value === "3months") return "3m";
  if (value === "six-months" || value === "6-months" || value === "6months") return "6m";
  if (value === "year" || value === "one-year" || value === "1-year") return "1y";
  if (value === "remaining" || value === "timeline") return "full";
  return value || "3m";
}

function buildShaniPlanKey(planId) {
  return `${SHANI_PRODUCT_KEY}_${normalizeShaniPlanId(planId)}`;
}

function parseShaniPlanId(value) {
  const normalized = String(value || "").toLowerCase().trim();
  if (!normalized) return "";
  const fromPlanKey = normalized.match(/^shani_remedy_(3m|6m|1y|full)$/)?.[1];
  if (fromPlanKey) return fromPlanKey;
  const planId = normalizeShaniPlanId(normalized);
  return SHANI_PLAN_DEFINITIONS[planId] ? planId : "";
}

function getShaniMembershipEndsAt(plan, startsAt, user = {}) {
  if (!plan.fullTimeline) {
    return addMonths(startsAt, plan.months || 3);
  }

  const fallback = addYears(startsAt, 8);
  try {
    const report = buildShaniReport(user, startsAt);
    const reportEnd = new Date(report.endDate);
    if (Number.isFinite(reportEnd.getTime()) && reportEnd.getTime() > startsAt.getTime()) {
      return reportEnd;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function throwHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function signRazorpayOrder({ orderId, userKey, amount, currency, planKey = "" }, secret) {
  const payload = normalizeOrderTokenPayload({ orderId, userKey, amount, currency, planKey });
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function verifyRazorpayOrderToken({ orderId, userKey, amount, currency, orderToken, planKey = "" }, secret) {
  if (!orderId || !userKey || !amount || !currency || !orderToken || !secret) return false;
  const expected = signRazorpayOrder({ orderId, userKey, amount, currency, planKey }, secret);
  const actual = String(orderToken);
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function normalizeOrderTokenPayload({ orderId, userKey, amount, currency, planKey = "" }) {
  const parts = [
    String(orderId || "").trim(),
    String(userKey || "").toLowerCase().trim(),
    String(Number(amount || 0)),
    String(currency || "INR").toUpperCase().trim()
  ];
  if (planKey) {
    parts.push(String(planKey).toLowerCase().trim());
  }
  return parts.join("|");
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function addYears(date, years) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function hashPayload(rawBody) {
  return crypto.createHash("sha256").update(rawBody || "").digest("hex");
}
