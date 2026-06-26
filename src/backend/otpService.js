import { createHmac, randomInt } from "node:crypto";
import { isResendConfigured, sendEmail } from "./emailService.js";
import { fetchWithTimeout } from "./fetchWithTimeout.js";
import { createSupabaseAdmin } from "./supabaseAdmin.js";

const DEFAULT_EXPIRY_MINUTES = 10;
const DEFAULT_MAX_ATTEMPTS = 5;
const MIN_OTP_HASH_SECRET_LENGTH = 32;
const MIN_SMS_WEBHOOK_TOKEN_LENGTH = 16;

export async function requestOtp(payload, env = process.env, deps = {}) {
  const phone = normalizePhone(payload.phone || payload.user?.phone);
  const email = normalizeEmail(payload.email || payload.user?.email);
  const purpose = String(payload.purpose || "login").trim() || "login";
  const supabase = hasOwn(deps, "supabase") ? deps.supabase : createSupabaseAdmin(env);
  const createCode = deps.createOtpCode || createOtpCode;
  const deliver = deps.deliverOtp || deliverOtp;

  if (!isValidPhone(phone)) {
    throw createHttpError("A valid phone number is required", 400);
  }

  const code = createCode();
  const expiresAt = new Date(Date.now() + getExpiryMinutes(env) * 60 * 1000).toISOString();

  if (!supabase) {
    return {
      configured: false,
      challengeId: null,
      expiresAt,
      delivery: { sent: false, channel: "local-demo" },
      demoCode: code
    };
  }

  assertOtpHashSecret(env);
  assertOtpDeliveryConfigured({ email }, env);

  const { data, error } = await supabase
    .from("auth_otp_challenges")
    .insert({
      phone,
      email: email || null,
      purpose,
      code_hash: hashOtp({ phone, code }, env),
      delivery_channel: "pending",
      expires_at: expiresAt,
      metadata: {
        deliveryPending: true
      }
    })
    .select("id, expires_at, delivery_channel")
    .single();

  if (error) {
    throw new Error(`Unable to create OTP challenge: ${error.message}`);
  }

  const delivery = await deliver({ phone, email, code, purpose }, env);
  const { error: deliveryUpdateError } = await supabase
    .from("auth_otp_challenges")
    .update({
      delivery_channel: delivery.channel || "demo",
      metadata: {
        deliveryId: delivery.id || null,
        deliverySkipped: Boolean(delivery.skipped)
      }
    })
    .eq("id", data.id);

  if (deliveryUpdateError) {
    console.warn("Unable to update OTP delivery metadata", deliveryUpdateError.message);
  }

  return {
    configured: true,
    challengeId: data.id,
    expiresAt: data.expires_at,
    delivery,
    demoCode: shouldExposeDemoCode(env) ? code : undefined
  };
}

export async function verifyOtp(payload, env = process.env, deps = {}) {
  const supabase = hasOwn(deps, "supabase") ? deps.supabase : createSupabaseAdmin(env);
  if (!supabase) {
    return {
      configured: false,
      verified: false
    };
  }

  assertOtpHashSecret(env);

  const challengeId = String(payload.challengeId || "").trim();
  const phone = normalizePhone(payload.phone || payload.user?.phone);
  const code = String(payload.code || "").replace(/\D/g, "");

  if (!challengeId || !isValidPhone(phone) || code.length !== 6) {
    throw createHttpError("A valid OTP challenge and code are required", 400);
  }

  const { data, error } = await supabase
    .from("auth_otp_challenges")
    .select("id, phone, code_hash, expires_at, verified_at, attempts")
    .eq("id", challengeId)
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to verify OTP: ${error.message}`);
  }

  if (!data) {
    throw createHttpError("OTP could not be verified", 401);
  }
  if (data.verified_at) {
    throw createHttpError("OTP has already been used", 409);
  }
  if (new Date(data.expires_at).getTime() < Date.now()) {
    throw createHttpError("OTP has expired", 410);
  }
  if (Number(data.attempts || 0) >= getMaxAttempts(env)) {
    throw createHttpError("Too many OTP attempts", 429);
  }

  const expectedHash = hashOtp({ phone, code }, env);
  if (expectedHash !== data.code_hash) {
    await supabase
      .from("auth_otp_challenges")
      .update({ attempts: Number(data.attempts || 0) + 1 })
      .eq("id", challengeId);
    throw createHttpError("OTP did not match", 401);
  }

  const verifiedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("auth_otp_challenges")
    .update({
      attempts: Number(data.attempts || 0) + 1,
      verified_at: verifiedAt
    })
    .eq("id", challengeId);

  if (updateError) {
    throw new Error(`Unable to mark OTP verified: ${updateError.message}`);
  }

  return {
    configured: true,
    verified: true,
    verifiedAt
  };
}

async function deliverOtp({ phone, email, code, purpose }, env) {
  const smsWebhookUrl = getSmsWebhookUrl(env);
  if (smsWebhookUrl) {
    return sendSmsWebhook({ phone, code, purpose }, env, smsWebhookUrl);
  }

  if (email && isResendConfigured(env)) {
    const emailPayload = buildOtpEmail({ code, purpose, expiryMinutes: getExpiryMinutes(env) });
    const result = await sendEmail({
      to: email,
      ...emailPayload,
      tags: [{ name: "category", value: "otp" }]
    }, env);
    return {
      ...result,
      channel: "email"
    };
  }

  if (shouldExposeDemoCode(env)) {
    return {
      sent: false,
      skipped: true,
      channel: "demo"
    };
  }

  throw createHttpError("OTP delivery is not configured", 500);
}

async function sendSmsWebhook({ phone, code, purpose }, env, smsWebhookUrl = getSmsWebhookUrl(env)) {
  const message = `Your SoulGuru OTP is ${code}. It expires in ${getExpiryMinutes(env)} minutes.`;
  const smsWebhookToken = getSmsWebhookToken(env);
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${smsWebhookToken}`
  };

  const response = await fetchWithTimeout(smsWebhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      to: phone,
      code,
      message,
      purpose
    })
  }, {
    env,
    label: "OTP SMS webhook"
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || `OTP SMS webhook failed with ${response.status}`);
  }

  return {
    sent: true,
    channel: "sms-webhook",
    id: data.id || data.messageId || null
  };
}

