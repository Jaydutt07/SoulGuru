import { fetchWithTimeout } from "./fetchWithTimeout.js";

const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendEmail({ to, subject, html, text, tags = [] }, env = process.env, deps = {}) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    return { sent: false, skipped: true };
  }

  if (!to || !subject || (!html && !text)) {
    return { sent: false, skipped: true, reason: "Missing email fields" };
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
      to: [to],
      subject,
      html,
      text,
      tags
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
