import { buildShaniReport } from "./shaniService.js";
import { sendEmail } from "./emailService.js";
import { createSupabaseAdmin } from "./supabaseAdmin.js";
import { buildShaniNotificationContent } from "./shaniRemedyCatalog.js";

const SHANI_MEMBERSHIP_SELECT = [
  "id",
  "user_key",
  "plan_id",
  "plan_name",
  "status",
  "starts_at",
  "ends_at",
  "provider",
  "provider_payment_id",
  "provider_subscription_id",
  "metadata",
  "created_at"
].join(", ");

const SHANI_NOTIFICATION_SELECT = [
  "id",
  "membership_id",
  "user_key",
  "channel",
  "notification_type",
  "remedy_date",
  "status",
  "sent_at",
  "created_at"
].join(", ");

export async function dispatchDueShaniNotifications(payload = {}, env = process.env, deps = {}) {
  const now = deps.now || new Date();
  const schedule = resolveShaniNotificationSchedule({
    now,
    forceType: payload.forceType,
    remedyDate: payload.remedyDate,
    timeZone: payload.timeZone || env.SHANI_NOTIFICATION_TIMEZONE || "Asia/Kolkata"
  });

  if (!schedule.due) {
    return {
      ok: true,
      due: false,
      reason: schedule.reason,
      checkedAt: now.toISOString(),
      timeZone: schedule.timeZone,
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      results: []
    };
  }

  const supabase = hasOwn(deps, "supabase") ? deps.supabase : createSupabaseAdmin(env);
  if (!supabase) {
    throwHttpError("Supabase is required to dispatch Shani remedy notifications", 503);
  }

  const memberships = await readActiveShaniMemberships(supabase, now, Number(payload.limit || env.SHANI_NOTIFICATION_BATCH_LIMIT || 200));
  const results = [];
  for (const row of memberships) {
    results.push(await dispatchMembershipNotification({
      supabase,
      membershipRow: row,
      schedule,
      now,
      env,
      dryRun: Boolean(payload.dryRun),
      sendEmailImpl: deps.sendEmail || sendEmail
    }));
  }

  return {
    ok: true,
    due: true,
    checkedAt: now.toISOString(),
    timeZone: schedule.timeZone,
    notificationType: schedule.notificationType,
    remedyDate: schedule.remedyDate,
    processed: results.length,
    sent: results.filter((item) => item.status === "sent").length,
    skipped: results.filter((item) => item.status === "skipped" || item.status === "duplicate" || item.status === "dry-run").length,
    failed: results.filter((item) => item.status === "failed").length,
    results
  };
}

export function isShaniNotificationRequestAuthorized(req, env = process.env) {
  const secret = String(env.SHANI_NOTIFICATION_CRON_SECRET || env.CRON_SECRET || "").trim();
  const authHeader = Array.isArray(req.headers?.authorization)
    ? req.headers.authorization[0]
    : req.headers?.authorization;

  if (secret) {
    return String(authHeader || "") === `Bearer ${secret}`;
  }

  return String(env.SHANI_NOTIFICATIONS_ALLOW_LOCAL || "false").toLowerCase() === "true";
}

export function resolveShaniNotificationSchedule({
  now = new Date(),
  forceType = "",
  remedyDate = "",
  timeZone = "Asia/Kolkata"
} = {}) {
  const current = parseDate(now);
  const local = getZonedDateParts(current, timeZone);
  const forced = normalizeNotificationType(forceType);
  if (forced) {
    const target = remedyDate || (forced === "friday_preview" ? addDaysToDateKey(local.dateKey, 1) : local.dateKey);
    return {
      due: true,
      notificationType: forced,
      remedyDate: target,
      localDate: local.dateKey,
      weekday: local.weekday,
      timeZone,
      forced: true
    };
  }

  if (local.weekday === "Fri") {
    return {
      due: true,
      notificationType: "friday_preview",
      remedyDate: addDaysToDateKey(local.dateKey, 1),
      localDate: local.dateKey,
      weekday: local.weekday,
      timeZone,
      forced: false
    };
  }

  if (local.weekday === "Sat") {
    return {
      due: true,
      notificationType: "saturday_reminder",
      remedyDate: local.dateKey,
      localDate: local.dateKey,
      weekday: local.weekday,
      timeZone,
      forced: false
    };
  }

  return {
    due: false,
    reason: `No Shani notification is due on ${local.weekday}.`,
    localDate: local.dateKey,
    weekday: local.weekday,
    timeZone,
    forced: false
  };
}

