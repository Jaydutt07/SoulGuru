import crypto from "node:crypto";
import { getDailyWisdom } from "../localSoulWisdom.js";
import {
  buildParagraphArchitecture,
  buildSoulWisdomInput,
  buildSoulWisdomRepairInput,
  createFallbackReading,
  isLowQualityWisdom,
  normalizeWisdomPayload,
  SOUL_WISDOM_SYSTEM_PROMPT
} from "../soulGuruPrompt.js";
import { buildServerAstrologyContext } from "./astrologyContextService.js";
import { buildMemoryContext, searchGuidanceMemory, upsertGuidanceMemory } from "./memoryService.js";
import { createOpenAIClient, requestOpenAIResponse } from "./openaiClient.js";
import { upsertUserProfileId } from "./profileService.js";
import { createSupabaseAdmin } from "./supabaseAdmin.js";
import { buildBackendUserKey } from "./userIdentity.js";
import {
  SOUL_WISDOM_MAX_WORDS,
  SOUL_WISDOM_MIN_WORDS,
  SOUL_WISDOM_PROMPT_VERSION
} from "../soulWisdomVersion.js";

export { SOUL_WISDOM_MAX_WORDS, SOUL_WISDOM_MIN_WORDS, SOUL_WISDOM_PROMPT_VERSION };

export async function readCachedDailySoulWisdom(payload, env = process.env, deps = {}) {
  const user = payload.user || {};
  const date = payload.date || new Date().toISOString().slice(0, 10);
  const userKey = buildBackendUserKey(user);
  const supabase = hasOwn(deps, "supabase") ? deps.supabase : createSupabaseAdmin(env);

  if (!supabase) return null;

  const cached = await readCachedReading(supabase, userKey, date);
  if (!cached) return null;

  return {
    ...cached,
    cached: true,
    source: "supabase",
    stored: true
  };
}

