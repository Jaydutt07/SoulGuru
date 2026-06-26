import { buildAstrologyContext, buildTransitDateForUser } from "../astrologyEngine.js";
import { buildFallbackDeepGuidance, buildPaidGuidanceFingerprint } from "../deepGuidance.js";
import { buildMemoryContext, searchGuidanceMemory, upsertGuidanceMemory } from "./memoryService.js";
import { createOpenAIClient, requestOpenAIResponse } from "./openaiClient.js";
import { upsertUserProfileId } from "./profileService.js";
import { createSupabaseAdmin } from "./supabaseAdmin.js";

const DEFAULT_LIMIT = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
export const DEEP_GUIDANCE_PROMPT_VERSION = "more-guidance-v5";

const MORE_GUIDANCE_SYSTEM_PROMPT = `
You are SoulGuru's paid More Guidance mentor.

Use the supplied birth details, daily astrology-derived context, and prior guidance memory silently. Do not mention astrology, zodiac, planets, charts, transits, numerology, karma, predictions, or remedies. This is deeper mentorship, not a horoscope.
The paid reading must feel like a private continuation of the user's day: specific, useful, and clearly different from the free Words of Wisdom.
Before writing, privately choose a fingerprint from the silent signals: one recurring pattern, one concrete cost, one ordinary scene, one week-level practice, one month-level structure, and one relational or work caution. Express that fingerprint naturally without naming the signals.
Use the supplied Paid guidance fingerprint as a private route for composition. Do not quote it, but make the final fields clearly reflect that route.
Do not write from a reusable template. Avoid repeating the same opening logic across users, especially "the deeper pattern", "this phase", "the universe", "trust the process", "the practical shift is simple", or "you may feel" style phrasing.

Output valid JSON only:
{
  "overview": "115 to 155 words",
  "thisWeek": "55 to 85 words",
  "thisMonth": "55 to 85 words",
  "practice": "35 to 65 words",
  "focus": "5 to 12 words",
  "watch": "5 to 12 words"
}

Rules:
- Address the user by first name exactly once in overview.
- Do not use the user's name in thisWeek, thisMonth, practice, focus, or watch.
- Make the guidance specific enough to feel paid: name a pattern, a cost, a practical shift, and a relationship/work caution.
- The overview must include at least one ordinary concrete detail from the silent signals: room, desk, meal, calendar, money, body, door, message, notebook, or unfinished task behavior.
- Keep a calm mentor tone: warm, direct, adult, and emotionally exact.
- Do not repeat the daily Words of Wisdom paragraph; expand the direction into a fuller map.
- Do not hedge the main insight with may, might, could, or vague "energy" language.
- Do not use stock transition lines such as "the practical shift is simple"; describe the user's specific move directly.
- Do not use label-like starts inside fields such as "This week," or "This month,"; the JSON key already provides the label.
- Do not use the word "paid" inside any returned field; the user already knows this is the subscription surface.
- Do not repeat the same distinctive 5+ word phrase across fields. The focus/watch cues can echo the direction, but the paragraph language must stay fresh.
- Do not use vague spiritual language, grand promises, fear, disclaimers, markdown, bullets, emojis, or text outside JSON.
`.trim();

export async function getMoreGuidanceDashboard(payload, env = process.env, deps = {}) {
  const user = payload.user || {};
  const userKey = buildUserKey(user);
  const supabase = hasOwn(deps, "supabase") ? deps.supabase : createSupabaseAdmin(env);

  if (!supabase) {
    return {
      configured: false,
      subscription: null,
      guidanceHistory: [],
      savedGuidance: []
    };
  }

  const [subscription, guidanceHistory, savedGuidance] = await Promise.all([
    readSubscription(supabase, userKey),
    readGuidanceHistory(supabase, userKey, payload.limit),
    readSavedGuidance(supabase, userKey, payload.limit)
  ]);

  return {
    configured: true,
    subscription,
    tracking: buildSubscriptionTracking(subscription, deps.now || new Date()),
    guidanceHistory,
    savedGuidance
  };
}