async function dispatchMembershipNotification({
  supabase,
  membershipRow,
  schedule,
  now,
  env,
  dryRun,
  sendEmailImpl
}) {
  const membership = mapShaniMembership(membershipRow, now);
  const existing = await readExistingNotification(supabase, {
    membershipId: membership.id,
    notificationType: schedule.notificationType,
    remedyDate: schedule.remedyDate,
    channel: "email"
  });

  if (existing) {
    return {
      membershipId: membership.id,
      userKey: membership.userKey,
      status: "duplicate",
      notificationId: existing.id,
      notificationType: schedule.notificationType,
      remedyDate: schedule.remedyDate
    };
  }

  const user = buildNotificationUser(membershipRow);
  const report = buildShaniReport(user, now);
  const content = buildShaniNotificationContent({
    notificationType: schedule.notificationType,
    remedyDate: schedule.remedyDate,
    report,
    membership,
    now
  });
  const recipient = String(user.email || "").trim();

  if (dryRun) {
    return {
      membershipId: membership.id,
      userKey: membership.userKey,
      status: "dry-run",
      notificationType: schedule.notificationType,
      remedyDate: schedule.remedyDate,
      title: content.title
    };
  }

  if (!recipient) {
    return await storeNotificationResult(supabase, {
      membership,
      user,
      content,
      channel: "email",
      status: "skipped",
      sentAt: null,
      error: "Missing recipient email"
    });
  }

  let delivery;
  let status = "sent";
  let sentAt = new Date();
  let error = "";
  try {
    delivery = await sendEmailImpl({
      to: recipient,
      subject: content.title,
      text: buildNotificationTextEmail(user, content),
      html: buildNotificationHtmlEmail(user, content),
      tags: [
        { name: "event", value: `shani_${content.type}` },
        { name: "plan", value: content.plan.id }
      ]
    }, env);

    if (!delivery?.sent) {
      status = "skipped";
      sentAt = null;
      error = delivery?.reason || "Email provider skipped delivery";
    }
  } catch (caughtError) {
    status = "failed";
    sentAt = null;
    error = caughtError.message || "Email delivery failed";
  }

  return await storeNotificationResult(supabase, {
    membership,
    user,
    content,
    channel: "email",
    status,
    sentAt,
    error,
    delivery
  });
}

async function readActiveShaniMemberships(supabase, now, limit) {
  const { data, error } = await supabase
    .from("shani_remedy_memberships")
    .select(SHANI_MEMBERSHIP_SELECT)
    .eq("status", "active")
    .gt("ends_at", parseDate(now).toISOString())
    .order("ends_at", { ascending: true })
    .limit(Math.max(1, Math.min(Number(limit) || 200, 500)));

  if (error) {
    throwHttpError(`Unable to read active Shani memberships: ${error.message}`, 503);
  }

  return data || [];
}

async function readExistingNotification(supabase, { membershipId, notificationType, remedyDate, channel }) {
  const { data, error } = await supabase
    .from("shani_remedy_notifications")
    .select(SHANI_NOTIFICATION_SELECT)
    .eq("membership_id", membershipId)
    .eq("notification_type", notificationType)
    .eq("remedy_date", remedyDate)
    .eq("channel", channel)
    .maybeSingle();

  if (error) {
    throwHttpError(`Unable to check Shani notification history: ${error.message}`, 503);
  }

  return data || null;
}

