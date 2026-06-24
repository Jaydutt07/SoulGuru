import OpenAI from "openai";
import { getSaadeSatiFromChart } from "../astrologyEngine.js";
import { upsertUserProfileId } from "./profileService.js";
import { createSupabaseAdmin } from "./supabaseAdmin.js";

export const SHANI_PANDIT_PROMPT_VERSION = "shani-pandit-v1";

const SHANI_PANDIT_SYSTEM_PROMPT = `
You are SoulGuru's Shani remedy guide for paid members.

Use the supplied Saade Sati report and user question. You may mention Shani, Saade Sati, phase, discipline, remedy, and prayer because this tab is explicitly about Shani. Never create fear, certainty, threats, or guaranteed outcomes.

Output valid JSON only:
{
  "text": "65 to 105 words",
  "practice": "18 to 40 words",
  "caution": "12 to 28 words"
}

Rules:
- Address the user by first name at most once.
- Make the answer feel personal: connect the phase, the user's question, one likely pressure, and one practical remedy.
- Keep a priestly mentor tone: calm, grounded, devotional, direct, and emotionally clean.
- Avoid generic filler, markdown, bullets, emojis, medical/legal/financial claims, and anything outside JSON.
`.trim();

const SHANI_MEMBERSHIP_SELECT = [
  "id",
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

export async function getShaniDashboard(payload, env = process.env, deps = {}) {
  const user = payload.user || {};
  const userKey = buildUserKey(user);
  const now = deps.now || new Date();
  const report = payload.report || buildShaniReport(user, now);
  const supabase = hasOwn(deps, "supabase") ? deps.supabase : createSupabaseAdmin(env);

  if (!supabase) {
    return {
      configured: false,
      report,
      membership: null,
      remedyMap: null,
      panditHistory: []
    };
  }

  const membership = await readActiveShaniMembership(supabase, userKey, now);
  const remedyMap = membership?.active
    ? buildShaniRemedyMap({ user, report, membership, now })
    : null;
  const panditHistory = membership?.active
    ? await readPanditHistory(supabase, userKey, Number(payload.limit || 8))
    : [];

  return {
    configured: true,
    report,
    membership,
    remedyMap,
    panditHistory
  };
}

export async function createPanditGuidance(payload, env = process.env, deps = {}) {
  const user = payload.user || {};
  const userKey = buildUserKey(user);
  const question = sanitizeQuestion(payload.question);
  const now = deps.now || new Date();
  const report = payload.report || buildShaniReport(user, now);
  const model = env.SHANI_PANDIT_MODEL || env.OPENAI_MODEL || "gpt-5.5";
  const supabase = hasOwn(deps, "supabase") ? deps.supabase : createSupabaseAdmin(env);
  const createOpenAIClient = deps.createOpenAIClient || ((apiKey) => new OpenAI({ apiKey }));

  if (!question) {
    throwHttpError("A Shani question is required", 400);
  }

  if (!supabase && !isLocalShaniAccessAllowed(env)) {
    throwHttpError(
      "Supabase is required to verify Shani remedy membership. Set SHANI_ALLOW_LOCAL_ACCESS=true only for isolated local testing.",
      503
    );
  }

  const membership = supabase
    ? await readActiveShaniMembership(supabase, userKey, now)
    : normalizeLocalMembership(payload.membership);

  if (!membership?.active) {
    return {
      allowed: false,
      error: "Shani remedy membership is required"
    };
  }

  const fallback = buildFallbackPanditAnswer({ user, question, report });
  let answer = fallback;
  let source = "local-fallback";
  const openAiDisabled = String(env.SHANI_PANDIT_DISABLE_OPENAI || "false").toLowerCase() === "true";

  if (env.OPENAI_API_KEY && !openAiDisabled) {
    const client = createOpenAIClient(env.OPENAI_API_KEY);
    const response = await client.responses.create({
      model,
      instructions: SHANI_PANDIT_SYSTEM_PROMPT,
      input: buildPanditInput({ user, question, report, membership })
    });
    answer = normalizePanditAnswer(response.output_text, fallback);
    source = "openai";
  }

  const result = {
    allowed: true,
    answer,
    report,
    membership,
    source,
    model,
    promptVersion: SHANI_PANDIT_PROMPT_VERSION,
    stored: false
  };

  if (supabase) {
    const stored = await storePanditMessage(supabase, {
      user,
      userKey,
      membership,
      question,
      answer,
      report,
      source,
      model
    });
    if (!stored.stored) {
      throwHttpError("Pandit guidance could not be saved. Please try again.", 503);
    }
    result.stored = true;
    result.id = stored.id;
    result.createdAt = stored.createdAt;
  }

  return result;
}

export function isLocalShaniAccessAllowed(env = process.env) {
  return String(env.SHANI_ALLOW_LOCAL_ACCESS || "false").toLowerCase() === "true";
}

export function buildShaniReport(user, now = new Date()) {
  const chartReport = getSaadeSatiFromChart(user, now);
  const moonSign = chartReport.moonSign;
  const currentTransit = chartReport.saturnTransit || {
    sign: chartReport.saturnSign,
    startDate: now,
    endDate: addYears(now, 2)
  };
  const saturnSign = currentTransit.sign || chartReport.saturnSign;
  const phaseIndex = chartReport.phaseIndex;

  if (phaseIndex) {
    const endDate = parseDate(chartReport.activeEndDate || currentTransit.endDate || addYears(now, 2));
    const phaseTitles = ["", "Rising phase", "Peak phase", "Setting phase"];
    const experiences = [
      "",
      "old pressure starts becoming visible, especially around preparation, duty, and responsibility",
      "identity, patience, and emotional maturity may feel tested more directly",
      "lessons begin closing, but discipline still decides how gently the cycle ends"
    ];

    return {
      active: true,
      phaseIndex,
      phaseTitle: phaseTitles[phaseIndex],
      moonSign,
      saturnSign,
      endDate: endDate.toISOString(),
      endLabel: `Estimated completion: ${formatDate(endDate)}`,
      summary: `Your calculated Moon sign is ${moonSign}, with Saturn currently in ${saturnSign}. In this ${phaseTitles[phaseIndex].toLowerCase()}, ${experiences[phaseIndex]}. There is nothing to fear about Saade Sati. With steady remedies, practical discipline, and timely guidance, this period can pass with fewer struggles and more inner strength.`
    };
  }

  const nextStart = parseDate(chartReport.nextStartDate || currentTransit.endDate || addYears(now, 1));
  return {
    active: false,
    phaseIndex: 0,
    phaseTitle: "Outside Saade Sati",
    moonSign,
    saturnSign,
    endDate: nextStart.toISOString(),
    endLabel: chartReport.nextStartDate ? `Next watch begins around ${formatDate(nextStart)}` : `Current Saturn window changes around ${formatDate(nextStart)}`,
    summary: `Your calculated Moon sign is ${moonSign}, and Saturn is currently in ${saturnSign}. Saade Sati does not appear active right now. Keep your routine clean, repay obligations slowly, and treat discipline as protection rather than pressure.`
  };
}

export function buildShaniRemedyMap({ user = {}, report = {}, membership = {}, now = new Date() } = {}) {
  const phase = getPhaseGuidance(report.phaseIndex);
  const pressure = getMemberPressure(report);
  const planName = membership.planName || membership.planId || "Shani remedy";
  const endsAt = parseDate(membership.endsAt || addMonths(now, 3));
  const generatedAt = parseDate(now).toISOString();

  return {
    planName,
    generatedAt,
    phase: {
      title: report.phaseTitle || "Shani discipline window",
      summary: phase.summary,
      pressure
    },
    nextSevenDays: {
      focus: phase.weekFocus,
      action: phase.weekAction,
      caution: phase.weekCaution
    },
    nextMonth: {
      focus: phase.monthFocus,
      action: phase.monthAction,
      marker: `Review this map again before ${formatDate(addDays(now, 30))}.`
    },
    dailyPractices: [
      {
        title: "Morning duty",
        text: "Finish one delayed responsibility before adding a new promise."
      },
      {
        title: "Speech restraint",
        text: "Keep replies slower, shorter, and free of punishment."
      },
      {
        title: "Saturday seva",
        text: "Offer quiet service, clean one neglected space, and avoid public display."
      }
    ],
    renewal: {
      daysLeft: Math.max(0, Math.ceil((endsAt.getTime() - parseDate(now).getTime()) / 86400000)),
      endsAt: endsAt.toISOString()
    }
  };
}

async function readActiveShaniMembership(supabase, userKey, now = new Date()) {
  const { data, error } = await supabase
    .from("shani_remedy_memberships")
    .select(SHANI_MEMBERSHIP_SELECT)
    .eq("user_key", userKey)
    .eq("status", "active")
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Unable to read Shani membership", error.message);
    throwHttpError("Shani remedy membership could not be checked. Please try again.", 503);
  }

  return mapShaniMembership(data, now);
}

