import {
  buildAstroSolveFingerprint,
  buildFallbackAstroSolveInsight,
  getAstroSolveContractIssues
} from "../astroSolveGuidance.js";
import { buildServerAstrologyContext } from "./astrologyContextService.js";
import { createOpenAIClient, requestOpenAIResponse } from "./openaiClient.js";
import { upsertGuidanceMemory } from "./memoryService.js";
import { upsertUserProfileId } from "./profileService.js";
import { createSupabaseAdmin } from "./supabaseAdmin.js";
import { buildBackendUserKey } from "./userIdentity.js";

export const ASTRO_SOLVE_PROMPT_VERSION = "astro-solve-v2";
export const ASTRO_SOLVE_FREE_ALLOWANCE = 3;
export const ASTRO_SOLVE_MEMBER_BONUS_ALLOWANCE = 15;

export const ASTRO_SOLVE_SYSTEM_PROMPT = `
You are SoulGuru's Astro Solves mentor.

The user will share a real-life problem. Use the astrology context directly and clearly, unlike Soul Guru's daily wisdom. The answer must feel specific, practical, and useful enough to justify a paid feature.
Privately choose a unique route from the supplied Astro Solves fingerprint: the exact problem cue, natal Moon/Sun/Saturn, transit Moon/Saturn timing, daily area, emotional knot, and decision/body signals. Do not quote the fingerprint, but make the answer visibly shaped by it.
Do not write from a reusable template. Avoid generic openings like "you may feel", "this phase", "the universe", "trust the process", "calm energy", or "the root looks". Use the user's actual problem words and concrete chart cues.

Output valid JSON only:
{
  "root": "why this is happening beneath the surface",
  "astrology": "how the chart/transit pattern connects",
  "solution": "clear practical and spiritual steps"
}

Rules:
- Each field should be 65 to 110 words.
- Speak in a grounded mentor tone: warm, direct, mature, not dramatic.
- Mention specific astrological signals from the supplied context: birth Moon, birth Sun, birth Saturn, transit Moon, transit Saturn, Saturn from natal Moon, life path, or daily area. Do not overclaim certainty or predict a guaranteed outcome.
- The root section should name the emotional or behavioral pattern behind the problem.
- The astrology section should connect birth Moon/Sun/Saturn, daily Moon, Saturn pressure, life path, or daily area to the problem.
- The solution section should give a 7-day practical plan and one simple spiritual/remedy-style practice.
- Treat sleep problems, anxiety, panic, health symptoms, abuse, legal trouble, or severe distress as safety-sensitive. In those cases, the solution must include one concise sentence that names qualified support directly, such as a doctor, therapist, counselor, lawyer, emergency service, or trusted local support, while still giving the 7-day plan and remedy.
- Do not hedge the core insight with may, might, could, vague energy language, or one-size-fits-all reassurance.
- No markdown, bullets, emojis, or text outside JSON.
`.trim();

