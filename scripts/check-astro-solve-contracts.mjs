import fs from "node:fs";
import {
  ASTRO_SOLVE_FREE_ALLOWANCE,
  ASTRO_SOLVE_MEMBER_BONUS_ALLOWANCE,
  ASTRO_SOLVE_PROMPT_VERSION,
  ASTRO_SOLVE_SYSTEM_PROMPT,
  createAstroSolve,
  isLocalAstroSolveQuotaAllowed
} from "../src/backend/astroSolveService.js";
import { buildBackendUserKey, isBackendUserKey } from "../src/backend/userIdentity.js";

const checks = [];

async function checkLocalQuotaModeRequiresExplicitFlag() {
  const user = astroUser("local-quota-default");
  const openAiRequests = [];

  let error = null;
  try {
    await createAstroSolve({
      user,
      question: "Why do I feel blocked before starting important work?",
      priorCount: 0
    }, {
      OPENAI_API_KEY: "test-openai-key"
    }, {
      supabase: null,
      createOpenAIClient() {
        return {
          responses: {
            create: async (request) => {
              openAiRequests.push(request);
              return { output_text: "{}" };
            }
          }
        };
      }
    });
  } catch (caughtError) {
    error = caughtError;
  }

  pushCheck("Astro Solves local quota mode requires explicit server flag", [
    error?.statusCode === 503,
    /Supabase is required/.test(error?.message || ""),
    openAiRequests.length === 0,
    isLocalAstroSolveQuotaAllowed({ ASTRO_SOLVES_ALLOW_LOCAL_QUOTA: "true" }) === true,
    isLocalAstroSolveQuotaAllowed({ ASTRO_SOLVES_ALLOW_LOCAL_QUOTA: "false" }) === false
  ].every(Boolean));
}

function checkPromptRequiresSafetySupportForSleepAnxiety() {
  pushCheck("Astro Solves prompt requires qualified support for sleep and anxiety topics", [
    ASTRO_SOLVE_SYSTEM_PROMPT.includes("sleep problems"),
    ASTRO_SOLVE_SYSTEM_PROMPT.includes("anxiety"),
    ASTRO_SOLVE_SYSTEM_PROMPT.includes("safety-sensitive"),
    ASTRO_SOLVE_SYSTEM_PROMPT.includes("qualified support"),
    ASTRO_SOLVE_SYSTEM_PROMPT.includes("doctor"),
    ASTRO_SOLVE_SYSTEM_PROMPT.includes("therapist"),
    ASTRO_SOLVE_SYSTEM_PROMPT.includes("counselor")
  ].every(Boolean));
}

function checkPromptRepairKeepsProfessionalHelpDirect() {
  const source = fs.readFileSync("src/backend/astroSolveService.js", "utf8");
  pushCheck("Astro Solves repair prompt keeps professional-help fixes direct", [
    source.includes("If the rejection mentions professional help"),
    source.includes("direct qualified-support sentence"),
    source.includes("without making the whole answer fearful")
  ].every(Boolean));
}

async function checkExplicitLocalQuotaModeReturnsUnstoredAnswer() {
  const user = astroUser("local-quota-enabled");
  const answerJson = passingAstroAnswerJson("blocked work");
  const openAiRequests = [];

  const result = await createAstroSolve({
    user,
    question: "Why do I feel blocked before starting important work?",
    priorCount: 0
  }, {
    OPENAI_API_KEY: "test-openai-key",
    ASTRO_SOLVES_ALLOW_LOCAL_QUOTA: "true"
  }, {
    supabase: null,
    upsertGuidanceMemory: async () => ({ configured: false, upserted: false }),
    createOpenAIClient() {
      return {
        responses: {
          create: async (request) => {
            openAiRequests.push(request);
            return { output_text: answerJson };
          }
        }
      };
    }
  });

  pushCheck("Explicit local Astro Solves quota mode returns unstored answer", [
    result.allowed === true,
    result.stored === false,
    result.allowance?.limit === ASTRO_SOLVE_FREE_ALLOWANCE,
    result.allowance?.used === 1,
    result.allowance?.remaining === ASTRO_SOLVE_FREE_ALLOWANCE - 1,
    result.generationSource === "openai",
    result.quality?.passed === true,
    openAiRequests.length === 1
  ].every(Boolean));
}