export async function saveGuidance(payload, env = process.env, deps = {}) {
  const user = payload.user || {};
  const savedPayload = normalizeSavedGuidancePayload(payload);
  const userKey = buildUserKey(user);
  const supabase = hasOwn(deps, "supabase") ? deps.supabase : createSupabaseAdmin(env);
  const upsertMemory = deps.upsertGuidanceMemory || upsertGuidanceMemory;

  if (!savedPayload) {
    throw new Error("Guidance reading is required");
  }

  if (!supabase && !isLocalMoreGuidanceAllowed(env)) {
    throwHttpError(
      "Supabase is required to save guidance. Set MORE_GUIDANCE_ALLOW_LOCAL_ACCESS=true only for isolated local testing.",
      503
    );
  }

  if (!supabase) {
    await upsertMemory({
      user,
      kind: "saved-guidance",
      sourceId: payload.sourceId || `saved-${Date.now()}`,
      text: savedPayload.memoryText,
      metadata: {
        source: "more-guidance",
        kind: savedPayload.kind,
        savedAt: new Date().toISOString()
      }
    }, env);

    return {
      configured: false,
      saved: false,
      item: {
        id: payload.sourceId || `saved-${Date.now()}`,
        date: new Date().toISOString(),
        note: payload.note || "",
        reading: savedPayload.reading,
        guidance: savedPayload.guidance,
        wisdom: savedPayload.summary
      }
    };
  }

  const userProfileId = await upsertUserProfileId(supabase, user, {
    warnLabel: "Unable to upsert More Guidance user profile"
  });
  const { data, error } = await supabase
    .from("saved_guidance")
    .insert({
      user_key: userKey,
      daily_reading_id: payload.dailyReadingId || null,
      note: payload.note || null,
      reading: savedPayload.reading
    })
    .select("id, note, reading, created_at")
    .single();

  if (error) {
    throw new Error(`Unable to save guidance: ${error.message}`);
  }

  if (userProfileId) {
    await linkSavedGuidanceToProfile(supabase, data.id, userProfileId);
  }

  await upsertMemory({
    user,
    kind: "saved-guidance",
    sourceId: data.id,
    text: savedPayload.memoryText,
    metadata: {
      source: "more-guidance",
      kind: savedPayload.kind,
      savedAt: data.created_at
    }
  }, env);

  return {
    configured: true,
    saved: true,
    item: mapSavedGuidance(data)
  };
}