export async function createAstroSolve(payload, env = process.env, deps = {}) {
  let user = payload.user || {};
  const question = String(payload.question || "").trim();
  const date = payload.date || new Date().toISOString().slice(0, 10);
  const model = env.ASTRO_SOLVE_MODEL || env.OPENAI_MODEL || "gpt-5.5";
  const userKey = buildBackendUserKey(user);
  const supabase = hasOwn(deps, "supabase") ? deps.supabase : createSupabaseAdmin(env);
  const makeOpenAIClient = deps.createOpenAIClient || createOpenAIClient;
  const upsertMemory = deps.upsertGuidanceMemory || upsertGuidanceMemory;

  if (!question) {
    throw new Error("Question is required");
  }

  if (!supabase && !isLocalAstroSolveQuotaAllowed(env)) {
    throwHttpError(
      "Supabase is required to enforce Astro Solves quota. Set ASTRO_SOLVES_ALLOW_LOCAL_QUOTA=true only for isolated local testing.",
      503
    );
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

  const serverContext = await buildServerAstrologyContext({ ...payload, user, date }, env, deps);
  user = serverContext.user;
  const astrologyContext = serverContext.astrologyContext;
  const fallback = normalizeAstroSolveAnswer(buildFallbackAstroSolveInsight(
    question,
    user,
    astrologyContext,
    Number(payload.priorCount || 0),
    date
  ));
  const client = makeOpenAIClient(apiKey, env);
  let attempts = 1;
  let responseText = await requestAstroSolve(client, model, buildAstroSolveInput({
    user,
    question,
    context: astrologyContext,
    today: payload.today || date
  }), env);
  let answer = normalizeAstroSolveAnswer(responseText, fallback);
  let answerIssues = getAstroSolveContractIssues(answer, {
    user,
    question,
    context: astrologyContext
  });

  if (answerIssues.length) {
    responseText = await requestAstroSolve(client, model, buildAstroSolveRepairInput({
      user,
      question,
      context: astrologyContext,
      today: payload.today || date,
      rejectedAnswer: answer,
      rejectionReason: answerIssues.join("; ")
    }), env);
    attempts = 2;
    answer = normalizeAstroSolveAnswer(responseText, fallback);
    answerIssues = getAstroSolveContractIssues(answer, {
      user,
      question,
      context: astrologyContext
    });
  }

  const fallbackUsed = answerIssues.length > 0;
  if (fallbackUsed) {
    answer = fallback;
    answerIssues = getAstroSolveContractIssues(answer, {
      user,
      question,
      context: astrologyContext
    });
  }

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
    generationSource: fallbackUsed ? "quality-fallback" : "openai",
    stored: false,
    model,
    promptVersion: ASTRO_SOLVE_PROMPT_VERSION,
    quality: {
      attempts,
      repaired: attempts > 1,
      passed: answerIssues.length === 0,
      fallbackUsed
    },
    allowance: {
      ...allowance,
      used: allowance.used + 1,
      remaining: Math.max(0, allowance.remaining - 1)
    },
    createdAt: new Date().toISOString()
  };

  if (supabase) {
    const storeResult = await storeAstroSolve(supabase, {
      user,
      userKey,
      question,
      answer,
      astrologyContext,
      source: result.source,
      model
    });
    if (!storeResult.stored) {
      throwHttpError("Astro Solves answer could not be saved. Please try again.", 503);
    }
    result.stored = true;
  }

  await upsertMemory({
    user,
    kind: "astro-solve",
    sourceId: result.id,
    text: `Problem: ${question}\nRoot: ${answer.root}\nAstrology: ${answer.astrology}\nSolution: ${answer.solution}`,
    metadata: {
      promptVersion: ASTRO_SOLVE_PROMPT_VERSION,
      source: result.source,
      model
    }
  }, env);

  return result;
}

export function isLocalAstroSolveQuotaAllowed(env = process.env) {
  return String(env.ASTRO_SOLVES_ALLOW_LOCAL_QUOTA || "false").toLowerCase() === "true";
}

function buildAstroSolveInput({ user, question, context, today }) {
  return `
User:
- First name: ${firstName(user.name)}
- Birth date: ${user.birthDate}
- Birth time: ${user.birthTime || "unknown"}
- Birth place: ${user.birthPlace || "unknown"}
- Resolved birth location: ${formatBirthLocation(context.birthLocation, user)}
- Today: ${today}

Problem:
${question}

Astrology context:
- Ascendant: ${formatPlacement(context.birthChart?.ascendant)}
- Birth Sun: ${context.birthChart?.sun?.sign || context.sign}
- Birth Moon: ${context.birthChart?.moon?.sign || context.moonSign}
- Birth Mercury: ${formatPlacement(context.birthChart?.mercury)}
- Birth Venus: ${formatPlacement(context.birthChart?.venus)}
- Birth Mars: ${formatPlacement(context.birthChart?.mars)}
- Birth Jupiter: ${formatPlacement(context.birthChart?.jupiter)}
- Birth Saturn: ${context.birthChart?.saturn?.sign || "unknown"}
- Birth Rahu/Ketu: ${formatPlacement(context.birthChart?.rahu)} / ${formatPlacement(context.birthChart?.ketu)}
- Transit Moon: ${context.transits?.moon?.sign || "unknown"}
- Transit Mercury: ${formatPlacement(context.transits?.mercury)}
- Transit Venus: ${formatPlacement(context.transits?.venus)}
- Transit Mars: ${formatPlacement(context.transits?.mars)}
- Transit Jupiter: ${formatPlacement(context.transits?.jupiter)}
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
- Astro Solves fingerprint: ${buildAstroSolveFingerprint({ user, question, context, today })}

Create the Astro Solves answer now.
`.trim();
}