async function storeNotificationResult(supabase, {
  membership,
  user,
  content,
  channel,
  status,
  sentAt,
  error,
  delivery
}) {
  const payload = {
    membership_id: membership.id,
    user_key: membership.userKey,
    channel,
    notification_type: content.type,
    remedy_date: content.remedyDate,
    title: content.title,
    body: content.body,
    payload: {
      plan: content.plan,
      rashi: content.rashi,
      saturday: content.saturday,
      email: user.email || null,
      provider: delivery?.id ? { id: delivery.id } : null
    },
    status,
    sent_at: sentAt ? parseDate(sentAt).toISOString() : null,
    error: error || null
  };
  const { data, error: insertError } = await supabase
    .from("shani_remedy_notifications")
    .insert(payload)
    .select(SHANI_NOTIFICATION_SELECT)
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return {
        membershipId: membership.id,
        userKey: membership.userKey,
        status: "duplicate",
        notificationType: content.type,
        remedyDate: content.remedyDate
      };
    }
    throwHttpError(`Unable to store Shani notification: ${insertError.message}`, 503);
  }

  return {
    membershipId: membership.id,
    userKey: membership.userKey,
    status,
    notificationId: data?.id || null,
    notificationType: content.type,
    remedyDate: content.remedyDate,
    title: content.title
  };
}

function mapShaniMembership(data, now) {
  const endsAt = data.ends_at || "";
  return {
    id: data.id,
    userKey: data.user_key,
    active: data.status === "active" && new Date(endsAt).getTime() > parseDate(now).getTime(),
    planId: data.plan_id,
    planName: data.plan_name,
    status: data.status,
    startedAt: data.starts_at,
    endsAt,
    provider: data.provider,
    providerPaymentId: data.provider_payment_id,
    providerSubscriptionId: data.provider_subscription_id,
    metadata: data.metadata || {},
    createdAt: data.created_at
  };
}

function buildNotificationUser(row = {}) {
  const metadata = row.metadata || {};
  return {
    id: metadata.user_id || row.user_key,
    name: metadata.name || "there",
    phone: metadata.phone || "",
    email: metadata.email || "",
    birthDate: metadata.birth_date || metadata.birthDate || "",
    birthTime: metadata.birth_time || metadata.birthTime || "",
    birthPlace: metadata.birth_place || metadata.birthPlace || "",
    birthLatitude: metadata.birth_latitude ?? metadata.birthLatitude,
    birthLongitude: metadata.birth_longitude ?? metadata.birthLongitude,
    birthTimezone: metadata.birth_timezone || metadata.birthTimezone || "",
    birthTimezoneOffsetMinutes: metadata.birth_timezone_offset_minutes ?? metadata.birthTimezoneOffsetMinutes,
    birthPlaceResolvedLabel: metadata.birth_place_resolved_label || metadata.birthPlaceResolvedLabel || "",
    birthPlaceResolutionSource: metadata.birth_place_resolution_source || metadata.birthPlaceResolutionSource || "",
    vedicMoonSignOverride: metadata.vedic_moon_sign_override || metadata.vedicMoonSignOverride || ""
  };
}

function buildNotificationTextEmail(user, content) {
  const name = firstName(user.name);
  return [
    `Namaste ${name},`,
    "",
    content.body,
    "",
    "Keep this as guidance for discipline and devotion, not fear. If any health, legal, or safety issue is involved, use qualified local support along with spiritual practice."
  ].join("\n");
}

function buildNotificationHtmlEmail(user, content) {
  const lines = content.body.split("\n").filter(Boolean);
  return `
    <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #17323a;">
      <h1 style="font-size: 22px;">${escapeHtml(content.title)}</h1>
      <p>Namaste ${escapeHtml(firstName(user.name))},</p>
      ${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
      <p style="font-size: 13px; color: #5d7378;">Keep this as guidance for discipline and devotion, not fear. If any health, legal, or safety issue is involved, use qualified local support along with spiritual practice.</p>
    </div>
  `;
}

function normalizeNotificationType(value) {
  const normalized = String(value || "").toLowerCase().trim();
  if (["friday", "friday-preview", "friday_preview", "preview"].includes(normalized)) return "friday_preview";
  if (["saturday", "saturday-reminder", "saturday_reminder", "reminder"].includes(normalized)) return "saturday_reminder";
  return "";
}

function getZonedDateParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(parseDate(date));
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return {
    weekday: get("weekday"),
    dateKey: `${get("year")}-${get("month")}-${get("day")}`
  };
}

function addDaysToDateKey(dateKey, days) {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);
  const date = new Date(Date.UTC(year || 1970, (month || 1) - 1, day || 1));
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function parseDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : new Date();
}

function firstName(name) {
  return String(name || "there").trim().split(/\s+/)[0] || "there";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function throwHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}