export async function createMoreGuidanceReading(payload, env = process.env, deps = {}) {
  const user = payload.user || {};
  const userKey = buildUserKey(user);
  const date = payload.date || new Date().toISOString().slice(0, 10);
  const timezone = payload.timezone || user.birthTimezone || "Asia/Kolkata";
  const model = env.MORE_GUIDANCE_MODEL || env.OPENAI_MODEL || "gpt-5.5";
  const supabase = hasOwn(deps, "supabase") ? deps.supabase : createSupabaseAdmin(env);
  const searchMemory = deps.searchGuidanceMemory || searchGuidanceMemory;
  const upsertMemory = deps.upsertGuidanceMemory || upsertGuidanceMemory;
  const makeOpenAIClient = deps.createOpenAIClient || createOpenAIClient;
  const subscription = payload.subscription || user.soulGuruSubscription || {};

  if (!supabase && !isLocalMoreGuidanceAllowed(env)) {
    throwHttpError(
      "Supabase is required to verify More Guidance membership. Set MORE_GUIDANCE_ALLOW_LOCAL_ACCESS=true only for isolated local testing.",
      503
    );
  }

  const hasPersistedSubscription = await hasActiveSubscription(supabase, userKey);
  const isMember = supabase ? hasPersistedSubscription : Boolean(subscription.active);

  if (!isMember) {
    return {
      allowed: false,
      error: "More Guidance subscription is required"
    };
  }

  if (supabase) {
    const cached = await readCachedDeepGuidance(supabase, userKey, date);
    if (cached) {
      return { ...cached, allowed: true, cached: true, source: "supabase", stored: true };
    }
  }

  const astrologyContext = payload.context || buildAstrologyContext(user, buildTransitDateForUser(user, date));
  const fallback = normalizeDeepGuidance(payload.fallback || buildFallbackDeepGuidance(user, astrologyContext));
  let guidance = fallback;
  let source = "local-fallback";
  let quality = {
    attempts: 0,
    repaired: false,
    passed: getDeepGuidanceContractIssues(fallback, user).length === 0
  };

  const openAiDisabled = String(env.MORE_GUIDANCE_DISABLE_OPENAI || "false").toLowerCase() === "true";
  if (env.OPENAI_API_KEY && !openAiDisabled) {
    const memory = await searchMemory({
      user,
      query: [
        "more guidance",
        date,
        astrologyContext.dailyArea,
        astrologyContext.emotionalKnot,
        astrologyContext.decisionGate,
        astrologyContext.attentionAnchor
      ].filter(Boolean).join(" | "),
      topK: Number(env.PINECONE_TOP_K || 4)
    }, env);
    const client = makeOpenAIClient(env.OPENAI_API_KEY, env);
    const firstInput = buildMoreGuidanceInput({
      user,
      context: astrologyContext,
      date,
      memoryContext: buildMemoryContext(memory)
    });
    let outputText = await requestMoreGuidance(client, model, firstInput, env);
    let attempts = 1;
    let candidate = normalizeDeepGuidance(outputText, fallback);
    let candidateIssues = getDeepGuidanceContractIssues(candidate, user);

    if (candidateIssues.length) {
      outputText = await requestMoreGuidance(
        client,
        model,
        buildMoreGuidanceRepairInput({
          user,
          context: astrologyContext,
          date,
          memoryContext: buildMemoryContext(memory),
          rejectedGuidance: candidate,
          rejectionReason: candidateIssues.join("; ")
        }),
        env
      );
      attempts = 2;
      candidate = normalizeDeepGuidance(outputText, fallback);
      candidateIssues = getDeepGuidanceContractIssues(candidate, user);
    }

    guidance = candidateIssues.length ? fallback : candidate;
    source = candidateIssues.length ? "quality-fallback" : "openai";
    quality = {
      attempts,
      repaired: attempts > 1,
      passed: getDeepGuidanceContractIssues(guidance, user).length === 0,
      fallbackUsed: candidateIssues.length > 0
    };
  }

  if (getDeepGuidanceContractIssues(guidance, user).length) {
    guidance = normalizeDeepGuidance(buildFallbackDeepGuidance(user, astrologyContext));
    source = source === "openai" ? "quality-fallback" : source;
    quality = {
      ...quality,
      passed: getDeepGuidanceContractIssues(guidance, user).length === 0,
      fallbackUsed: true
    };
  }

  const result = {
    allowed: true,
    guidance,
    astrologyContext,
    cached: false,
    stored: false,
    source,
    model,
    promptVersion: DEEP_GUIDANCE_PROMPT_VERSION,
    readingDate: date,
    quality
  };

  if (supabase) {
    const cacheResult = await writeCachedDeepGuidance(supabase, {
      user,
      userKey,
      date,
      timezone,
      guidance,
      astrologyContext,
      model
    });
    if (!cacheResult.stored) {
      throwHttpError("More Guidance reading could not be cached. Please try again.", 503);
    }
    result.stored = true;
  }

  await upsertMemory({
    user,
    kind: "more-guidance-reading",
    sourceId: `${date}-${DEEP_GUIDANCE_PROMPT_VERSION}`,
    text: [
      guidance.overview,
      guidance.thisWeek,
      guidance.thisMonth,
      guidance.practice
    ].filter(Boolean).join("\n"),
    metadata: {
      readingDate: date,
      promptVersion: DEEP_GUIDANCE_PROMPT_VERSION,
      source,
      model
    }
  }, env);

  return result;
}

async function requestMoreGuidance(client, model, input, env = process.env) {
  const response = await requestOpenAIResponse(client, {
    model,
    instructions: MORE_GUIDANCE_SYSTEM_PROMPT,
    input
  }, env);
  return response.output_text;
}

function buildMoreGuidanceRepairInput({ user, context, date, memoryContext = "", rejectedGuidance = {}, rejectionReason = "" }) {
  return `
${buildMoreGuidanceInput({
  user,
  context,
  date,
  memoryContext
})}

Quality repair:
The previous paid draft was rejected because it sounded reusable, vague, underdeveloped, or missed a paid guidance contract.
Specific rejection reason: ${rejectionReason || "The reading failed the More Guidance quality contract."}
Rejected draft:
${JSON.stringify(rejectedGuidance)}

Rewrite from scratch. Change the opening, weekly practice, monthly structure, and caution. Keep the same JSON schema and all hidden-signal rules.
`.trim();
}

export function isLocalMoreGuidanceAllowed(env = process.env) {
  return String(env.MORE_GUIDANCE_ALLOW_LOCAL_ACCESS || "false").toLowerCase() === "true";
}

