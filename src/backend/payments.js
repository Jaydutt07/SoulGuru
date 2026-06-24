import crypto from "node:crypto";
import { buildMembershipEmail, sendEmail } from "./emailService.js";
import { createSupabaseAdmin } from "./supabaseAdmin.js";

const RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders";
const MEMBERSHIP_PLAN_NAME = "Soul Guru + Astro Solve";

export async function createRazorpayOrder({ user = {}, amount, currency = "INR" }, env = process.env) {
  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys are not configured");
  }

  const amountPaise = Number(amount || env.MORE_GUIDANCE_PRICE_PAISE || 49900);
  const userKey = buildPaymentUserKey(user);
  const response = await fetch(RAZORPAY_ORDERS_URL, {
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
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.description || `Razorpay order failed with ${response.status}`);
  }

  return {
    provider: "razorpay",
    keyId,
    orderId: data.id,
    amount: data.amount,
    currency: data.currency,
    status: data.status,
    userKey,
    orderToken: signRazorpayOrder({
      orderId: data.id,
      userKey,
      amount: data.amount,
      currency: data.currency
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

export async function verifyRazorpayCheckoutPayment({ user = {}, orderId, paymentId, signature, amount, currency = "INR", orderToken }, env = process.env) {
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

  const userKey = buildPaymentUserKey(user);
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
  const supabase = createSupabaseAdmin(env);

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

  return {
    verified: true,
    stored: true,
    activated: activation.created,
    subscription: activation.subscription
  };
}

export async function processRazorpayWebhook(rawBody, env = process.env) {
  const payload = JSON.parse(rawBody || "{}");
  const eventName = payload.event || "unknown";
  const payment = payload.payload?.payment?.entity;
  const subscription = payload.payload?.subscription?.entity;
  const notes = payment?.notes || subscription?.notes || {};
  const providerEventId = payload.id || payment?.id || subscription?.id || hashPayload(rawBody);
  const supabase = createSupabaseAdmin(env);

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
    return { ok: true, stored: true, duplicate: true, activated: false, eventName };
  }

  const shouldActivate = ["payment.captured", "subscription.activated", "subscription.charged"].includes(eventName)
    && notes.soulguru_plan === "more_guidance_3m";

  if (!shouldActivate) {
    return { ok: true, stored: true, duplicate: false, activated: false, eventName };
  }

  const userKey = notes.user_key || buildPaymentUserKey(notes);
  const startsAt = new Date();
  const endsAt = addMonths(startsAt, 3);
  const activation = await activateMoreGuidanceSubscription(supabase, {
    user: {
      ...notes,
      email: notes.email || payment?.email,
      phone: notes.phone || payment?.contact
    },
    userKey,
    paymentId: payment?.id || null,
    orderId: payment?.order_id || null,
    providerSubscriptionId: subscription?.id || null,
    startsAt,
    endsAt
  });

  const email = notes.email || payment?.email;
  const emailResult = activation.created
    ? await sendMembershipConfirmation(email, {
      name: notes.name,
      endsAt: activation.subscription.endsAt
    }, env)
    : { sent: false, skipped: true, reason: "Subscription already active" };

  return {
    ok: true,
    stored: true,
    duplicate: false,
    activated: activation.created,
    eventName,
    userKey,
    subscription: activation.subscription,
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
  if (paymentId) {
    const { data: existing, error: readError } = await supabase
      .from("more_guidance_subscriptions")
      .select("id, plan_name, status, starts_at, ends_at, astro_bonus_questions, provider, provider_payment_id, provider_subscription_id, metadata")
      .eq("provider", "razorpay")
      .eq("provider_payment_id", paymentId)
      .maybeSingle();

    if (readError) {
      throw new Error(`Unable to check existing subscription: ${readError.message}`);
    }
    if (existing) {
      return {
        created: false,
        subscription: mapSubscription(existing)
      };
    }
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
    .select("id, plan_name, status, starts_at, ends_at, astro_bonus_questions, provider, provider_payment_id, provider_subscription_id, metadata")
    .single();

  if (error) {
    throw new Error(`Unable to activate subscription: ${error.message}`);
  }

  return {
    created: true,
    subscription: mapSubscription(data)
  };
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

function buildPaymentUserKey(user) {
  return String(user.authUserId || user.id || user.phone || user.email || "anonymous").toLowerCase().trim();
}

function isLocalPaymentActivationAllowed(env) {
  return String(env.PAYMENTS_ALLOW_LOCAL_ACTIVATION || "false").toLowerCase() === "true";
}

function signRazorpayOrder({ orderId, userKey, amount, currency }, secret) {
  const payload = normalizeOrderTokenPayload({ orderId, userKey, amount, currency });
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function verifyRazorpayOrderToken({ orderId, userKey, amount, currency, orderToken }, secret) {
  if (!orderId || !userKey || !amount || !currency || !orderToken || !secret) return false;
  const expected = signRazorpayOrder({ orderId, userKey, amount, currency }, secret);
  const actual = String(orderToken);
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function normalizeOrderTokenPayload({ orderId, userKey, amount, currency }) {
  return [
    String(orderId || "").trim(),
    String(userKey || "").toLowerCase().trim(),
    String(Number(amount || 0)),
    String(currency || "INR").toUpperCase().trim()
  ].join("|");
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function hashPayload(rawBody) {
  return crypto.createHash("sha256").update(rawBody || "").digest("hex");
}