export async function createDailySoulWisdom(payload, env = process.env, deps = {}) {
  let user = payload.user || {};
  const date = payload.date || new Date().toISOString().slice(0, 10);
  const timezone = payload.timezone || "Asia/Kolkata";
  const model = env.OPENAI_MODEL || "gpt-5.5";
  const userKey = buildBackendUserKey(user);
  const supabase = hasOwn(deps, "supabase") ? deps.supabase : createSupabaseAdmin(env);
  const searchMemory = deps.searchGuidanceMemory || searchGuidanceMemory;
  const upsertMemory = deps.upsertGuidanceMemory || upsertGuidanceMemory;
  const makeOpenAIClient = deps.createOpenAIClient || createOpenAIClient;
  let generationLock = null;

  if (supabase) {
    const cached = await readCachedReading(supabase, userKey, date);
    if (cached) {
      return { ...cached, cached: true, source: "supabase", stored: true };
    }
  }

  if (!supabase && !isUncachedSoulWisdomAllowed(env)) {
    throwHttpError(
      "Supabase is required to cache Soul Guru daily readings. Set SOUL_WISDOM_ALLOW_UNCACHED=true only for isolated quality testing.",
      503
    );
  }

  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  if (supabase) {
    generationLock = await acquireDailyReadingLock(supabase, { userKey, date, env });
    if (!generationLock.acquired) {
      const preparedReading = await waitForCachedReading(supabase, userKey, date, env);
      if (preparedReading) {
        return { ...preparedReading, cached: true, source: "supabase", stored: true };
      }
      throwHttpError("Soul Guru reading is already being prepared. Please try again in a moment.", 409);
    }

    const cachedAfterLock = await readCachedReading(supabase, userKey, date);
    if (cachedAfterLock) {
      await releaseDailyReadingLock(supabase, generationLock);
      generationLock = null;
      return { ...cachedAfterLock, cached: true, source: "supabase", stored: true };
    }
  }

  try {
  const serverContext = await buildServerAstrologyContext({ ...payload, user, date }, env, deps);
  user = serverContext.user;
  const astrologyContext = serverContext.astrologyContext;
  const memory = await searchMemory({
    user,
    query: buildMemoryQuery({ user, astrologyContext, date }),
    topK: Number(env.PINECONE_TOP_K || 4)
  }, env);
  const memoryContext = buildMemoryContext(memory);
  const client = makeOpenAIClient(apiKey, env);
  const contractContext = {
    ...astrologyContext,
    paragraphArchitecture: buildParagraphArchitecture(user, astrologyContext, payload.today || date)
  };
  const promptInput = buildSoulWisdomInput({
    user,
    context: astrologyContext,
    today: payload.today || date,
    memoryContext
  });
  let outputText = await requestSoulWisdom(client, model, promptInput, env);
  let qualityAttempts = 1;
  let candidateIssues = getSoulWisdomContractIssues(
    normalizeWisdomPayload(outputText, createFallbackReading("")).wisdom,
    user,
    contractContext,
    { enforceArchitecture: true }
  );

  const fallback = payload.fallback || getDailyWisdom(user, date, payload.today || date);
  while (candidateIssues.length && qualityAttempts < 3) {
    outputText = await requestSoulWisdom(
      client,
      model,
      buildSoulWisdomRepairInput({
        user,
        context: astrologyContext,
        today: payload.today || date,
        memoryContext,
        rejectedWisdom: normalizeWisdomPayload(outputText, createFallbackReading("")).wisdom,
        rejectionReason: candidateIssues.join("; ")
      }),
      env
    );
    qualityAttempts += 1;
    candidateIssues = getSoulWisdomContractIssues(
      normalizeWisdomPayload(outputText, createFallbackReading("")).wisdom,
      user,
      contractContext,
      { enforceArchitecture: true }
    );
  }

  let reading = normalizeWisdomPayload(outputText, fallback);
  if (getSoulWisdomContractIssues(reading.wisdom, user, contractContext, { enforceArchitecture: true }).length) {
    reading = fallback;
  }
  const result = {
    reading,
    wisdom: reading.wisdom,
    astrologyContext,
    cached: false,
    stored: false,
    model,
    promptVersion: SOUL_WISDOM_PROMPT_VERSION,
    readingDate: date,
    quality: {
      attempts: qualityAttempts,
      repaired: qualityAttempts > 1,
      passed: !getSoulWisdomContractIssues(reading.wisdom, user, contractContext, { enforceArchitecture: true }).length
    },
    memory: {
      configured: Boolean(memory.configured),
      used: Boolean(memoryContext),
      degraded: Boolean(memory.degraded),
      matches: memory.matches?.length || 0
    }
  };

  if (supabase) {
    const cacheResult = await writeCachedReading(supabase, {
      user,
      userKey,
      date,
      timezone,
      reading,
      astrologyContext,
      model
    });
    if (!cacheResult.stored) {
      throwHttpError("Soul Guru reading could not be cached. Please try again.", 503);
    }
    result.stored = true;
  }

  await upsertMemory({
    user,
    kind: "daily-soul-reading",
    sourceId: `${date}-${SOUL_WISDOM_PROMPT_VERSION}`,
    text: reading.wisdom,
    metadata: {
      readingDate: date,
      promptVersion: SOUL_WISDOM_PROMPT_VERSION,
      model
    }
  }, env);

  return result;
  } finally {
    if (generationLock?.acquired) {
      await releaseDailyReadingLock(supabase, generationLock);
    }
  }
}

export function isUncachedSoulWisdomAllowed(env = process.env) {
  return String(env.SOUL_WISDOM_ALLOW_UNCACHED || "false").toLowerCase() === "true";
}

async function requestSoulWisdom(client, model, input, env = process.env) {
  const response = await requestOpenAIResponse(client, {
    model,
    instructions: SOUL_WISDOM_SYSTEM_PROMPT,
    input
  }, env);
  return response.output_text;
}

async function readCachedReading(supabase, userKey, date) {
  const { data, error } = await supabase
    .from("daily_soul_readings")
    .select("id, reading, astrology_context, model, prompt_version, reading_date, created_at")
    .eq("user_key", userKey)
    .eq("reading_date", date)
    .eq("prompt_version", SOUL_WISDOM_PROMPT_VERSION)
    .maybeSingle();

  if (error) {
    console.warn("Unable to read cached Soul Guru reading", error.message);
    throwHttpError("Soul Guru daily cache could not be checked. Please try again.", 503);
  }

  if (!data?.reading) return null;

  return {
    id: data.id,
    reading: data.reading,
    wisdom: data.reading.wisdom,
    astrologyContext: data.astrology_context,
    model: data.model,
    promptVersion: data.prompt_version,
    readingDate: data.reading_date,
    createdAt: data.created_at
  };
}