function buildAstroSolveRepairInput({ user, question, context, today, rejectedAnswer = {}, rejectionReason = "" }) {
  return `
${buildAstroSolveInput({ user, question, context, today })}

The previous answer failed quality review:
${rejectionReason}

Rejected answer:
${JSON.stringify(rejectedAnswer)}

Rewrite from a different sentence structure. Keep JSON only, keep the user's exact concern visible, include specific chart/transit cues, and avoid repeated or vague phrasing. If the rejection mentions professional help, put a direct qualified-support sentence inside the solution field without making the whole answer fearful.
`.trim();
}

async function requestAstroSolve(client, model, input, env = process.env) {
  const response = await requestOpenAIResponse(client, {
    model,
    instructions: ASTRO_SOLVE_SYSTEM_PROMPT,
    input
  }, env);
  return response.output_text;
}

async function getAstroSolveAllowance({ supabase, userKey, payload }) {
  const subscription = payload.user?.soulGuruSubscription || payload.subscription || {};
  const persistedSubscription = await readActiveSubscription(supabase, userKey);
  const isMember = supabase ? Boolean(persistedSubscription) : Boolean(subscription.active);
  const bonusQuestions = persistedSubscription?.astroBonusQuestions || Number(subscription.astroBonusQuestions || ASTRO_SOLVE_MEMBER_BONUS_ALLOWANCE);
  const limit = ASTRO_SOLVE_FREE_ALLOWANCE + (isMember ? bonusQuestions : 0);
  const used = supabase ? await countStoredQuestions(supabase, userKey) : Number(payload.priorCount || 0);
  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    isMember
  };
}

async function readActiveSubscription(supabase, userKey) {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("more_guidance_subscriptions")
    .select("id, astro_bonus_questions")
    .eq("user_key", userKey)
    .eq("status", "active")
    .gt("ends_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Unable to check Astro Solves subscription", error.message);
    throwHttpError("Astro Solves subscription could not be checked. Please try again.", 503);
  }

  return data?.id ? {
    id: data.id,
    astroBonusQuestions: Number(data.astro_bonus_questions || ASTRO_SOLVE_MEMBER_BONUS_ALLOWANCE)
  } : null;
}

async function countStoredQuestions(supabase, userKey) {
  const { count, error } = await supabase
    .from("astro_solve_questions")
    .select("id", { count: "exact", head: true })
    .eq("user_key", userKey);

  if (error) {
    console.warn("Unable to count Astro Solves questions", error.message);
    throwHttpError("Astro Solves allowance could not be checked. Please try again.", 503);
  }

  return count || 0;
}

async function storeAstroSolve(supabase, { user, userKey, question, answer, astrologyContext, source, model }) {
  const userProfileId = await upsertUserProfileId(supabase, user, {
    warnLabel: "Unable to upsert Astro Solves user profile"
  });
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
      prompt_version: ASTRO_SOLVE_PROMPT_VERSION
    });

  if (error) {
    console.warn("Unable to store Astro Solves answer", error.message);
    return { stored: false, error: error.message };
  }

  return { stored: true };
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

  return limitWords(normalized || fallback, 125);
}

function limitWords(text, maxWords) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return String(text || "");
  return `${words.slice(0, maxWords).join(" ").replace(/[,:;]+$/, "")}.`;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
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

function formatPlacement(placement = {}) {
  if (!placement?.sign) return "unknown";
  const house = Number.isFinite(placement.house) ? ` house ${placement.house}` : "";
  const degree = Number.isFinite(placement.degree) ? `${placement.degree}deg` : "unknown degree";
  return `${placement.sign} ${degree}${house}`;
}
