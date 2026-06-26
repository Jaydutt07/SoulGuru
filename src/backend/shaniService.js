import { getSaadeSatiFromChart } from "../astrologyEngine.js";
import {
  buildFallbackPanditAnswer,
  buildPanditFingerprint,
  getPanditAnswerIssues
} from "../shaniGuidance.js";
import { buildServerAstrologyContext } from "./astrologyContextService.js";
import { createOpenAIClient, requestOpenAIResponse } from "./openaiClient.js";
import { upsertUserProfileId } from "./profileService.js";
import { createSupabaseAdmin } from "./supabaseAdmin.js";

export const SHANI_PANDIT_PROMPT_VERSION = "shani-pandit-v2";

export const SHANI_PANDIT_SYSTEM_PROMPT = `
You are SoulGuru's Shani remedy guide for paid members.

Use the supplied Saade Sati report and user question. You may mention Shani, Saade Sati, phase, discipline, remedy, and prayer because this tab is explicitly about Shani. Never create fear, certainty, threats, or guaranteed outcomes.
Privately use the supplied Pandit fingerprint: pressure type, exact question cue, Moon sign, Saturn sign, phase, timeline, plan, lesson, and remedy route. Do not quote the fingerprint, but make the answer clearly shaped by it.
Do not write reusable filler such as "Do not fear this phase", "trust the process", "just pray", "Shani is angry", or broad reassurance. The member is paying for a precise guide, not a horoscope paragraph.

Output valid JSON only:
{
  "text": "75 to 115 words",
  "practice": "18 to 42 words",
  "caution": "12 to 30 words"
}

Rules:
- Address the user by first name at most once.
- The text field must mention the exact phase title from the report, such as Peak phase or Outside Saade Sati, and must mention Moon and Saturn context.
- Make the answer feel personal: connect the phase, the user's actual question cue, one likely pressure, Moon/Saturn context, and one practical remedy. Use a visible word from the user's question, such as marriage, speech, sleep, anxiety, career, debt, court, property, or money when relevant.
- Keep a priestly mentor tone: calm, grounded, devotional, direct, and emotionally clean.
- The practice must say "For seven days" and include a grounded remedy: Saturday seva, lamp, breath, service, repayment, restraint, or duty completion.
- Treat anxiety, panic, weak sleep, health symptoms, legal conflict, violence, or severe distress as safety-sensitive. In those cases, the caution must include one direct qualified-support sentence, naming a doctor, therapist, mental-health professional, lawyer, police, emergency service, or trusted local support while still giving Shani guidance.
- Avoid generic filler, markdown, bullets, emojis, fear, medical/legal/financial claims, and anything outside JSON.
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
  let user = payload.user || {};
  const userKey = buildUserKey(user);
  const now = deps.now || new Date();
  if (!payload.report) {
    const serverContext = await buildServerAstrologyContext({
      user,
      date: toDateKey(now)
    }, env, deps);
    user = serverContext.user;
  }
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
  let user = payload.user || {};
  const userKey = buildUserKey(user);
  const question = sanitizeQuestion(payload.question);
  const now = deps.now || new Date();
  if (!payload.report) {
    const serverContext = await buildServerAstrologyContext({
      user,
      date: toDateKey(now)
    }, env, deps);
    user = serverContext.user;
  }
  const report = payload.report || buildShaniReport(user, now);
  const model = env.SHANI_PANDIT_MODEL || env.OPENAI_MODEL || "gpt-5.5";
  const supabase = hasOwn(deps, "supabase") ? deps.supabase : createSupabaseAdmin(env);
  const makeOpenAIClient = deps.createOpenAIClient || createOpenAIClient;

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

  const fallback = normalizePanditAnswer(buildFallbackPanditAnswer({ user, question, report, membership }));
  let answer = fallback;
  let source = "local-fallback";
  let quality = {
    attempts: 0,
    repaired: false,
    passed: getPanditAnswerIssues(answer, { user, question, report }).length === 0,
    fallbackUsed: true
  };
  const openAiDisabled = String(env.SHANI_PANDIT_DISABLE_OPENAI || "false").toLowerCase() === "true";

  if (env.OPENAI_API_KEY && !openAiDisabled) {
    const client = makeOpenAIClient(env.OPENAI_API_KEY, env);
    let outputText = await requestPanditGuidance(client, model, buildPanditInput({ user, question, report, membership }), env);
    let attempts = 1;
    let repairResult = repairPanditContractGaps(
      normalizePanditAnswer(outputText, fallback),
      { user, question, report }
    );
    let candidate = repairResult.answer;
    let contractRepaired = repairResult.repaired;
    let candidateIssues = getPanditAnswerIssues(candidate, { user, question, report });

    if (candidateIssues.length) {
      outputText = await requestPanditGuidance(client, model, buildPanditRepairInput({
        user,
        question,
        report,
        membership,
        rejectedAnswer: candidate,
        rejectionReason: candidateIssues.join("; ")
      }), env);
      attempts = 2;
      repairResult = repairPanditContractGaps(
        normalizePanditAnswer(outputText, fallback),
        { user, question, report }
      );
      candidate = repairResult.answer;
      contractRepaired = contractRepaired || repairResult.repaired;
      candidateIssues = getPanditAnswerIssues(candidate, { user, question, report });
    }

    const fallbackUsed = candidateIssues.length > 0;
    answer = fallbackUsed ? fallback : candidate;
    source = fallbackUsed ? "quality-fallback" : "openai";
    quality = {
      attempts,
      repaired: attempts > 1 || contractRepaired,
      contractRepaired,
      passed: getPanditAnswerIssues(answer, { user, question, report }).length === 0,
      fallbackUsed
    };
  }

  const result = {
    allowed: true,
    answer,
    report,
    membership,
    source,
    model,
    promptVersion: SHANI_PANDIT_PROMPT_VERSION,
    quality,
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
- Pandit fingerprint: ${buildPanditFingerprint({ user, question, report, membership })}

Membership:
- Plan: ${membership.planName || membership.planId || "unknown"}
- Ends at: ${membership.endsAt || "unknown"}

Question:
${question}

Task:
Answer as the member's Pandit guide with a practical remedy and one caution for the next seven days.
`.trim();
}