async function checkClientOnlySubscriptionDoesNotExtendSupabaseQuota() {
  const user = astroUser("client-only-member");
  const supabase = createFakeSupabase({
    questions: makeQuestions(user.id, ASTRO_SOLVE_FREE_ALLOWANCE)
  });
  const openAiRequests = [];
  const memoryUpserts = [];

  const result = await createAstroSolve({
    user: {
      ...user,
      soulGuruSubscription: {
        active: true,
        name: "Soul Guru + Astro Solve",
        astroBonusQuestions: ASTRO_SOLVE_MEMBER_BONUS_ALLOWANCE
      }
    },
    subscription: {
      active: true,
      astroBonusQuestions: ASTRO_SOLVE_MEMBER_BONUS_ALLOWANCE
    },
    question: "Why do I keep delaying a conversation at work?"
  }, {
    OPENAI_API_KEY: "test-openai-key"
  }, {
    supabase,
    upsertGuidanceMemory: async (payload) => {
      memoryUpserts.push(payload);
      return { configured: true, upserted: true };
    },
    createOpenAIClient() {
      return {
        responses: {
          create: async (request) => {
            openAiRequests.push(request);
            return { output_text: "{}" };
          }
        }
      };
    }
  });

  pushCheck("Supabase mode ignores client-only Astro Solves bonus", [
    result.allowed === false,
    result.allowance?.limit === ASTRO_SOLVE_FREE_ALLOWANCE,
    result.allowance?.used === ASTRO_SOLVE_FREE_ALLOWANCE,
    result.allowance?.remaining === 0,
    result.allowance?.isMember === false,
    openAiRequests.length === 0,
    memoryUpserts.length === 0,
    supabase.state.calls.filter((call) => call.table === "astro_solve_questions" && call.operation === "insert").length === 0
  ].every(Boolean));
}

async function checkPersistedMemberGetsBonusAndStoresAnswer() {
  const user = astroUser("persisted-member");
  const date = "2026-06-24";
  const supabase = createFakeSupabase({
    subscriptions: [activeSubscription(user.id)],
    questions: makeQuestions(user.id, ASTRO_SOLVE_FREE_ALLOWANCE + ASTRO_SOLVE_MEMBER_BONUS_ALLOWANCE - 1)
  });
  const answerJson = JSON.stringify({
    root: "The root pattern is that the decision has become a test of whether you can disappoint someone without losing your own respect. You are delaying because the practical answer is simpler than the emotional consequence you expect. The habit underneath it is over-preparing for another person's reaction, then calling that preparation responsibility. Bring the problem back to the real request, the actual cost, and the one answer you can keep.",
    astrology: "The chart context shows pressure around responsibility and timing: the daily area points to public duty, while the Moon/Saturn pattern describes emotional caution before commitment. Your birth rhythm wants clarity, but the current transit tone can make every reply feel heavier than it is. This does not predict conflict; it shows why discipline, shorter language, and a clean boundary will work better than another long explanation.",
    solution: "For seven days, write the exact question, the cost of saying yes, and the smallest clean no or yes before speaking. Give yourself one body-based pause before sending any message. A simple spiritual practice: light a lamp or sit quietly for three minutes after sunset, asking for courage to be respectful without self-abandonment. If the issue involves serious workplace harm, also seek qualified guidance."
  });
  const openAiRequests = [];
  const memoryUpserts = [];

  const result = await createAstroSolve({
    user,
    date,
    today: "Wednesday, June 24, 2026",
    question: "Why do I keep delaying a conversation at work?"
  }, {
    OPENAI_API_KEY: "test-openai-key",
    ASTRO_SOLVE_MODEL: "gpt-astro-contract"
  }, {
    supabase,
    upsertGuidanceMemory: async (payload) => {
      memoryUpserts.push(payload);
      return { configured: true, upserted: true };
    },
    createOpenAIClient() {
      return {
        responses: {
          create: async (request) => {
            openAiRequests.push(request);
            return { output_text: answerJson };
          }
        }
      };
    }
  });

  const inserts = supabase.state.calls.filter((call) => call.table === "astro_solve_questions" && call.operation === "insert");
  const profileWrites = supabase.state.calls.filter((call) => call.table === "user_profiles" && call.operation === "upsert");
  const inserted = inserts[0]?.payload;
  const userKey = buildBackendUserKey(user);

  pushCheck("Persisted member receives 18-question Astro Solves allowance", [
    result.allowed === true,
    result.source === "member",
    result.stored === true,
    result.allowance?.limit === ASTRO_SOLVE_FREE_ALLOWANCE + ASTRO_SOLVE_MEMBER_BONUS_ALLOWANCE,
    result.allowance?.used === ASTRO_SOLVE_FREE_ALLOWANCE + ASTRO_SOLVE_MEMBER_BONUS_ALLOWANCE,
    result.allowance?.remaining === 0,
    result.promptVersion === ASTRO_SOLVE_PROMPT_VERSION,
    result.model === "gpt-astro-contract",
    openAiRequests.length === 1
  ].every(Boolean));
  pushCheck("Astro Solves answer is stored with profile and prompt metadata", [
    inserts.length === 1,
    inserted.user_key === userKey,
    isBackendUserKey(inserted.user_key),
    inserted.user_key !== user.id,
    inserted.source === "member",
    inserted.model === "gpt-astro-contract",
    inserted.prompt_version === ASTRO_SOLVE_PROMPT_VERSION,
    inserted.answer?.root === result.answer.root,
    inserted.astrology_context,
    profileWrites.length === 1,
    profileWrites[0].payload.phone === user.phone,
    profileWrites[0].payload.birth_place === user.birthPlace
  ].every(Boolean));
  pushCheck("Astro Solves answer is stored in guidance memory", [
    memoryUpserts.length === 1,
    memoryUpserts[0].kind === "astro-solve",
    memoryUpserts[0].metadata?.promptVersion === ASTRO_SOLVE_PROMPT_VERSION,
    memoryUpserts[0].metadata?.source === "member",
    memoryUpserts[0].metadata?.model === "gpt-astro-contract",
    /Problem:/.test(memoryUpserts[0].text || "")
  ].every(Boolean));
}