export function buildSubscriptionTracking(subscription, now = new Date()) {
  if (!subscription?.startedAt || !subscription?.endsAt) return null;

  const startedAt = new Date(subscription.startedAt);
  const endsAt = new Date(subscription.endsAt);
  const current = new Date(now);
  if (!Number.isFinite(startedAt.getTime()) || !Number.isFinite(endsAt.getTime())) return null;

  const totalDays = Math.max(1, Math.ceil((endsAt.getTime() - startedAt.getTime()) / DAY_MS));
  const elapsedDays = clamp(Math.floor((current.getTime() - startedAt.getTime()) / DAY_MS), 0, totalDays);
  const daysLeft = clamp(Math.ceil((endsAt.getTime() - current.getTime()) / DAY_MS), 0, totalDays);
  const progress = clamp(Math.round((elapsedDays / totalDays) * 100), 0, 100);
  const monthIndex = clamp(Math.floor((elapsedDays / totalDays) * 3) + 1, 1, 3);
  const weeksLeft = Math.max(0, Math.ceil(daysLeft / 7));
  const status = current.getTime() < startedAt.getTime()
    ? "upcoming"
    : current.getTime() >= endsAt.getTime()
      ? "complete"
      : "active";

  return {
    status,
    startedAt: startedAt.toISOString(),
    endsAt: endsAt.toISOString(),
    generatedAt: current.toISOString(),
    totalDays,
    elapsedDays,
    daysLeft,
    weeksLeft,
    progress,
    monthIndex,
    checkpoints: buildTrackingCheckpoints(progress)
  };
}

async function readSubscription(supabase, userKey) {
  const { data, error } = await supabase
    .from("more_guidance_subscriptions")
    .select("id, plan_name, status, starts_at, ends_at, astro_bonus_questions, provider, provider_payment_id, provider_subscription_id, metadata, created_at")
    .eq("user_key", userKey)
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Unable to read More Guidance subscription", error.message);
    throwHttpError("More Guidance subscription could not be checked. Please try again.", 503);
  }

  if (!data) return null;
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

async function hasActiveSubscription(supabase, userKey) {
  if (!supabase) return false;
  const subscription = await readSubscription(supabase, userKey);
  return Boolean(subscription?.active);
}

function buildTrackingCheckpoints(progress) {
  return [
    {
      label: "Month 1",
      title: "Stabilize the pattern",
      status: getCheckpointStatus(progress, 0, 34)
    },
    {
      label: "Month 2",
      title: "Practice the new response",
      status: getCheckpointStatus(progress, 34, 67)
    },
    {
      label: "Month 3",
      title: "Carry it into decisions",
      status: getCheckpointStatus(progress, 67, 101)
    }
  ];
}

function getCheckpointStatus(progress, startsAt, endsBefore) {
  if (progress >= 100) return "complete";
  if (progress >= endsBefore) return "complete";
  if (progress >= startsAt) return "current";
  return "upcoming";
}

async function readCachedDeepGuidance(supabase, userKey, date) {
  const { data, error } = await supabase
    .from("more_guidance_readings")
    .select("id, guidance, astrology_context, model, prompt_version, reading_date, created_at")
    .eq("user_key", userKey)
    .eq("reading_date", date)
    .eq("prompt_version", DEEP_GUIDANCE_PROMPT_VERSION)
    .maybeSingle();

  if (error) {
    console.warn("Unable to read cached More Guidance reading", error.message);
    throwHttpError("More Guidance daily cache could not be checked. Please try again.", 503);
  }
  if (!data?.guidance) return null;

  return {
    id: data.id,
    guidance: normalizeDeepGuidance(data.guidance),
    astrologyContext: data.astrology_context,
    model: data.model,
    promptVersion: data.prompt_version,
    readingDate: data.reading_date,
    createdAt: data.created_at
  };
}

async function writeCachedDeepGuidance(supabase, { user, userKey, date, timezone, guidance, astrologyContext, model }) {
  const userProfileId = await upsertUserProfileId(supabase, user, {
    warnLabel: "Unable to upsert More Guidance user profile"
  });
  const { error } = await supabase
    .from("more_guidance_readings")
    .upsert({
      user_profile_id: userProfileId,
      user_key: userKey,
      reading_date: date,
      timezone,
      guidance,
      astrology_context: astrologyContext,
      model,
      prompt_version: DEEP_GUIDANCE_PROMPT_VERSION
    }, {
      onConflict: "user_key,reading_date,prompt_version"
    });

  if (error) {
    console.warn("Unable to cache More Guidance reading", error.message);
    return { stored: false, error: error.message };
  }

  return { stored: true };
}

