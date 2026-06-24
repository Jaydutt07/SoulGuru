import OpenAI from "openai";
import { buildAstrologyContext } from "../astrologyEngine.js";
import { upsertGuidanceMemory } from "./memoryService.js";
import { createSupabaseAdmin } from "./supabaseAdmin.js";

const PROMPT_VERSION = "astro-solve-v1";
const BASE_FREE_ALLOWANCE = 3;
const MEMBER_BONUS_ALLOWANCE = 15;

const ASTRO_SOLVE_SYSTEM_PROMPT = `
You are SoulGuru's Astro Solves mentor.

The user will share a real-life problem. Use the astrology context directly and clearly, unlike Soul Guru's daily wisdom. The answer must feel specific, practical, and useful enough to justify a paid feature.

Output valid JSON only:
{
  "root": "why this may be happening",
  "astrology": "how the chart/transit pattern connects",
  "solution": "clear practical and spiritual steps"
}

Rules:
- Each field should be 55 to 95 words.
- Speak in a grounded mentor tone: warm, direct, mature, not dramatic.
- Mention specific astrological signals from the supplied context, but do not overclaim certainty.
- The root section should name the emotional or behavioral pattern behind the problem.
- The astrology section should connect birth Moon/Sun/Saturn, daily Moon, Saturn pressure, life path, or daily area to the problem.
- The solution section should give a 7-day practical plan and one spiritual/remedy-style practice.
- If the topic involves health, safety, abuse, legal trouble, or severe distress, include a concise instruction to seek qualified professional help while still giving supportive guidance.
- No markdown, bullets, emojis, or text outside JSON.
`.trim();

export async function createAstroSolve(payload, env = process.env) {
  const user = payload.user || {};
  const question = String(payload.question || "").trim();
  const date = payload.date || new Date().toISOString().slice(0, 10);
  const model = env.ASTRO_SOLVE_MODEL || env.OPENAI_MODEL || "gpt-5.5";
  const userKey = buildUserKey(user);
  const supabase = createSupabaseAdmin(env);

  if (!question) {
    throw new Error("Question is required");
  }

  const allowance = await getAstroSolveAllowance({ supabase, userKey, payload });
  if (allowance.remaining <= 0) {
    return {
      allowed: false,
      allowance,
      error: "Astro Solves allowance is complete"
    };
  }

  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const astrologyContext = payload.context || buildAstrologyContext(user, new Date(`${date}T12:00:00+05:30`));
  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model,
    instructions: ASTRO_SOLVE_SYSTEM_PROMPT,
    input: buildAstroSolveInput({
      user,
      question,
      context: astrologyContext,
      today: payload.today || date
    })
  });

  const answer = normalizeAstroSolveAnswer(response.output_text, payload.fallback);
  const result = {
    allowed: true,
    id: `astro-${Date.now()}`,
    problem: question,
    root: answer.root,
    astrology: answer.astrology,
    solution: answer.solution,
    answer,
    astrologyContext,
    source: allowance.isMember ? "member" : "free",
    model,
    promptVersion: PROMPT_VERSION,
    allowance: {
      ...allowance,
      used: allowance.used + 1,
      remaining: Math.max(0, allowance.remaining - 1)
    },
    createdAt: new Date().toISOString()
  };

  if (supabase) {
    await storeAstroSolve(supabase, {
      user,
      userKey,
      question,
      answer,
      astrologyContext,
      source: result.source,
      model
    });
  }

  await upsertGuidanceMemory({
    user,
    kind: "astro-solve",
    sourceId: result.id,
    text: `Problem: ${question}\nRoot: ${answer.root}\nAstrology: ${answer.astrology}\nSolution: ${answer.solution}`,
    metadata: {
      promptVersion: PROMPT_VERSION,
      source: result.source,
      model
    }
  }, env);

  return result;
}

