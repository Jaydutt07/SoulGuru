import OpenAI from "openai";
import { buildAstrologyContext, buildTransitDateForUser } from "../astrologyEngine.js";
import {
  buildSoulWisdomInput,
  buildSoulWisdomRepairInput,
  createFallbackReading,
  isLowQualityWisdom,
  normalizeWisdomPayload,
  SOUL_WISDOM_SYSTEM_PROMPT
} from "../soulGuruPrompt.js";
import { buildMemoryContext, searchGuidanceMemory, upsertGuidanceMemory } from "./memoryService.js";
import { upsertUserProfileId } from "./profileService.js";
import { createSupabaseAdmin } from "./supabaseAdmin.js";

export const SOUL_WISDOM_PROMPT_VERSION = "soul-wisdom-v6";

export async function createDailySoulWisdom(payload, env = process.env, deps = {}) {
  const user = payload.user || {};
  const date = payload.date || new Date().toISOString().slice(0, 10);
  const timezone = payload.timezone || "Asia/Kolkata";
  const model = env.OPENAI_MODEL || "gpt-5.5";
  const userKey = buildUserKey(user);
  const supabase = hasOwn(deps, "supabase") ? deps.supabase : createSupabaseAdmin(env);
  const searchMemory = deps.searchGuidanceMemory || searchGuidanceMemory;
  const upsertMemory = deps.upsertGuidanceMemory || upsertGuidanceMemory;
  const createOpenAIClient = deps.createOpenAIClient || ((apiKey) => new OpenAI({ apiKey }));

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

  const astrologyContext = payload.context || buildAstrologyContext(user, buildTransitDateForUser(user, date));
  const memory = await searchMemory({
    user,
    query: buildMemoryQuery({ user, astrologyContext, date }),
    topK: Number(env.PINECONE_TOP_K || 4)
  }, env);
  const memoryContext = buildMemoryContext(memory);
  const client = createOpenAIClient(apiKey);
  const promptInput = buildSoulWisdomInput({
    user,
    context: astrologyContext,
    today: payload.today || date,
    memoryContext
  });
  let outputText = await requestSoulWisdom(client, model, promptInput);
  let qualityAttempts = 1;

  const fallback = payload.fallback || createFallbackReading(buildServerFallbackWisdom(user, astrologyContext));
  const firstCandidate = normalizeWisdomPayload(outputText, createFallbackReading("")).wisdom;
  if (isLowQualityWisdom(firstCandidate)) {
    outputText = await requestSoulWisdom(
      client,
      model,
      buildSoulWisdomRepairInput({
        user,
        context: astrologyContext,
        today: payload.today || date,
        memoryContext,
        rejectedWisdom: firstCandidate
      })
    );
    qualityAttempts = 2;
  }

  const reading = normalizeWisdomPayload(outputText, fallback);
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
      passed: !isLowQualityWisdom(reading.wisdom)
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

async function requestSoulWisdom(client, model, input) {
  const response = await client.responses.create({
    model,
    instructions: SOUL_WISDOM_SYSTEM_PROMPT,
    input
  });
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

function buildServerFallbackWisdom(user, context) {
  const name = firstName(user.name);
  const scene = context.attentionAnchor || context.dailyScene || "one practical detail";
  const move = context.mentorMove || context.stabilizer || "make one promise smaller and keep it completely";
  const caution = context.relationalCaution || context.relationshipMirror || "do not make another person's uncertainty your assignment";
  const avoid = context.avoid || "over-explaining";
  return `${capitalize(scene)} deserves less room in your mind than it has been taking. ${name}, make the day smaller on purpose: ${move}, then keep ${avoid} away from the conversation that needs your attention. If ${caution}, let that guide your pace without hardening you. Your job is not to solve every feeling before moving; it is to keep one real promise cleanly and leave enough space for the body to settle.`;
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

function firstName(name) {
  return String(name || "friend").trim().split(/\s+/)[0] || "friend";
}

function capitalize(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
