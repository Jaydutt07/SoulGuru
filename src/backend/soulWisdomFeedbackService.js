import crypto from "node:crypto";
import { SOUL_WISDOM_PROMPT_VERSION } from "../soulWisdomVersion.js";
import { upsertUserProfileId } from "./profileService.js";
import { createSupabaseAdmin } from "./supabaseAdmin.js";
import { buildBackendUserKey } from "./userIdentity.js";

const VALID_FEEDBACK_RATINGS = new Set(["accurate", "missed"]);
const MAX_REASON_CHARS = 180;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function submitSoulWisdomFeedback(payload, env = process.env, deps = {}) {
  const user = payload.user || {};
  const feedback = normalizeSoulWisdomFeedback(payload);
  const userKey = buildBackendUserKey(user);
  const supabase = hasOwn(deps, "supabase") ? deps.supabase : createSupabaseAdmin(env);
  const upsertProfileId = deps.upsertUserProfileId || upsertUserProfileId;

  if (!supabase) {
    return {
      configured: false,
      stored: false,
      feedback: {
        rating: feedback.rating,
        readingDate: feedback.readingDate,
        promptVersion: feedback.promptVersion
      }
    };
  }

  const userProfileId = await upsertProfileId(supabase, user, {
    warnLabel: "Unable to upsert Soul Guru feedback user profile"
  });
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("soul_wisdom_feedback")
    .upsert({
      user_profile_id: userProfileId,
      user_key: userKey,
      daily_reading_id: feedback.dailyReadingId,
      reading_date: feedback.readingDate,
      prompt_version: feedback.promptVersion,
      reading_hash: feedback.readingHash,
      rating: feedback.rating,
      reason: feedback.reason || null,
      metadata: {
        source: "words-of-wisdom",
        submitted_at: now
      },
      updated_at: now
    }, {
      onConflict: "user_key,reading_date,prompt_version"
    })
    .select("id, rating, reason, reading_date, prompt_version, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(`Unable to save Soul Guru feedback: ${error.message}`);
  }

  return {
    configured: true,
    stored: true,
    feedback: mapFeedbackRow(data)
  };
}

export function normalizeSoulWisdomFeedback(payload = {}) {
  const rating = String(payload.rating || "").toLowerCase().trim();
  if (!VALID_FEEDBACK_RATINGS.has(rating)) {
    throwHttpError("Feedback rating must be accurate or missed", 400);
  }

  const readingDate = normalizeDate(payload.readingDate || payload.date);
  const promptVersion = normalizePromptVersion(payload.promptVersion);
  const dailyReadingId = normalizeUuid(payload.dailyReadingId || payload.readingId);
  const wisdom = payload.wisdom || payload.reading?.wisdom || "";
  const readingHash = buildReadingHash({
    wisdom,
    readingDate,
    promptVersion,
    dailyReadingId
  });

  return {
    rating,
    readingDate,
    promptVersion,
    dailyReadingId,
    readingHash,
    reason: normalizeReason(payload.reason)
  };
}

function mapFeedbackRow(row) {
  return {
    id: row?.id || "",
    rating: row?.rating || "",
    reason: row?.reason || "",
    readingDate: row?.reading_date || "",
    promptVersion: row?.prompt_version || "",
    createdAt: row?.created_at || "",
    updatedAt: row?.updated_at || ""
  };
}

function buildReadingHash({ wisdom, readingDate, promptVersion, dailyReadingId }) {
  const source = [
    dailyReadingId,
    promptVersion,
    readingDate,
    String(wisdom || "").replace(/\s+/g, " ").trim()
  ].filter(Boolean).join("|");
  const digest = crypto
    .createHash("sha256")
    .update(source || `${promptVersion}|${readingDate}`)
    .digest("hex")
    .slice(0, 32);
  return `swr_${digest}`;
}

function normalizeDate(value) {
  const date = String(value || new Date().toISOString().slice(0, 10)).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throwHttpError("Reading date must be YYYY-MM-DD", 400);
  }
  return date;
}

function normalizePromptVersion(value) {
  const promptVersion = String(value || SOUL_WISDOM_PROMPT_VERSION).trim();
  if (!/^soul-wisdom-v\d+$/i.test(promptVersion)) {
    throwHttpError("Soul Guru prompt version is invalid", 400);
  }
  return promptVersion;
}

function normalizeUuid(value) {
  const id = String(value || "").trim();
  return UUID_PATTERN.test(id) ? id : null;
}

function normalizeReason(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_REASON_CHARS);
}

function throwHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}