function buildOtpEmail({ code, purpose, expiryMinutes }) {
  const text = `Your SoulGuru OTP is ${code}. It expires in ${expiryMinutes} minutes.`;
  return {
    subject: purpose === "create" ? "Verify your SoulGuru account" : "Your SoulGuru login OTP",
    text,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #17323a;">
        <h1 style="font-size: 24px;">Your SoulGuru OTP</h1>
        <p>Use this code to continue:</p>
        <p style="font-size: 28px; letter-spacing: 6px; font-weight: 700;">${code}</p>
        <p>This code expires soon. If you did not request it, you can ignore this email.</p>
      </div>
    `
  };
}

function hashOtp({ phone, code }, env) {
  return createHmac("sha256", getOtpHashSecret(env))
    .update(`${normalizePhone(phone)}.${code}`)
    .digest("hex");
}

function assertOtpHashSecret(env) {
  getOtpHashSecret(env);
}

function getOtpHashSecret(env) {
  const secret = String(env.OTP_HASH_SECRET || "").trim();
  if (isPlaceholderSecret(secret) || secret.length < MIN_OTP_HASH_SECRET_LENGTH) {
    throw createHttpError(`OTP_HASH_SECRET must be a real secret at least ${MIN_OTP_HASH_SECRET_LENGTH} characters long`, 500);
  }
  return secret;
}

function assertOtpDeliveryConfigured({ email }, env) {
  if (getSmsWebhookUrl(env)) {
    getSmsWebhookToken(env);
    return;
  }

  if (email && isResendConfigured(env)) {
    return;
  }

  if (shouldExposeDemoCode(env)) {
    return;
  }

  throw createHttpError("OTP delivery is not configured", 500);
}

function getSmsWebhookUrl(env) {
  const url = String(env.OTP_SMS_WEBHOOK_URL || "").trim();
  if (isPlaceholderSecret(url)) return "";
  if (!isSafeHttpsUrl(url)) {
    throw createHttpError("OTP_SMS_WEBHOOK_URL must be a real HTTPS provider URL", 500);
  }
  return url;
}

function getSmsWebhookToken(env) {
  const token = String(env.OTP_SMS_WEBHOOK_TOKEN || "").trim();
  if (isPlaceholderSecret(token)) {
    throw createHttpError("OTP_SMS_WEBHOOK_TOKEN must be configured for SMS OTP delivery", 500);
  }
  if (token.length < MIN_SMS_WEBHOOK_TOKEN_LENGTH) {
    throw createHttpError(`OTP_SMS_WEBHOOK_TOKEN must be at least ${MIN_SMS_WEBHOOK_TOKEN_LENGTH} characters`, 500);
  }
  return token;
}

function isPlaceholderSecret(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");

  if (!normalized) return true;
  if (normalized.startsWith("${{") || normalized.startsWith("$")) return true;
  if (/^(true|false|null|undefined)$/i.test(normalized)) return true;
  if (/^(your|replace|change|changeme|placeholder|example|dummy|fake|todo|xxx|xxxx|redacted)(?:[-_\s].*)?$/i.test(normalized)) {
    return true;
  }
  if (/^<[^>]+>$/.test(normalized)) return true;
  if (/^\*+$/.test(normalized)) return true;

  return false;
}

function isSafeHttpsUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "https:" || !url.hostname) return false;
    if (url.hostname === "localhost" || url.hostname.endsWith(".localhost")) return false;
    return true;
  } catch {
    return false;
  }
}

function createOtpCode() {
  return String(randomInt(100000, 1000000));
}

function shouldExposeDemoCode(env) {
  return String(env.OTP_DEMO_ENABLED || "false").toLowerCase() === "true";
}

function getExpiryMinutes(env) {
  return Math.max(1, Number(env.OTP_EXPIRY_MINUTES || DEFAULT_EXPIRY_MINUTES));
}

function getMaxAttempts(env) {
  return Math.max(1, Number(env.OTP_MAX_ATTEMPTS || DEFAULT_MAX_ATTEMPTS));
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidPhone(phone) {
  return normalizePhone(phone).replace(/\D/g, "").length >= 8;
}

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}
