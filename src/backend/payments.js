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
    userKey
  };
}

export function verifyRazorpayWebhookSignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const actual = String(signature);
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
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
    return {
      ok: true,
      stored: false,
      duplicate: false,
      activated: false,
      eventName,
      reason: "Supabase is not configured"
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

  const startsAt = new Date();
  const endsAt = addMonths(startsAt, 3);
  const userKey = notes.user_key || buildPaymentUserKey(notes);
  const { error } = await supabase
    .from("more_guidance_subscriptions")
    .insert({
      user_key: userKey,
      plan_name: MEMBERSHIP_PLAN_NAME,
      status: "active",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      astro_bonus_questions: 15,
      provider: "razorpay",
      provider_payment_id: payment?.id || null,
      provider_subscription_id: subscription?.id || null,
      metadata: {
        order_id: payment?.order_id || null,
        email: notes.email || payment?.email || null,
        phone: notes.phone || payment?.contact || null
      }
    });

  if (error) {
    throw new Error(`Unable to activate subscription: ${error.message}`);
  }

  const email = notes.email || payment?.email;
  const emailResult = await sendMembershipConfirmation(email, {
    name: notes.name,
    endsAt: endsAt.toISOString()
  }, env);

  return {
    ok: true,
    stored: true,
    duplicate: false,
    activated: true,
    eventName,
    userKey,
    email: emailResult
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

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function hashPayload(rawBody) {
  return crypto.createHash("sha256").update(rawBody || "").digest("hex");
}