function buildMoreGuidanceInput({ user, context, date, memoryContext = "" }) {
  return `
User:
- First name: ${firstName(user.name)}
- Birth date: ${user.birthDate}
- Birth time: ${user.birthTime || "unknown"}
- Birth place: ${user.birthPlace || "unknown"}
- Resolved birth location: ${formatBirthLocation(context.birthLocation, user)}
- Reading date: ${date}

Silent astrology-derived signals:
- Solar temperament: ${context.sign} / ${context.element}
- Emotional rhythm: ${context.moonSign}
- Life path pressure: ${context.lifePath}
- Daily area: ${context.dailyArea}
- Inner weather: ${context.innerWeather}
- Emotional knot: ${context.emotionalKnot}
- Decision gate: ${context.decisionGate}
- Attention anchor: ${context.attentionAnchor}
- Mentor move: ${context.mentorMove}
- Relational caution: ${context.relationalCaution}
- Closing permission: ${context.closingPermission}
- Body/routine signal: ${context.bodySignal}
- Work/creation signal: ${context.workSignal}
- Stabilizer: ${context.stabilizer}
- Avoid pattern: ${context.avoid}
- Paid guidance fingerprint: ${buildPaidGuidanceFingerprint(user, context, date)}

Private guidance memory:
${memoryContext || "No prior memory is available."}

Task:
Create the paid More Guidance reading. Make it deeper than the free daily Words of Wisdom, useful for the next week and month, and still private about the astrology behind it.
`.trim();
}

async function readGuidanceHistory(supabase, userKey, limit = DEFAULT_LIMIT) {
  const { data, error } = await supabase
    .from("more_guidance_readings")
    .select("id, guidance, reading_date, prompt_version, created_at")
    .eq("user_key", userKey)
    .order("reading_date", { ascending: false })
    .limit(Number(limit || DEFAULT_LIMIT));

  if (error) {
    console.warn("Unable to read guidance history", error.message);
    throwHttpError("More Guidance reading history could not be loaded. Please try again.", 503);
  }

  return (data || []).map((item) => ({
    id: item.id,
    date: item.created_at || item.reading_date,
    dateKey: item.reading_date,
    promptVersion: item.prompt_version,
    guidance: normalizeDeepGuidance(item.guidance),
    wisdom: item.guidance?.overview || ""
  }));
}

async function readSavedGuidance(supabase, userKey, limit = DEFAULT_LIMIT) {
  const { data, error } = await supabase
    .from("saved_guidance")
    .select("id, note, reading, created_at")
    .eq("user_key", userKey)
    .order("created_at", { ascending: false })
    .limit(Number(limit || DEFAULT_LIMIT));

  if (error) {
    console.warn("Unable to read saved guidance", error.message);
    throwHttpError("Saved guidance could not be loaded. Please try again.", 503);
  }

  return (data || []).map(mapSavedGuidance);
}

function mapSavedGuidance(item) {
  const guidance = extractSavedDeepGuidance(item.reading);
  return {
    id: item.id,
    date: item.created_at,
    note: item.note || "",
    reading: item.reading,
    guidance,
    wisdom: guidance?.overview || item.reading?.wisdom || ""
  };
}

async function linkSavedGuidanceToProfile(supabase, savedGuidanceId, userProfileId) {
  const { error } = await supabase
    .from("saved_guidance")
    .update({ user_profile_id: userProfileId })
    .eq("id", savedGuidanceId);

  if (error) {
    console.warn("Unable to link saved guidance to profile", error.message);
  }
}

function normalizeReading(reading) {
  if (!reading || typeof reading !== "object") return null;
  return {
    wisdom: String(reading.wisdom || "").trim(),
    innerWeather: String(reading.innerWeather || "").trim(),
    todayMove: String(reading.todayMove || "").trim(),
    release: String(reading.release || "").trim()
  };
}