async function checkSubscriptionReadFailureDoesNotCallOpenAI() {
  const user = astroUser("subscription-read-failure");
  const supabase = createFakeSupabase({
    failSubscriptionSelect: true
  });
  const openAiRequests = [];
  const originalWarn = console.warn;
  let error = null;

  try {
    console.warn = () => {};
    await createAstroSolve({
      user,
      question: "Should I reopen an old relationship?"
    }, {
      OPENAI_API_KEY: "test-openai-key"
    }, {
      supabase,
      createOpenAIClient() {
        return {
          responses: {
            create: async (request) => {
              openAiRequests.push(request);
              return { output_text: "{}" };
            }
          }
        };
      }
    });
  } catch (caughtError) {
    error = caughtError;
  } finally {
    console.warn = originalWarn;
  }

  pushCheck("Astro Solves subscription read failure does not call OpenAI", [
    error?.statusCode === 503,
    /subscription could not be checked/.test(error?.message || ""),
    openAiRequests.length === 0,
    supabase.state.calls.filter((call) => call.table === "astro_solve_questions" && call.operation === "insert").length === 0
  ].every(Boolean));
}

async function checkQuestionCountFailureDoesNotCallOpenAI() {
  const user = astroUser("question-count-failure");
  const supabase = createFakeSupabase({
    subscriptions: [activeSubscription(user.id)],
    failQuestionCount: true
  });
  const openAiRequests = [];
  const originalWarn = console.warn;
  let error = null;

  try {
    console.warn = () => {};
    await createAstroSolve({
      user,
      question: "Why do I keep overthinking money?"
    }, {
      OPENAI_API_KEY: "test-openai-key"
    }, {
      supabase,
      createOpenAIClient() {
        return {
          responses: {
            create: async (request) => {
              openAiRequests.push(request);
              return { output_text: "{}" };
            }
          }
        };
      }
    });
  } catch (caughtError) {
    error = caughtError;
  } finally {
    console.warn = originalWarn;
  }

  pushCheck("Astro Solves question count failure does not call OpenAI", [
    error?.statusCode === 503,
    /allowance could not be checked/.test(error?.message || ""),
    openAiRequests.length === 0,
    supabase.state.calls.filter((call) => call.table === "astro_solve_questions" && call.operation === "insert").length === 0
  ].every(Boolean));
}