async function readPanditHistory(supabase, userKey, limit = 8) {
  const { data, error } = await supabase
    .from("shani_pandit_messages")
    .select("id, question, answer, source, model, prompt_version, created_at")
    .eq("user_key", userKey)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("Unable to read Pandit history", error.message);
    throwHttpError("Pandit guidance history could not be loaded. Please try again.", 503);
  }

  return (data || []).map((item) => ({
    id: item.id,
    question: item.question,
    answer: normalizePanditAnswer(item.answer, buildFallbackPanditAnswer({ question: item.question })),
    source: item.source,
    model: item.model,
    promptVersion: item.prompt_version,
    createdAt: item.created_at
  }));
}

async function storePanditMessage(supabase, { user, userKey, membership, question, answer, report, source, model }) {
  const userProfileId = await upsertUserProfileId(supabase, user, {
    warnLabel: "Unable to upsert Shani user profile"
  });
  const { data, error } = await supabase
    .from("shani_pandit_messages")
    .insert({
      user_profile_id: userProfileId,
      membership_id: membership.id || null,
      user_key: userKey,
      question,
      answer,
      saade_sati_report: report,
      source,
      model,
      prompt_version: SHANI_PANDIT_PROMPT_VERSION
    })
    .select("id, created_at")
    .single();

  if (error) {
    console.warn("Unable to save Pandit guidance", error.message);
    return { stored: false, error: error.message };
  }

  return { stored: true, id: data?.id || null, createdAt: data?.created_at || null };
}

