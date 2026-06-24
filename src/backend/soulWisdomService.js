import OpenAI from "openai";
import { buildAstrologyContext } from "../astrologyEngine.js";
import { buildSoulWisdomInput, normalizeWisdomPayload, SOUL_WISDOM_SYSTEM_PROMPT } from "../soulGuruPrompt.js";
import { buildMemoryContext, searchGuidanceMemory, upsertGuidanceMemory } from "./memoryService.js";
import { createSupabaseAdmin } from "./supabaseAdmin.js";

const PROMPT_VERSION = "soul-wisdom-v3";

export async function createDailySoulWisdom(payload, env = process.env) {
  const user = payload.user || {};
  const date = payload.date || new Date().toISOString().slice(0, 10);
  const timezone = payload.timezone || "Asia/Kolkata";
  const model = env.OPENAI_MODEL || "gpt-5.5";
  const userKey = buildUserKey(user);
  const supabase = createSupabaseAdmin(env);

  if (supabase) {
    const cached = await readCachedReading(supabase, userKey, date);
    if (cached) {
      return { ...cached, cached: true, source: "supabase" };
    }
  }

  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const astrologyContext = payload.context || buildAstrologyContext(user, new Date(`${date}T12:00:00+05:30`));
  const memory = await searchGuidanceMemory({
    user,
    query: buildMemoryQuery({ user, astrologyContext, date }),
    topK: Number(env.PINECONE_TOP_K || 4)
  }, env);
  const memoryContext = buildMemoryContext(memory);
  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model,
    instructions: SOUL_WISDOM_SYSTEM_PROMPT,
    input: buildSoulWisdomInput({
      user,
      context: astrologyContext,
      today: payload.today || date,
      memoryContext
    })
  });

  const reading = normalizeWisdomPayload(response.output_text, payload.fallback);
  const result = {
    reading,
    wisdom: reading.wisdom,
    astrologyContext,
    cached: false,
    model,
    promptVersion: PROMPT_VERSION,
    readingDate: date,
    memory: {
      configured: Boolean(memory.configured),
      used: Boolean(memoryContext),
      degraded: Boolean(memory.degraded),
      matches: memory.matches?.length || 0
    }
  };

  if (supabase) {
    await writeCachedReading(supabase, {
      user,
      userKey,
      date,
      timezone,
      reading,
      astrologyContext,
      model
    });
  }

  await upsertGuidanceMemory({
    user,
    kind: "daily-soul-reading",
    sourceId: `${date}-${PROMPT_VERSION}`,
    text: reading.wisdom,
    metadata: {
      readingDate: date,
      promptVersion: PROMPT_VERSION,
      model
    }
  }, env);

  return result;
}

async function readCachedReading(supabase, userKey, date) {
  const { data, error } = await supabase
    .from("daily_soul_readings")
    .select("id, reading, astrology_context, model, prompt_version, reading_date, created_at")
    .eq("user_key", userKey)
    .eq("reading_date", date)
    .eq("prompt_version", PROMPT_VERSION)
    .maybeSingle();

  if (error) {
    console.warn("Unable to read cached Soul Guru reading", error.message);
    return null;
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
  const userProfileId = await upsertUserProfile(supabase, user);
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
      prompt_version: PROMPT_VERSION
    }, {
      onConflict: "user_key,reading_date,prompt_version"
    });

  if (error) {
    console.warn("Unable to cache Soul Guru reading", error.message);
  }
}

async function upsertUserProfile(supabase, user) {
  const profile = {
    auth_user_id: user.authUserId || null,
    phone: user.phone || null,
    email: user.email || null,
    full_name: user.name || "SoulGuru user",
    birth_date: user.birthDate,
    birth_time: user.birthTime || null,
    birth_place: user.birthPlace || null,
    birth_latitude: user.birthLatitude || null,
    birth_longitude: user.birthLongitude || null,
    updated_at: new Date().toISOString()
  };

  const conflictTarget = profile.auth_user_id ? "auth_user_id" : profile.phone ? "phone" : null;
  if (!conflictTarget) return null;

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(profile, { onConflict: conflictTarget })
    .select("id")
    .maybeSingle();

  if (error) {
    console.warn("Unable to upsert user profile", error.message);
    return null;
  }

  return data?.id || null;
}

function buildUserKey(user) {
  const stableValue = user.authUserId || user.id || user.phone || user.email || `${user.name}-${user.birthDate}-${user.birthTime}`;
  return String(stableValue || "anonymous").toLowerCase().trim();
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