async function writeCachedReading(supabase, { user, userKey, date, timezone, reading, astrologyContext, model }) {
  const userProfileId = await upsertUserProfileId(supabase, user);
  const { error } = await supabase
    .from("daily_soul_readings")
    .upsert({
      user_profile_id: userProfileId,
      user_key: userKey,
      reading_date: date,
      timezone,
      astrology_context: astrologyContext,
      reading,
      model,
      prompt_version: SOUL_WISDOM_PROMPT_VERSION
    }, {
      onConflict: "user_key,reading_date,prompt_version"
    });

  if (error) {
    console.warn("Unable to cache Soul Guru reading", error.message);
    return { stored: false, error: error.message };
  }

  return { stored: true };
}

async function acquireDailyReadingLock(supabase, { userKey, date, env }) {
  const now = new Date();
  const lockOwner = buildLockOwner();
  const ttlMs = parseBoundedInteger(env.SOUL_WISDOM_LOCK_TTL_MS, 90000, 15000, 600000);
  const expiresAt = new Date(now.getTime() + ttlMs).toISOString();

  const { error: cleanupError } = await supabase
    .from("soul_wisdom_generation_locks")
    .delete()
    .lt("expires_at", now.toISOString());

  if (cleanupError) {
    console.warn("Unable to clean expired Soul Guru generation locks", cleanupError.message);
    throwHttpError("Soul Guru generation lock could not be prepared. Please try again.", 503);
  }

  const { data, error } = await supabase
    .from("soul_wisdom_generation_locks")
    .insert({
      user_key: userKey,
      reading_date: date,
      prompt_version: SOUL_WISDOM_PROMPT_VERSION,
      lock_owner: lockOwner,
      expires_at: expiresAt
    })
    .select("id, lock_owner, expires_at")
    .single();

  if (isUniqueViolation(error)) {
    return { acquired: false };
  }

  if (error) {
    console.warn("Unable to acquire Soul Guru generation lock", error.message);
    throwHttpError("Soul Guru generation lock could not be acquired. Please try again.", 503);
  }

  return {
    acquired: true,
    id: data?.id || null,
    userKey,
    date,
    promptVersion: SOUL_WISDOM_PROMPT_VERSION,
    lockOwner,
    expiresAt: data?.expires_at || expiresAt
  };
}

async function releaseDailyReadingLock(supabase, lock) {
  const { error } = await supabase
    .from("soul_wisdom_generation_locks")
    .delete()
    .eq("user_key", lock.userKey)
    .eq("reading_date", lock.date)
    .eq("prompt_version", lock.promptVersion)
    .eq("lock_owner", lock.lockOwner);

  if (error) {
    console.warn("Unable to release Soul Guru generation lock", error.message);
  }
}

async function waitForCachedReading(supabase, userKey, date, env) {
  const attempts = parseBoundedInteger(env.SOUL_WISDOM_LOCK_POLL_ATTEMPTS, 4, 0, 20);
  const intervalMs = parseBoundedInteger(env.SOUL_WISDOM_LOCK_POLL_INTERVAL_MS, 300, 0, 3000);

  for (let attempt = 0; attempt <= attempts; attempt += 1) {
    const cached = await readCachedReading(supabase, userKey, date);
    if (cached) return cached;
    if (attempt < attempts && intervalMs > 0) {
      await delay(intervalMs);
    }
  }

  return null;
}

function buildLockOwner() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isUniqueViolation(error) {
  return error?.code === "23505" || /duplicate key|unique/i.test(error?.message || "");
}

function parseBoundedInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function throwHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function buildMemoryQuery({ user, astrologyContext, date }) {
  return [
    firstName(user.name),
    date,
    astrologyContext.dailyArea,
    astrologyContext.innerWeather,
    astrologyContext.emotionalKnot,
    astrologyContext.decisionGate,
    astrologyContext.stabilizer,
    astrologyContext.avoid
  ].filter(Boolean).join(" | ");
}

