import crypto from "node:crypto";
import {
  buildParagraphArchitecture,
  buildSoulWisdomInput,
  buildSoulWisdomRepairInput,
  createFallbackReading,
  getSoulWisdomSpecificityIssues,
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
  const model = env.SOUL_WISDOM_MODEL || env.OPENAI_MODEL || "gpt-5.5";
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
      paragraphArchitecture: buildParagraphArchitecture(user, astrologyContext, payload.today || date),
      priorReadings: payload.priorReadings || []
    };
    const promptInput = buildSoulWisdomInput({
      user,
      context: astrologyContext,
      today: payload.today || date,
      memoryContext,
      priorReadings: payload.priorReadings || []
    });
    let outputText = await requestSoulWisdom(client, model, promptInput, env);
    let qualityAttempts = 1;
    let candidateIssues = getSoulWisdomContractIssues(
      extractWisdomCandidate(outputText),
      user,
      contractContext
    );
    const qualityIssueHistory = [{
      attempt: qualityAttempts,
      issues: candidateIssues
    }];

    const fallback = createFallbackReading("");
    while (candidateIssues.length && qualityAttempts < 3) {
      outputText = await requestSoulWisdom(
        client,
        model,
        buildSoulWisdomRepairInput({
          user,
          context: astrologyContext,
          today: payload.today || date,
          memoryContext,
          priorReadings: payload.priorReadings || [],
          rejectedWisdom: normalizeWisdomPayload(outputText, createFallbackReading("")).wisdom,
          rejectionReason: candidateIssues.join("; ")
        }),
        env
      );
      qualityAttempts += 1;
      candidateIssues = getSoulWisdomContractIssues(
        extractWisdomCandidate(outputText),
        user,
        contractContext
      );
      qualityIssueHistory.push({
        attempt: qualityAttempts,
        issues: candidateIssues
      });
    }

    let reading = normalizeWisdomPayload(outputText, fallback);
    const finalIssues = getSoulWisdomContractIssues(reading.wisdom, user, contractContext);
    if (finalIssues.length) {
      throwHttpError("OpenAI Soul Guru reading did not pass quality. Please try again shortly.", 502);
    }
    const passedQuality = !getSoulWisdomContractIssues(reading.wisdom, user, contractContext).length;
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
        passed: passedQuality,
        ...(shouldExposeSoulWisdomQualityDiagnostics(env) ? { issueHistory: qualityIssueHistory } : {})
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

    scheduleMemoryUpsert(upsertMemory, {
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

function shouldExposeSoulWisdomQualityDiagnostics(env = process.env) {
  return String(env.SOUL_WISDOM_QUALITY_DIAGNOSTICS || "false").toLowerCase() === "true";
}

async function requestSoulWisdom(client, model, input, env = process.env) {
  const response = await requestOpenAIResponse(client, {
    model,
    instructions: SOUL_WISDOM_SYSTEM_PROMPT,
    input,
    max_output_tokens: getSoulWisdomMaxOutputTokens(env),
    reasoning: {
      effort: getSoulWisdomReasoningEffort(env)
    },
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "soul_wisdom_reading",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["wisdom", "innerWeather", "todayMove", "release"],
          properties: {
            wisdom: { type: "string" },
            innerWeather: { type: "string" },
            todayMove: { type: "string" },
            release: { type: "string" }
          }
        }
      }
    }
  }, env);
  return extractOpenAIResponseText(response);
}

function getSoulWisdomMaxOutputTokens(env = process.env) {
  return parseBoundedInteger(env.SOUL_WISDOM_MAX_OUTPUT_TOKENS, 1200, 180, 2400);
}

function getSoulWisdomReasoningEffort(env = process.env) {
  const value = String(env.SOUL_WISDOM_REASONING_EFFORT || "low").trim().toLowerCase();
  return ["none", "minimal", "low", "medium", "high", "xhigh"].includes(value) ? value : "low";
}

