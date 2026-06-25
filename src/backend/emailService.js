import { fetchWithTimeout } from "./fetchWithTimeout.js";

const RESEND_API_URL = "https://api.resend.com/emails";
const MAX_EMAIL_SUBJECT_LENGTH = 160;
const MAX_TAGS = 10;

export async function sendEmail({ to, subject, html, text, tags = [] }, env = process.env, deps = {}) {
  if (!isResendConfigured(env)) {
    return { sent: false, skipped: true, reason: "Resend is not configured" };
  }

  const recipient = normalizeRecipientEmail(to);
  const safeSubject = normalizeEmailSubject(subject);
  if (!recipient || !safeSubject || (!html && !text)) {
    return { sent: false, skipped: true, reason: "Missing or invalid email fields" };
  }

  const fetchImpl = deps.fetch || globalThis.fetch;
  const response = await fetchWithTimeout(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [recipient],
      subject: safeSubject,
      html,
      text,
      tags: normalizeTags(tags)
    })
  }, {
    env,
    fetchImpl,
    label: "Resend email"
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || `Resend request failed with ${response.status}`);
  }

  return { sent: true, id: data.id };
}

export function isResendConfigured(env = process.env) {
  return [
    hasConfiguredValue(env.RESEND_API_KEY),
    hasConfiguredValue(env.RESEND_FROM_EMAIL),
    isValidEmailSender(env.RESEND_FROM_EMAIL)
  ].every(Boolean);
}

export function buildMembershipEmail({ name = "there", endsAt }) {
  const endLabel = endsAt ? new Date(endsAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }) : "the next 3 months";

  return {
    subject: "Your Soul Guru + Astro Solve guidance is active",
    text: `Hi ${name}, your Soul Guru + Astro Solve guidance is active until ${endLabel}. You now have deeper guidance and 15 additional Astro Solves questions.`,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #17323a;">
        <h1 style="font-size: 24px;">Soul Guru + Astro Solve is active</h1>
        <p>Hi ${escapeHtml(name)},</p>
        <p>Your deeper guidance plan is active until <strong>${escapeHtml(endLabel)}</strong>.</p>
        <p>You now have more detailed Soul Guru guidance and 15 additional Astro Solves questions for the moments that need a fuller answer.</p>
      </div>
    `
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeRecipientEmail(value) {
  const normalized = String(value || "").trim();
  if (!normalized || /\r|\n/.test(normalized)) return "";
  const angleMatch = normalized.match(/<([^<>]+)>$/);
  const email = (angleMatch ? angleMatch[1] : normalized).trim().toLowerCase();
  return isValidPlainEmail(email) ? email : "";
}

function normalizeEmailSubject(value) {
  const subject = String(value || "").replace(/\s+/g, " ").trim();
  if (!subject || /\r|\n/.test(String(value || ""))) return "";
  return subject.slice(0, MAX_EMAIL_SUBJECT_LENGTH);
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .slice(0, MAX_TAGS)
    .map((tag) => ({
      name: sanitizeTagPart(tag?.name),
      value: sanitizeTagPart(tag?.value)
    }))
    .filter((tag) => tag.name && tag.value);
}

function sanitizeTagPart(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function hasConfiguredValue(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");

  if (!normalized) return false;
  if (normalized.startsWith("${{") || normalized.startsWith("$")) return false;
  if (/^(true|false|null|undefined)$/i.test(normalized)) return false;
  if (/^(your|replace|change|changeme|placeholder|example|dummy|fake|todo|xxx|xxxx|redacted)(?:[-_\s].*)?$/i.test(normalized)) {
    return false;
  }
  if (/^<[^>]+>$/.test(normalized)) return false;
  if (/^\*+$/.test(normalized)) return false;

  return true;
}

function isValidEmailSender(value) {
  const normalized = String(value || "").trim();
  if (!normalized || /\r|\n/.test(normalized)) return false;
  const angleMatch = normalized.match(/<([^<>]+)>$/);
  const email = angleMatch ? angleMatch[1] : normalized;
  return isValidPlainEmail(email.trim());
}

function isValidPlainEmail(value) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(String(value || "").trim());
}