function buildPanditRepairInput({ user, question, report, membership, rejectedAnswer = {}, rejectionReason = "" }) {
  return `
${buildPanditInput({ user, question, report, membership })}

The previous answer failed quality review:
${rejectionReason}

Rejected answer:
${JSON.stringify(rejectedAnswer)}

Rewrite with a different sentence structure. Keep JSON only, connect the answer to the actual question, exact Shani phase title, Moon/Saturn context, a seven-day practice, and one grounded caution. If the rejection mentions professional help, put direct qualified-support wording inside caution. If the rejection mentions the question or phase, use a visible word from the question and the report's exact phase title.
`.trim();
}

async function requestPanditGuidance(client, model, input, env = process.env) {
  const response = await requestOpenAIResponse(client, {
    model,
    instructions: SHANI_PANDIT_SYSTEM_PROMPT,
    input
  }, env);
  return response.output_text;
}

function normalizePanditAnswer(raw, fallback = buildFallbackPanditAnswer()) {
  const parsed = parseJson(raw);
  const source = parsed || (typeof raw === "object" && raw ? raw : { text: raw });
  return {
    text: cleanField(source.text || source.answer, fallback.text, 115),
    practice: cleanField(source.practice, fallback.practice, 45),
    caution: cleanField(source.caution, fallback.caution, 35)
  };
}

function repairPanditContractGaps(answer = {}, { user = {}, question = "", report = {} } = {}) {
  const name = firstName(user.name);
  const repaired = {
    text: cleanPanditRiskLanguage(answer.text),
    practice: cleanPanditRiskLanguage(answer.practice),
    caution: cleanPanditRiskLanguage(answer.caution)
  };
  const phaseTitle = String(report.phaseTitle || "").trim();
  const moonSign = report.moonSign || "the Moon sign";
  const saturnSign = report.saturnSign || "the Saturn sign";
  const cue = questionCueForRepair(question);

  if (phaseTitle && !includesText(repaired.text, phaseTitle)) {
    repaired.text = `In ${phaseTitle}, Moon in ${moonSign} and Saturn in ${saturnSign} make ${cue} a conduct lesson. ${repaired.text || ""}`;
  } else if (!mentionsShaniContextForRepair(repaired.text)) {
    repaired.text = `Shani is asking for disciplined conduct around ${cue}. ${repaired.text || ""}`;
  }

  if (!hasQuestionCueForRepair(joinAnswer(repaired), question)) {
    repaired.text = `${repaired.text || ""} Keep ${cue} visible instead of turning it into a general worry.`;
  }

  if (!hasSevenDayCueForRepair(joinAnswer(repaired))) {
    repaired.practice = `For seven days, ${lowerFirst(repaired.practice || "complete one duty, keep speech restrained, and use one quiet remedy")}`;
  }

  if (!hasRemedyCueForRepair(repaired.practice)) {
    repaired.practice = `${repaired.practice || "For seven days, finish one duty daily."} Keep Saturday service private and take nine steady breaths.`;
  }

  if (needsQualifiedSupportForRepair(question) && !mentionsQualifiedSupportForRepair(joinAnswer(repaired))) {
    repaired.caution = "If anxiety, sleep trouble, legal risk, or distress intensifies, seek a qualified doctor, therapist, lawyer, or trusted local support.";
  }

  const nameLimited = limitFirstNameUsage(repaired, name);
  const repairedAnswer = {
    text: limitWords(nameLimited.text || answer.text, 115),
    practice: limitWords(nameLimited.practice || answer.practice, 45),
    caution: limitWords(nameLimited.caution || answer.caution, 35)
  };

  return {
    answer: repairedAnswer,
    repaired: JSON.stringify(normalizeComparableAnswer(answer)) !== JSON.stringify(normalizeComparableAnswer(repairedAnswer))
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

function joinAnswer(answer = {}) {
  return [answer.text, answer.practice, answer.caution].filter(Boolean).join(" ");
}

function includesText(text, phrase) {
  return String(text || "").toLowerCase().includes(String(phrase || "").toLowerCase());
}

function mentionsShaniContextForRepair(text) {
  return /\b(Shani|Saade Sati|Saturn|phase|Moon sign|remedy|discipline)\b/i.test(String(text || ""));
}

function questionCueForRepair(question) {
  const lower = String(question || "").toLowerCase();
  const cues = [
    ["marriage", "marriage speech"],
    ["speech", "speech restraint"],
    ["sleep", "weak sleep"],
    ["anxiety", "anxiety"],
    ["career", "career pressure"],
    ["money", "money stress"],
    ["debt", "debt pressure"],
    ["court", "court conduct"],
    ["property", "property conflict"],
    ["legal", "legal conduct"]
  ];
  return cues.find(([needle]) => lower.includes(needle))?.[1] || "the question you brought";
}

function hasQuestionCueForRepair(text, question) {
  const tokens = significantQuestionTokens(question);
  if (!tokens.length) return true;
  const normalized = String(text || "").toLowerCase();
  return tokens.some((token) => normalized.includes(token));
}

function significantQuestionTokens(text) {
  const stop = new Set([
    "what", "should", "during", "about", "this", "that", "with", "from", "have", "need", "feel", "feeling",
    "more", "less", "will", "would", "could", "might", "because", "before", "after", "there", "their",
    "shani", "saade", "sati", "remedy", "upay", "active", "prepare"
  ]);
  return String(text || "")
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9-]/g, ""))
    .filter((word) => word.length > 3 && !stop.has(word))
    .slice(0, 10);
}

