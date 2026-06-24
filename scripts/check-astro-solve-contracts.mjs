import {
  ASTRO_SOLVE_FREE_ALLOWANCE,
  ASTRO_SOLVE_MEMBER_BONUS_ALLOWANCE,
  ASTRO_SOLVE_PROMPT_VERSION,
  createAstroSolve
} from "../src/backend/astroSolveService.js";

const checks = [];

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

  pushCheck("Persisted member receives 18-question Astro Solves allowance", [
    result.allowed === true,
    result.source === "member",
    result.allowance?.limit === ASTRO_SOLVE_FREE_ALLOWANCE + ASTRO_SOLVE_MEMBER_BONUS_ALLOWANCE,
    result.allowance?.used === ASTRO_SOLVE_FREE_ALLOWANCE + ASTRO_SOLVE_MEMBER_BONUS_ALLOWANCE,
    result.allowance?.remaining === 0,
    result.promptVersion === ASTRO_SOLVE_PROMPT_VERSION,
    result.model === "gpt-astro-contract",
    openAiRequests.length === 1
  ].every(Boolean));
  pushCheck("Astro Solves answer is stored with profile and prompt metadata", [
    inserts.length === 1,
    inserted.user_key === user.id,
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

function createFakeSupabase({ subscriptions = [], questions = [] } = {}) {
  const state = {
    calls: [],
    subscriptions: new Map(),
    questions: questions.map((question) => ({ ...question })),
    profiles: new Map(),
    nextProfileId: 1,
    nextQuestionId: questions.length + 1
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
      const count = this.state.questions.filter((question) => question.user_key === this.filters.user_key).length;
      return Promise.resolve({ count, error: null }).then(resolve, reject);
    }

    return Promise.resolve(this.result).then(resolve, reject);
  }
}

function activeSubscription(userKey) {
  return {
    id: `subscription-${userKey}`,
    user_key: userKey,
    status: "active",
    ends_at: "2099-06-01T00:00:00.000Z",
    astro_bonus_questions: ASTRO_SOLVE_MEMBER_BONUS_ALLOWANCE
  };
}

function makeQuestions(userKey, count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `existing-${userKey}-${index + 1}`,
    user_key: userKey,
    question: `Existing question ${index + 1}`,
    answer: {},
    created_at: "2026-06-01T00:00:00.000Z"
  }));
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
  await checkClientOnlySubscriptionDoesNotExtendSupabaseQuota();
  await checkPersistedMemberGetsBonusAndStoresAnswer();
  await checkPersistedMemberAtLimitBlocksNineteenthQuestion();

  const failed = checks.filter((check) => !check.passed);
  printReport();

  if (failed.length > 0) {
    process.exit(1);
  }
}

await main();