function normalizeSavedGuidancePayload(payload = {}) {
  const rawGuidance = payload.guidance || payload.reading?.guidance || (
    payload.reading?.overview ? payload.reading : null
  );
  if (rawGuidance) {
    const guidance = normalizeDeepGuidance(rawGuidance);
    if (!guidance.overview) return null;
    return {
      kind: "more-guidance",
      guidance,
      summary: guidance.overview,
      memoryText: [
        guidance.overview,
        guidance.thisWeek,
        guidance.thisMonth,
        guidance.practice
      ].filter(Boolean).join("\n"),
      reading: {
        type: "more-guidance",
        wisdom: guidance.overview,
        guidance
      }
    };
  }

  const reading = normalizeReading(payload.reading);
  if (!reading?.wisdom) return null;
  return {
    kind: "daily-wisdom",
    guidance: null,
    summary: reading.wisdom,
    memoryText: [
      reading.wisdom,
      reading.innerWeather,
      reading.todayMove,
      reading.release
    ].filter(Boolean).join("\n"),
    reading: {
      type: "daily-wisdom",
      ...reading
    }
  };
}

function extractSavedDeepGuidance(reading) {
  if (!reading || typeof reading !== "object") return null;
  const source = reading.guidance || (reading.overview ? reading : null);
  if (!source) return null;
  return normalizeDeepGuidance(source);
}

function normalizeDeepGuidance(raw, fallback = buildFallbackDeepGuidance()) {
  const parsed = parseJson(raw);
  const source = parsed || (typeof raw === "object" && raw ? raw : {});
  return {
    overview: cleanField(source.overview, fallback.overview, 170),
    thisWeek: cleanField(source.thisWeek, fallback.thisWeek, 100),
    thisMonth: cleanField(source.thisMonth, fallback.thisMonth, 100),
    practice: cleanField(source.practice, fallback.practice, 75),
    focus: cleanShortField(source.focus, fallback.focus),
    watch: cleanShortField(source.watch, fallback.watch)
  };
}