function extractOpenAIResponseText(response) {
  const direct = String(response?.output_text || "").trim();
  if (direct) return direct;

  return (Array.isArray(response?.output) ? response.output : [])
    .flatMap((item) => Array.isArray(item?.content) ? item.content : [])
    .map((content) => content?.text || content?.output_text || "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

function scheduleMemoryUpsert(upsertMemory, payload, env) {
  Promise.resolve()
    .then(() => upsertMemory(payload, env))
    .catch((error) => {
      console.warn("Soul Guru memory upsert deferred", error.message);
    });
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
  const ttlMs = parseBoundedInteger(env.SOUL_WISDOM_LOCK_TTL_MS, 300000, 15000, 600000);
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

function extractWisdomCandidate(outputText) {
  if (typeof outputText === "object" && outputText) {
    return String(outputText.wisdom || "");
  }
  const text = String(outputText || "").trim();
  if (!text) return "";
  try {
    const parsed = JSON.parse(text);
    return String(parsed?.wisdom || text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        return String(parsed?.wisdom || text);
      } catch {
        return text;
      }
    }
    return text;
  }
}

function getSoulWisdomContractIssues(wisdom, user, context = {}) {
  const text = String(wisdom || "");
  const issues = [];
  const wordCount = words(text).length;
  const sentences = splitSentences(text);
  if (isLowQualityWisdom(text)) {
    issues.push("matched low-quality or repeated phrasing rules");
  }
  if (wordCount < SOUL_WISDOM_MIN_WORDS || wordCount > SOUL_WISDOM_MAX_WORDS) {
    issues.push(`expected ${SOUL_WISDOM_MIN_WORDS}-${SOUL_WISDOM_MAX_WORDS} words, got ${wordCount}`);
  }
  if (sentences.length < 2 || sentences.length > 3) {
    issues.push(`expected two or three sentences, got ${sentences.length}`);
  }
  const nameCount = countWord(text, firstName(user.name));
  if (nameCount > 1) {
    issues.push(`expected first name at most once, got ${nameCount}`);
  }
  if (hasMechanicalDirectAddressCasing(text, firstName(user.name))) {
    issues.push("direct address used mechanical capitalized imperative casing");
  }
  if (hasAwkwardTemplateJoin(text)) {
    issues.push("used awkward assembled guidance phrasing");
  }
  issues.push(...getSoulWisdomSpecificityIssues(text));
  if (hasMultipleDirections(text)) {
    issues.push("gave more than one practical direction");
  }
  if (mentionsAstrology(text)) {
    issues.push("mentioned astrology or chart terminology");
  }
  issues.push(...getPriorReadingRepeatIssues(text, context.priorReadings || []));
  const openingSeed = context.openingScene || context.dailyScene || "";
  if (openingSeed && !openingUsesSeed(firstSentence(text), openingSeed)) {
    issues.push(`opening did not use seeded scene "${openingSeed}"`);
  }
  return issues;
}

function getPriorReadingRepeatIssues(text, priorReadings = []) {
  const current = normalizeComparableWisdom(text);
  if (!current) return [];

  const issues = [];
  const currentOpening = normalizeComparableWisdom(firstSentence(text));
  for (const prior of Array.isArray(priorReadings) ? priorReadings : []) {
    const priorText = typeof prior === "string" ? prior : prior?.wisdom;
    const priorComparable = normalizeComparableWisdom(priorText);
    if (!priorComparable) continue;

    if (current === priorComparable) {
      issues.push("repeated a previous Soul Guru reading exactly");
      break;
    }

    const score = wordSetSimilarity(current, priorComparable);
    if (score >= 0.58) {
      issues.push(`too similar to a previous Soul Guru reading (${score.toFixed(2)} overlap)`);
      break;
    }

    const priorOpening = normalizeComparableWisdom(firstSentence(priorText));
    if (currentOpening && priorOpening && currentOpening === priorOpening) {
      issues.push("reused the opening sentence from a previous Soul Guru reading");
      break;
    }
  }

  return issues;
}

function normalizeComparableWisdom(text) {
  return comparableTokens(text).join(" ");
}

function wordSetSimilarity(first, second) {
  const firstTokens = new Set(comparableTokens(first));
  const secondTokens = new Set(comparableTokens(second));
  if (!firstTokens.size || !secondTokens.size) return 0;
  let overlap = 0;
  for (const token of firstTokens) {
    if (secondTokens.has(token)) overlap += 1;
  }
  return overlap / Math.min(firstTokens.size, secondTokens.size);
}

function comparableTokens(text) {
  const stopWords = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "before",
    "but",
    "by",
    "for",
    "from",
    "in",
    "into",
    "is",
    "it",
    "of",
    "one",
    "or",
    "that",
    "the",
    "then",
    "this",
    "to",
    "with",
    "your"
  ]);
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !stopWords.has(token));
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
    /\bLet\s+(?:answer|choose|clean|close|complete|document|do|drink|eat|finish|give|handle|keep|lower|make|name|protect|put|reduce|repair|schedule|separate|send|simplify|sleep|step|take|turn|use|walk|write)\b/i,
    /\blet\s+let\b/i,
    /\bwhen\s+(?:protect|eat|drink|walk|leave|start|lower|step)\b/i,
    /\bwhen\s+do not\b/i,
    /\blet\s+(?:protect|eat|drink|walk|sleep|leave|start|lower|step)\b[^.!?]+\bdecide\b/i,
    /\bhandle simplify\b/i,
    /\bprotect [^.!?]{0,60} belongs before\b/i,
    /\bcan give room to\b/i,
    /\bbody that has been included\b/i,
    /\basking small changes to explain\b/i
  ].some((pattern) => pattern.test(String(text || "")));
}

function hasMultipleDirections(text) {
  const matches = String(text || "").match(/\b(answer|approve|check|choose|clean|clear|close|decide|decline|drink|eat|finish|fold|keep|leave|mark|pack|pay|place|protect|put|send|settle|show|submit|write)\b/gi) || [];
  return new Set(matches.map((match) => match.toLowerCase())).size > 3;
}

function mentionsAstrology(text) {
  return /\b(astrology|zodiac|moon sign|planet|transit|chart|horoscope|numerology|karma)\b/i.test(String(text || ""));
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
    ["kitchen", /\b(kitchen|counter|tea|cup|meal|food|breakfast|lunch)\b/],
    ["calendar", /\b(calendar|appointment|deadline|time)\b/],
    ["notebook", /\b(notebook|page|pen|line|written|write)\b/],
    ["money", /\b(wallet|receipt|payment|bill|price|money)\b/],
    ["room", /\b(chair|room|desk|workspace|surface|drawer|laundry|bed|domestic)\b/],
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