function mapShaniMembership(data, now = new Date()) {
  if (!data) return null;
  const endsAt = data.ends_at || "";
  const active = data.status === "active" && new Date(endsAt).getTime() > new Date(now).getTime();
  return {
    id: data.id,
    active,
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

function normalizeLocalMembership(membership = {}) {
  if (!membership?.active) return null;
  return {
    id: membership.id || "local-shani-membership",
    active: true,
    planId: membership.planId || membership.plan_id || "local",
    planName: membership.planName || membership.plan_name || "Local Shani preview",
    status: "active",
    startedAt: membership.startedAt || new Date().toISOString(),
    endsAt: membership.endsAt || addYears(new Date(), 1).toISOString(),
    provider: membership.provider || "local"
  };
}

function getPhaseGuidance(phaseIndex) {
  if (phaseIndex === 1) {
    return {
      summary: "The work is preparation: simplify obligations before pressure becomes visible.",
      weekFocus: "Clear old promises and make routines less negotiable.",
      weekAction: "Choose one duty that keeps returning, finish it in daylight, and tell fewer people about the effort.",
      weekCaution: "Do not confuse early pressure with punishment; treat it as a request for order.",
      monthFocus: "Build a visible structure around sleep, money, work, or family duty.",
      monthAction: "Track one repeating delay for four Saturdays and close it through action, not worry."
    };
  }
  if (phaseIndex === 2) {
    return {
      summary: "The work is maturity: decisions, identity, and patience need clean conduct.",
      weekFocus: "Reduce ego reactions and let completed work speak first.",
      weekAction: "Before any hard conversation, finish one practical task and let the body settle.",
      weekCaution: "Avoid proving yourself through harsh words, sudden exits, or dramatic promises.",
      monthFocus: "Separate real responsibility from pride disguised as responsibility.",
      monthAction: "Keep a weekly record of what became lighter because you handled it directly."
    };
  }
  if (phaseIndex === 3) {
    return {
      summary: "The work is completion: lessons close gently when discipline stays consistent.",
      weekFocus: "Close loops without reopening old emotional negotiations.",
      weekAction: "Choose one pending obligation, complete the next honest step, and do not seek applause for it.",
      weekCaution: "Do not drop discipline just because relief begins to appear.",
      monthFocus: "Turn the lesson into a rule you can carry after this period.",
      monthAction: "Name one boundary, one duty, and one habit that must remain after pressure reduces."
    };
  }
  return {
    summary: "The work is protection: keep discipline clean before heavier periods arrive.",
    weekFocus: "Strengthen routine, repayment, speech, and service while pressure is low.",
    weekAction: "Make Saturday a reset point: clean one space, serve quietly, and finish one small obligation.",
    weekCaution: "Do not wait for crisis before becoming organized.",
    monthFocus: "Build strength before the next Saturn window asks for it.",
    monthAction: "Review money, sleep, work promises, and family duties once a week without fear."
  };
}

function getMemberPressure(report = {}) {
  if (report.active) {
    return `Moon in ${report.moonSign || "your chart"} and Saturn in ${report.saturnSign || "the current transit"} point to pressure around patience, responsibility, and cleaner timing.`;
  }
  return `Saade Sati is not active now, so the useful work is prevention: order, repayment, humility, and steady service.`;
}

function buildPanditInput({ user, question, report, membership }) {
  return `
User:
- First name: ${firstName(user.name)}
- Birth date: ${user.birthDate || "unknown"}
- Birth time: ${user.birthTime || "unknown"}
- Birth place: ${user.birthPlace || "unknown"}

Shani context:
- Saade Sati active: ${report.active ? "yes" : "no"}
- Phase: ${report.phaseTitle}
- Moon sign: ${report.moonSign || "unknown"}
- Saturn sign: ${report.saturnSign || "unknown"}
- Timeline label: ${report.endLabel || "unknown"}
- Summary: ${report.summary || "none"}

Membership:
- Plan: ${membership.planName || membership.planId || "unknown"}
- Ends at: ${membership.endsAt || "unknown"}

Question:
${question}

Task:
Answer as the member's Pandit guide with a practical remedy and one caution for the next seven days.
`.trim();
}

function buildFallbackPanditAnswer({ user = {}, question = "", report = {} } = {}) {
  const name = firstName(user.name);
  const phase = report.phaseTitle || "this Shani period";
  const pressure = inferPressure(question);
  const action = report.active
    ? "finish one delayed duty before adding a new promise"
    : "keep Saturday simple: clean one space, offer quiet service, and repay one small obligation";

  return {
    text: `${name}, treat ${pressure} as a call for cleaner conduct, not panic. In ${String(phase).toLowerCase()}, Shani responds to patience, truth, and completed responsibility. Keep your words fewer, your timing slower, and your promises smaller for now. ${capitalize(action)} so the pressure has somewhere practical to release.`,
    practice: "On Saturday, light a clean lamp, serve someone without display, and write one responsibility you will finish before sunset.",
    caution: "Do not use fear as discipline; let steadiness become the remedy."
  };
}

function inferPressure(question) {
  const lower = String(question || "").toLowerCase();
  if (/work|job|career|money|business/.test(lower)) return "this work pressure";
  if (/love|marriage|partner|family|relationship/.test(lower)) return "this relationship pressure";
  if (/health|sleep|anxiety|fear|stress/.test(lower)) return "this body and mind pressure";
  if (/court|legal|enemy|conflict|fight/.test(lower)) return "this conflict";
  return "this pressure";
}

function normalizePanditAnswer(raw, fallback) {
  const parsed = parseJson(raw);
  const source = parsed || (typeof raw === "object" && raw ? raw : { text: raw });
  return {
    text: cleanField(source.text || source.answer, fallback.text, 115),
    practice: cleanField(source.practice, fallback.practice, 45),
    caution: cleanField(source.caution, fallback.caution, 35)
  };
}

function sanitizeQuestion(question) {
  return String(question || "").replace(/\s+/g, " ").trim().slice(0, 600);
}

function cleanField(text, fallback, maxWords) {
  const cleaned = String(text || fallback || "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return limitWords(cleaned || fallback, maxWords);
}

function limitWords(text, maxWords) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return String(text || "");
  return `${words.slice(0, maxWords).join(" ").replace(/[,:;]+$/, "")}.`;
}

function parseJson(raw) {
  if (typeof raw === "object" && raw) return raw;
  const text = String(raw || "").trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function buildUserKey(user) {
  const stableValue = user.authUserId || user.id || user.phone || user.email || `${user.name}-${user.birthDate}-${user.birthTime}`;
  return String(stableValue || "anonymous").toLowerCase().trim();
}

function throwHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function firstName(name) {
  return String(name || "friend").trim().split(/\s+/)[0] || "friend";
}

function parseDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : new Date();
}

function addYears(date, years) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(parseDate(date));
}

function capitalize(text) {
  const value = String(text || "");
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}