function getSoulWisdomContractIssues(wisdom, user, context = {}, options = {}) {
  const text = String(wisdom || "");
  const issues = [];
  const wordCount = words(text).length;
  if (isLowQualityWisdom(text)) {
    issues.push("matched low-quality or repeated phrasing rules");
  }
  if (wordCount < SOUL_WISDOM_MIN_WORDS || wordCount > SOUL_WISDOM_MAX_WORDS) {
    issues.push(`expected ${SOUL_WISDOM_MIN_WORDS}-${SOUL_WISDOM_MAX_WORDS} words, got ${wordCount}`);
  }
  const nameCount = countWord(text, firstName(user.name));
  if (nameCount !== 1) {
    issues.push(`expected first name exactly once, got ${nameCount}`);
  }
  if (hasMechanicalDirectAddressCasing(text, firstName(user.name))) {
    issues.push("direct address used mechanical capitalized imperative casing");
  }
  if (hasAwkwardTemplateJoin(text)) {
    issues.push("used awkward assembled guidance phrasing");
  }
  const openingSeed = context.openingScene || context.dailyScene || "";
  if (openingSeed && !openingUsesSeed(firstSentence(text), openingSeed)) {
    issues.push(`opening did not use seeded scene "${openingSeed}"`);
  }
  if (options.enforceArchitecture) {
    issues.push(...getParagraphArchitectureIssues(text, user, context.paragraphArchitecture));
  }
  return issues;
}

function getParagraphArchitectureIssues(text, user, architecture) {
  const issues = [];
  const sentenceCount = Number(String(architecture || "").match(/^(\d+) sentences?/)?.[1] || 0);
  const nameSentence = Number(String(architecture || "").match(/first name plus [^;]+ in sentence (\d+)/)?.[1] || 0);
  const expectedOpeningBucket = String(architecture || "").match(/Opening bucket:\s*([a-z]+)/i)?.[1]?.toLowerCase();
  const expectedFinalBucket = String(architecture || "").match(/Final bucket:\s*([a-z]+)/i)?.[1]?.toLowerCase();
  const expectedImperativeTarget = Number(String(architecture || "").match(/Imperative target:\s*(\d+)/i)?.[1] || Number.NaN);
  const sentences = splitSentences(text);
  if (sentenceCount && sentences.length !== sentenceCount) {
    issues.push(`expected paragraph architecture sentence count ${sentenceCount}, got ${sentences.length}`);
  }
  if (nameSentence) {
    const nameIndex = sentences.findIndex((sentence) => countWord(sentence, firstName(user.name)) > 0);
    if (nameIndex !== nameSentence - 1) {
      issues.push(`expected first name in sentence ${nameSentence}, got ${nameIndex + 1 || 0}`);
    }
  }
  if (expectedOpeningBucket && sentences[0]) {
    const actualOpeningBucket = sentenceOpeningBucket(sentences[0]);
    if (actualOpeningBucket !== expectedOpeningBucket) {
      issues.push(`expected opening bucket ${expectedOpeningBucket}, got ${actualOpeningBucket}`);
    }
  }
  if (expectedFinalBucket && sentences.at(-1)) {
    const actualFinalBucket = sentenceOpeningBucket(sentences.at(-1));
    if (actualFinalBucket !== expectedFinalBucket) {
      issues.push(`expected final bucket ${expectedFinalBucket}, got ${actualFinalBucket}`);
    }
  }
  if (Number.isFinite(expectedImperativeTarget)) {
    const actualImperatives = sentences.filter((sentence) => sentenceOpeningBucket(sentence) === "imperative").length;
    if (actualImperatives !== expectedImperativeTarget) {
      issues.push(`expected imperative target ${expectedImperativeTarget}, got ${actualImperatives}`);
    }
  }
  return issues;
}

function sentenceOpeningBucket(sentence) {
  const normalized = String(sentence || "").toLowerCase().trim();
  if (/^(answer|begin|check|choose|close|decline|do|drink|eat|finish|give|handle|keep|leave|let|make|name|notice|protect|put|reduce|respond|schedule|send|separate|set|shrink|stand|stop|take|treat|use|wait|walk|write)\b/.test(normalized)) {
    return "imperative";
  }
  if (/^(before|after|by evening|if|when|where|with)\b/.test(normalized)) {
    return "condition";
  }
  if (/^[a-z]+,\b/.test(normalized)) {
    return "name";
  }
  if (/^(a|an|the|one|your|that|this)\b/.test(normalized)) {
    return "scene";
  }
  return "statement";
}