async function checkStorageFailureDoesNotReturnAnswer() {
  const user = astroUser("storage-failure");
  const supabase = createFakeSupabase({
    subscriptions: [activeSubscription(user.id)],
    failQuestionInsert: true
  });
  const openAiRequests = [];
  const memoryUpserts = [];
  const originalWarn = console.warn;
  const answerJson = passingAstroAnswerJson("job change");
  let error = null;

  try {
    console.warn = () => {};
    await createAstroSolve({
      user,
      question: "Should I change jobs right now?"
    }, {
      OPENAI_API_KEY: "test-openai-key"
    }, {
      supabase,
      upsertGuidanceMemory: async (payload) => {
        memoryUpserts.push(payload);
        return { configured: true, upserted: true };
      },
      createOpenAIClient() {
        return {
          responses: {
            create: async (request) => {
              openAiRequests.push(request);
              return { output_text: answerJson };
            }
          }
        };
      }
    });
  } catch (caughtError) {
    error = caughtError;
  } finally {
    console.warn = originalWarn;
  }

  pushCheck("Astro Solves storage failure does not return uncounted answer", [
    error?.statusCode === 503,
    /could not be saved/.test(error?.message || ""),
    openAiRequests.length === 1,
    memoryUpserts.length === 0,
    supabase.state.calls.filter((call) => call.table === "astro_solve_questions" && call.operation === "insert").length === 1
  ].every(Boolean));
}

async function checkPersistedMemberAtLimitBlocksNineteenthQuestion() {
  const user = astroUser("member-at-limit");
  const totalAllowance = ASTRO_SOLVE_FREE_ALLOWANCE + ASTRO_SOLVE_MEMBER_BONUS_ALLOWANCE;
  const supabase = createFakeSupabase({
    subscriptions: [activeSubscription(user.id)],
    questions: makeQuestions(user.id, totalAllowance)
  });
  const openAiRequests = [];

  const result = await createAstroSolve({
    user,
    question: "Should I change jobs right now?"
  }, {
    OPENAI_API_KEY: "test-openai-key"
  }, {
    supabase,
    createOpenAIClient() {
      return {
        responses: {
          create: async (request) => {
            openAiRequests.push(request);
            return { output_text: "{}" };
          }
        }
      };
    }
  });

  pushCheck("Persisted member cannot use a nineteenth Astro Solves question", [
    result.allowed === false,
    result.allowance?.limit === totalAllowance,
    result.allowance?.used === totalAllowance,
    result.allowance?.remaining === 0,
    result.allowance?.isMember === true,
    openAiRequests.length === 0,
    supabase.state.calls.filter((call) => call.table === "astro_solve_questions" && call.operation === "insert").length === 0
  ].every(Boolean));
}

function createFakeSupabase({
  subscriptions = [],
  questions = [],
  failQuestionInsert = false,
  failQuestionCount = false,
  failSubscriptionSelect = false
} = {}) {
  const state = {
    calls: [],
    subscriptions: new Map(),
    questions: questions.map((question) => ({ ...question })),
    profiles: new Map(),
    nextProfileId: 1,
    nextQuestionId: questions.length + 1,
    failQuestionInsert,
    failQuestionCount,
    failSubscriptionSelect
  };

  for (const subscription of subscriptions) {
    state.subscriptions.set(subscription.user_key, { ...subscription });
  }

  return {
    state,
    from(table) {
      return new FakeQuery(state, table);
    }
  };
}

class FakeQuery {
  constructor(state, table) {
    this.state = state;
    this.table = table;
    this.filters = {};
    this.gtFilters = {};
    this.selectOptions = {};
    this.result = { data: null, error: null };
  }

  select(_columns, options = {}) {
    this.selectOptions = options || {};
    return this;
  }

  eq(column, value) {
    this.filters[column] = value;
    return this;
  }

  gt(column, value) {
    this.gtFilters[column] = value;
    return this;
  }

  limit() {
    return this;
  }

  upsert(payload, options = {}) {
    this.state.calls.push({
      table: this.table,
      operation: "upsert",
      payload: clone(payload),
      options: clone(options)
    });

    if (this.table === "user_profiles") {
      const key = payload.auth_user_id || payload.phone || payload.email || `profile-${this.state.nextProfileId}`;
      const existing = this.state.profiles.get(key);
      const id = existing?.id || `profile-${this.state.nextProfileId++}`;
      const profile = { ...existing, ...clone(payload), id };
      this.state.profiles.set(key, profile);
      this.result = { data: { id }, error: null };
      return this;
    }

    return this;
  }

  insert(payload) {
    this.state.calls.push({
      table: this.table,
      operation: "insert",
      payload: clone(payload)
    });

    if (this.table === "astro_solve_questions") {
      if (this.state.failQuestionInsert) {
        this.result = {
          data: null,
          error: { message: "contract insert failure" }
        };
        return this;
      }

      const row = {
        ...clone(payload),
        id: `astro-row-${this.state.nextQuestionId++}`,
        created_at: "2026-06-24T00:00:00.000Z"
      };
      this.state.questions.push(row);
      this.result = { data: row, error: null };
      return this;
    }

    return this;
  }