function buildAstroSolveInput({ user, question, context, today }) {
  return `
User:
- First name: ${firstName(user.name)}
- Birth date: ${user.birthDate}
- Birth time: ${user.birthTime || "unknown"}
- Birth place: ${user.birthPlace || "unknown"}
- Today: ${today}

Problem:
${question}

Astrology context:
- Birth Sun: ${context.birthChart?.sun?.sign || context.sign}
- Birth Moon: ${context.birthChart?.moon?.sign || context.moonSign}
- Birth Saturn: ${context.birthChart?.saturn?.sign || "unknown"}
- Transit Moon: ${context.transits?.moon?.sign || "unknown"}
- Transit Saturn: ${context.transits?.saturn?.sign || "unknown"}
- Saturn from natal Moon: ${context.transits?.saturnFromNatalMoon || "unknown"}
- Moon from natal Moon: ${context.transits?.moonFromNatalMoon || "unknown"}
- Life path: ${context.lifePath}
- Daily area: ${context.dailyArea}
- Timing tone: ${context.timingTone}
- Emotional knot: ${context.emotionalKnot}
- Decision gate: ${context.decisionGate}
- Relationship mirror: ${context.relationshipMirror}
- Body/routine signal: ${context.bodySignal}
- Work/creation signal: ${context.workSignal}
- Stabilizer: ${context.stabilizer}
- Avoid pattern: ${context.avoid}

Create the Astro Solves answer now.
`.trim();
}

async function getAstroSolveAllowance({ supabase, userKey, payload }) {
  const subscription = payload.user?.soulGuruSubscription || payload.subscription || {};
  const isMember = Boolean(subscription.active) || (await hasActiveSubscription(supabase, userKey));
  const limit = BASE_FREE_ALLOWANCE + (isMember ? Number(subscription.astroBonusQuestions || MEMBER_BONUS_ALLOWANCE) : 0);
  const used = supabase ? await countStoredQuestions(supabase, userKey) : Number(payload.priorCount || 0);
  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    isMember
  };
}

async function hasActiveSubscription(supabase, userKey) {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("more_guidance_subscriptions")
    .select("id")
    .eq("user_key", userKey)
    .eq("status", "active")
    .gt("ends_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Unable to check Astro Solves subscription", error.message);
    return false;
  }

  return Boolean(data?.id);
}

async function countStoredQuestions(supabase, userKey) {
  const { count, error } = await supabase
    .from("astro_solve_questions")
    .select("id", { count: "exact", head: true })
    .eq("user_key", userKey);

  if (error) {
    console.warn("Unable to count Astro Solves questions", error.message);
    return 0;
  }

  return count || 0;
}

async function storeAstroSolve(supabase, { user, userKey, question, answer, astrologyContext, source, model }) {
  const userProfileId = await upsertUserProfile(supabase, user);
  const { error } = await supabase
    .from("astro_solve_questions")
    .insert({
      user_profile_id: userProfileId,
      user_key: userKey,
      question,
      answer,
      astrology_context: astrologyContext,
      source,
      model,
      prompt_version: PROMPT_VERSION
    });

  if (error) {
    console.warn("Unable to store Astro Solves answer", error.message);
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
    console.warn("Unable to upsert Astro Solves user profile", error.message);
    return null;
  }

  return data?.id || null;
}

export function normalizeAstroSolveAnswer(raw, fallback = {}) {
  const parsed = parseAnswer(raw);
  const source = parsed || (typeof raw === "object" && raw ? raw : {});
  return {
    root: cleanAnswerField(source.root, fallback.root || "The root pattern is a mix of pressure, expectation, and unclear next steps."),
    astrology: cleanAnswerField(source.astrology, fallback.astrology || "The chart pattern points to timing pressure that can be handled through discipline and clearer choices."),
    solution: cleanAnswerField(source.solution, fallback.solution || "For seven days, simplify the problem, take one practical action daily, and keep a short evening reflection.")
  };
}

function parseAnswer(raw) {
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

function cleanAnswerField(text, fallback) {
  const normalized = String(text || fallback || "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return limitWords(normalized || fallback, 110);
}

function limitWords(text, maxWords) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return String(text || "");
  return `${words.slice(0, maxWords).join(" ").replace(/[,:;]+$/, "")}.`;
}

function buildUserKey(user) {
  const stableValue = user.authUserId || user.id || user.phone || user.email || `${user.name}-${user.birthDate}-${user.birthTime}`;
  return String(stableValue || "anonymous").toLowerCase().trim();
}

function firstName(name) {
  return String(name || "friend").trim().split(/\s+/)[0] || "friend";
}