function hasSevenDayCueForRepair(text) {
  return /\b(seven days|7 days|next seven days|daily)\b/i.test(String(text || ""));
}

function hasRemedyCueForRepair(text) {
  return /\b(lamp|Saturday|seva|service|prayer|breath|sunrise|duty|repay|clean|offer)\b/i.test(String(text || ""));
}

function needsQualifiedSupportForRepair(text) {
  return /\b(suicide|self-harm|abuse|violence|threat|unsafe|legal|court|police|health|doctor|panic|severe|harm|assault|sleep|anxiety)\b/i.test(String(text || ""));
}

function mentionsQualifiedSupportForRepair(text) {
  return /\b(qualified|doctor|therapist|lawyer|police|legal advice|medical|mental-health|professional|trusted local support)\b/i.test(String(text || ""));
}

function lowerFirst(text) {
  const value = String(text || "").trim();
  return value ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : value;
}

function normalizeComparableAnswer(answer = {}) {
  return {
    text: String(answer.text || "").replace(/\s+/g, " ").trim(),
    practice: String(answer.practice || "").replace(/\s+/g, " ").trim(),
    caution: String(answer.caution || "").replace(/\s+/g, " ").trim()
  };
}

function cleanPanditRiskLanguage(text) {
  return String(text || "")
    .replace(/\bpanic\b/gi, "acute distress")
    .replace(/\bcurse\b/gi, "pressure")
    .replace(/\bdoomed\b/gi, "under pressure")
    .replace(/\bwill definitely\b/gi, "can")
    .replace(/\bnothing bad will happen\b/gi, "keep conduct steady")
    .replace(/\btrust the process\b/gi, "trust disciplined conduct")
    .replace(/\bthe universe\b/gi, "the timing")
    .replace(/\bpositive energy\b/gi, "steady conduct")
    .replace(/\bstay positive\b/gi, "stay disciplined")
    .replace(/\bjust pray\b/gi, "pray and complete the duty")
    .replace(/\bshani is angry\b/gi, "Shani is asking for discipline")
    .replace(/\bpunishing you\b/gi, "asking for correction")
    .replace(/\byou may\b/gi, "you can")
    .replace(/\byou might\b/gi, "you can")
    .replace(/\byou could\b/gi, "you can")
    .replace(/^do not fear this\b/i, "Treat this")
    .replace(/\bkeep the question simple\b/gi, "keep the question practical");
}

function limitFirstNameUsage(answer = {}, name = "") {
  if (!name || countWord(joinAnswer(answer), name) <= 1) return answer;
  let seen = false;
  const pattern = new RegExp(`\\b${escapeRegex(name)}\\b,?\\s*`, "gi");
  const strip = (text) => String(text || "").replace(pattern, (match) => {
    if (!seen) {
      seen = true;
      return match;
    }
    return "";
  }).replace(/\s+/g, " ").trim();

  return {
    text: strip(answer.text),
    practice: strip(answer.practice),
    caution: strip(answer.caution)
  };
}

function countWord(text, word) {
  if (!word) return 0;
  const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
  return (String(text || "").match(pattern) || []).length;
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : new Date();
}

function toDateKey(value) {
  const date = parseDate(value);
  return date.toISOString().slice(0, 10);
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