function getDeepGuidanceContractIssues(guidance, user = {}) {
  const value = normalizeDeepGuidance(guidance, buildFallbackDeepGuidance(user));
  const fields = [
    ["overview", value.overview, 105, 160],
    ["thisWeek", value.thisWeek, 45, 90],
    ["thisMonth", value.thisMonth, 45, 90],
    ["practice", value.practice, 30, 75]
  ];
  const issues = [];

  for (const [field, text, minWords, maxWords] of fields) {
    const wordCount = words(text).length;
    if (wordCount < minWords || wordCount > maxWords) {
      issues.push(`${field} expected ${minWords}-${maxWords} words, got ${wordCount}`);
    }
    if (mentionsAstrologyTerms(text)) {
      issues.push(`${field} mentioned astrology terms`);
    }
    if (isLowQualityDeepGuidanceText(text)) {
      issues.push(`${field} matched vague or repeated paid-guidance phrasing`);
    }
  }

  const nameCount = countWord(value.overview, firstName(user.name));
  if (nameCount !== 1) {
    issues.push(`overview expected first name exactly once, got ${nameCount}`);
  }
  const supportNameCount = [
    value.thisWeek,
    value.thisMonth,
    value.practice,
    value.focus,
    value.watch
  ].reduce((total, text) => total + countWord(text, firstName(user.name)), 0);
  if (supportNameCount !== 0) {
    issues.push(`support fields should not repeat first name, got ${supportNameCount}`);
  }

  if (!hasConcretePaidCue(value.overview)) {
    issues.push("overview needs an ordinary concrete cue");
  }

  const repeatedPhrases = buildInternalRepeatedDistinctivePhrases([
    value.overview,
    value.thisWeek,
    value.thisMonth,
    value.practice
  ]);
  if (repeatedPhrases.length) {
    issues.push(`repeated distinctive phrase: ${repeatedPhrases[0].phrase}`);
  }

  for (const [field, text] of [["focus", value.focus], ["watch", value.watch]]) {
    const wordCount = words(text).length;
    if (wordCount < 4 || wordCount > 12) {
      issues.push(`${field} expected 4-12 words, got ${wordCount}`);
    }
    if (mentionsAstrologyTerms(text) || isLowQualityDeepGuidanceText(text)) {
      issues.push(`${field} matched forbidden phrasing`);
    }
  }

  return issues;
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

function cleanField(text, fallback, maxWords) {
  const cleaned = String(text || fallback || "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return limitWords(scrubAstrologyTerms(cleaned || fallback), maxWords);
}

function cleanShortField(text, fallback) {
  return cleanField(text, fallback, 12).replace(/[.!?]+$/g, "");
}

function limitWords(text, maxWords) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return String(text || "");
  return `${words.slice(0, maxWords).join(" ").replace(/[,:;]+$/, "")}.`;
}

function scrubAstrologyTerms(text) {
  return [
    "astrology",
    "zodiac",
    "moon sign",
    "planet",
    "transit",
    "chart",
    "horoscope",
    "numerology",
    "karma"
  ].reduce((current, term) => current.replace(new RegExp(term, "gi"), "inner timing"), String(text || ""));
}

function isLowQualityDeepGuidanceText(text) {
  const normalized = String(text || "").toLowerCase();
  if (!normalized.trim()) return true;

  return [
    /\byou may\b/,
    /\byou might\b/,
    /\byou could\b/,
    /\bmay feel\b/,
    /\bmight feel\b/,
    /\bcould feel\b/,
    /\btoday asks\b/,
    /\bthe deeper pattern\b/,
    /\bthis phase asks\b/,
    /\bthis is a time\b/,
    /\bthe universe\b/,
    /\bdivine timing\b/,
    /\btrust the process\b/,
    /\bthe practical shift is simple\b/,
    /\bpaid\b/,
    /\bkeep it plain for\b/,
    /\breply sent for\b/,
    /\bthe limit stays with\b/,
    /\bone duty closes for\b/,
    /\bcan complete today\b/,
    /\bcan compare it\b/,
    /^this week[, ]/i,
    /^this month[, ]/i,
    /^in the coming days[, ]/i,
    /^over the next month[, ]/i,
    /\bnot asking for (another|more) analysis\b/,
    /\bquiet proof\b/,
    /\bverdict on your worth\b/
  ].some((pattern) => pattern.test(normalized));
}

function buildInternalRepeatedDistinctivePhrases(fields) {
  const counts = new Map();
  for (const field of Array.isArray(fields) ? fields : [fields]) {
    const tokens = normalizedPhraseTokens(field);
    for (const size of [7, 6, 5]) {
      for (let index = 0; index <= tokens.length - size; index += 1) {
        const phraseTokens = tokens.slice(index, index + size);
        if (!isDistinctivePhrase(phraseTokens)) continue;
        const phrase = phraseTokens.join(" ");
        counts.set(phrase, (counts.get(phrase) || 0) + 1);
      }
    }
  }
  return [...counts]
    .filter(([, count]) => count > 4)
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((first, second) => second.count - first.count || second.phrase.length - first.phrase.length);
}

function normalizedPhraseTokens(text) {
  return words(text.toLowerCase())
    .map((word) => word.replace(/[^a-z0-9']/g, ""))
    .filter(Boolean);
}

function isDistinctivePhrase(tokens) {
  const stop = new Set(["a", "an", "and", "are", "as", "at", "be", "been", "before", "by", "can", "do", "for", "from", "has", "have", "in", "is", "it", "its", "not", "of", "on", "or", "that", "the", "then", "this", "to", "when", "where", "with", "without", "you", "your"]);
  const distinctive = tokens.filter((token) => token.length >= 5 && !stop.has(token));
  return distinctive.length >= 3;
}

function mentionsAstrologyTerms(text) {
  return /\b(astrology|zodiac|moon sign|planet|transit|chart|horoscope|numerology|karma|remed(?:y|ies))\b/i.test(String(text || ""));
}

function hasConcretePaidCue(text) {
  return /\b(room|desk|table|meal|breakfast|lunch|dinner|calendar|money|wallet|bill|receipt|body|shoulder|jaw|breath|door|message|notebook|page|task|work|sleep|reply|conversation|family)\b/i.test(String(text || ""));
}

function countWord(text, word) {
  const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
  return (String(text || "").match(pattern) || []).length;
}

function words(text) {
  return String(text || "").split(/\s+/).filter(Boolean);
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function throwHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function firstName(name) {
  return String(name || "friend").trim().split(/\s+/)[0] || "friend";
}

function formatBirthLocation(location, user) {
  if (!location?.label) return user.birthPlace || "unknown";
  const details = [
    location.timezone,
    location.source ? `${location.source} resolution` : ""
  ].filter(Boolean).join(", ");
  return details ? `${location.label} (${details})` : location.label;
}

function buildUserKey(user) {
  const stableValue = user.authUserId || user.id || user.phone || user.email || `${user.name}-${user.birthDate}-${user.birthTime}`;
  return String(stableValue || "anonymous").toLowerCase().trim();
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