  async maybeSingle() {
    if (this.table === "more_guidance_subscriptions") {
      if (this.state.failSubscriptionSelect) {
        return {
          data: null,
          error: { message: "contract subscription read failure" }
        };
      }
      const subscription = this.state.subscriptions.get(this.filters.user_key);
      if (!subscription) return { data: null, error: null };
      if (this.filters.status && subscription.status !== this.filters.status) return { data: null, error: null };
      if (this.gtFilters.ends_at && new Date(subscription.ends_at).getTime() <= new Date(this.gtFilters.ends_at).getTime()) {
        return { data: null, error: null };
      }
      return { data: subscription, error: null };
    }

    return this.result;
  }

  then(resolve, reject) {
    if (this.table === "astro_solve_questions" && this.selectOptions.count === "exact" && this.selectOptions.head === true) {
      if (this.state.failQuestionCount) {
        return Promise.resolve({
          count: null,
          error: { message: "contract count failure" }
        }).then(resolve, reject);
      }
      const count = this.state.questions.filter((question) => question.user_key === this.filters.user_key).length;
      return Promise.resolve({ count, error: null }).then(resolve, reject);
    }

    return Promise.resolve(this.result).then(resolve, reject);
  }
}

function activeSubscription(userKey) {
  const normalizedUserKey = isBackendUserKey(userKey) ? userKey : buildBackendUserKey({ id: userKey });
  return {
    id: `subscription-${normalizedUserKey}`,
    user_key: normalizedUserKey,
    status: "active",
    ends_at: "2099-06-01T00:00:00.000Z",
    astro_bonus_questions: ASTRO_SOLVE_MEMBER_BONUS_ALLOWANCE
  };
}

function makeQuestions(userKey, count) {
  const normalizedUserKey = isBackendUserKey(userKey) ? userKey : buildBackendUserKey({ id: userKey });
  return Array.from({ length: count }, (_, index) => ({
    id: `existing-${normalizedUserKey}-${index + 1}`,
    user_key: normalizedUserKey,
    question: `Existing question ${index + 1}`,
    answer: {},
    created_at: "2026-06-01T00:00:00.000Z"
  }));
}

function passingAstroAnswerJson(cue) {
  return JSON.stringify({
    root: `The root is not lack of effort; it is the pressure around ${cue} becoming too tied to self-respect. The mind waits for a perfect feeling before taking a plain step, so delay starts to look like evidence against the person. Bring the issue back to one request, one limit, and one action that can be completed today. The emotional discomfort is a signal to create structure, not proof that the whole path is wrong.`,
    astrology: `Birth Moon and birth Saturn show how responsibility is carried, while transit Moon and transit Saturn describe why ${cue} feels heavier today. The Moon points to the emotional reflex; Saturn points to discipline, timing, and earned confidence. This chart pattern does not guarantee an outcome. It explains why the problem needs a smaller container, visible effort, and fewer assumptions before the next decision is made.`,
    solution: `For seven days, make ${cue} measurable. Day 1: write the exact question and remove one assumption. Day 2: choose one visible action before noon. Days 3 to 5: repeat the action at the same time and record what changed. Days 6 and 7: review evidence before asking for reassurance. Keep the remedy simple: light a lamp after sunset, take nine slow breaths, and ask for discipline before comfort.`
  });
}

function astroUser(id) {
  return {
    id,
    name: "Mira Rao",
    phone: "+919800000003",
    email: `${id}@soulguru.local`,
    birthDate: "1995-02-11",
    birthTime: "10:15",
    birthPlace: "Jaipur"
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function printReport() {
  const failed = checks.filter((check) => !check.passed);
  console.log(`Astro Solves contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}

async function main() {
  checkPromptRequiresSafetySupportForSleepAnxiety();
  checkPromptRepairKeepsProfessionalHelpDirect();
  await checkLocalQuotaModeRequiresExplicitFlag();
  await checkExplicitLocalQuotaModeReturnsUnstoredAnswer();
  await checkClientOnlySubscriptionDoesNotExtendSupabaseQuota();
  await checkPersistedMemberGetsBonusAndStoresAnswer();
  await checkSubscriptionReadFailureDoesNotCallOpenAI();
  await checkQuestionCountFailureDoesNotCallOpenAI();
  await checkStorageFailureDoesNotReturnAnswer();
  await checkPersistedMemberAtLimitBlocksNineteenthQuestion();

  const failed = checks.filter((check) => !check.passed);
  printReport();

  if (failed.length > 0) {
    process.exit(1);
  }
}

await main();
