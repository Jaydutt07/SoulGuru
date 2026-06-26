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
import { SOUL_WISDOM_PROMPT_VERSION } from "../soulWisdomVersion.js";

export { SOUL_WISDOM_PROMPT_VERSION };

export async function createDailySoulWisdom(payload, env = process.env, deps = {}) {
  let user = payload.user || {};
  const date = payload.date || new Date().toISOString().slice(0, 10);
  const timezone = payload.timezone || "Asia/Kolkata";
  const model = env.OPENAI_MODEL || "gpt-5.5";
  const userKey = buildUserKey(user);
  const supabase = hasOwn(deps, "supabase") ? deps.supabase : createSupabaseAdmin(env);
  const searchMemory = deps.searchGuidanceMemory || searchGuidanceMemory;
  const upsertMemory = deps.upsertGuidanceMemory || upsertGuidanceMemory;
  const makeOpenAIClient = deps.createOpenAIClient || createOpenAIClient;

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

function buildUserKey(user) {
  const stableValue = user.authUserId || user.id || user.phone || user.email || `${user.name}-${user.birthDate}-${user.birthTime}`;
  return String(stableValue || "anonymous").toLowerCase().trim();
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
  if (wordCount < 72 || wordCount > 98) {
    issues.push(`expected 72-98 words, got ${wordCount}`);
  }
  const nameCount = countWord(text, firstName(user.name));
  if (nameCount !== 1) {
    issues.push(`expected first name exactly once, got ${nameCount}`);
  }
  if (hasMechanicalDirectAddressCasing(text, firstName(user.name))) {
    issues.push("direct address used mechanical capitalized imperative casing");
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