function splitSentences(text) {
  return String(text || "")
    .trim()
    .match(/[^.!?]+[.!?]+/g)
    ?.map((sentence) => sentence.trim()) || [];
}

function hasMechanicalDirectAddressCasing(text, name) {
  const verbs = [
    "Answer",
    "Begin",
    "Check",
    "Choose",
    "Close",
    "Decline",
    "Do",
    "Finish",
    "Give",
    "Handle",
    "Keep",
    "Let",
    "Make",
    "Name",
    "Notice",
    "Protect",
    "Reduce",
    "Respond",
    "Separate",
    "Shrink",
    "Stop",
    "Take",
    "Treat",
    "Use",
    "Wait",
    "Walk",
    "Write"
  ];
  const pattern = new RegExp(`\\b${escapeRegex(name)},\\s+(?:${verbs.join("|")})\\b`);
  return pattern.test(String(text || ""));
}

function hasAwkwardTemplateJoin(text) {
  return [
    /\bLet\s+(?:answer|choose|clean|close|complete|document|do not|finish|letting|make|protect|separate|turn)\b/i,
    /\blet\s+let\b/i,
    /\bwhen\s+(?:protect|eat|drink|walk|sleep|leave|start|lower|step)\b/i,
    /\bwhen\s+do not\b/i,
    /\blet\s+(?:protect|eat|drink|walk|sleep|leave|start|lower|step)\b[^.!?]+\bdecide\b/i,
    /\bhandle simplify\b/i,
    /\bprotect [^.!?]{0,60} belongs before\b/i,
    /\bcan give room to\b/i,
    /\bbody that has been included\b/i,
    /\basking small changes to explain\b/i
  ].some((pattern) => pattern.test(String(text || "")));
}

function openingUsesSeed(opening, seed) {
  const openingTokens = new Set(significantTokens(opening));
  if (significantTokens(seed).some((token) => openingTokens.has(token))) {
    return true;
  }

  const openingCategory = classifyScene(opening);
  const seedCategory = classifyScene(seed);
  return seedCategory !== "general" && openingCategory === seedCategory;
}

function classifyScene(text) {
  const normalized = String(text || "").toLowerCase();
  const categories = [
    ["device", /\b(phone|message|text|unread|inbox|notification|screen|reply)\b/],
    ["water", /\b(water|glass|drink)\b/],
    ["calendar", /\b(calendar|appointment|deadline|time)\b/],
    ["notebook", /\b(notebook|page|pen|line|written|write)\b/],
    ["kitchen", /\b(kitchen|counter|tea|cup|meal|food|breakfast|lunch)\b/],
    ["money", /\b(wallet|receipt|payment|bill|price|money)\b/],
    ["room", /\b(chair|room|desk|drawer|laundry|bed|domestic)\b/],
    ["door", /\b(shoes|door|doorway|keys|bag|charger|errand)\b/],
    ["body", /\b(mirror|shoulder|shoulders|jaw|body|breath)\b/],
    ["conversation", /\b(conversation|sentence|call|answer|agree|yes|say|reply|word|words|unsent|held-back|send)\b/],
    ["task", /\b(list|task|item|draft|work|promise)\b/],
    ["worry", /\b(tab|worry|thought|mind)\b/]
  ];
  return categories.find(([, pattern]) => pattern.test(normalized))?.[0] || "general";
}

function firstSentence(text) {
  const match = String(text || "").trim().match(/^(.+?[.!?])(\s|$)/);
  return match?.[1] || words(text).slice(0, 18).join(" ");
}

function significantTokens(text) {
  const stop = new Set(["the", "and", "that", "this", "with", "your", "before", "after", "where", "keeps", "need", "needs", "beside", "because", "while"]);
  return words(text.toLowerCase())
    .map(cleanToken)
    .filter((word) => word.length >= 4 && !stop.has(word));
}

function cleanToken(text) {
  return String(text || "").replace(/[^a-z]/g, "");
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

function firstName(name) {
  return String(name || "friend").trim().split(/\s+/)[0] || "friend";
}
