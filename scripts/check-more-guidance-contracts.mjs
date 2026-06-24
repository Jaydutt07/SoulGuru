import {
  createMoreGuidanceReading,
  DEEP_GUIDANCE_PROMPT_VERSION
} from "../src/backend/guidanceService.js";

const checks = [];

async function checkPersistedSubscriptionRequired() {
  const supabase = createFakeSupabase();
  const openAiRequests = [];
  const result = await createMoreGuidanceReading({
    user: {
      id: "client-only-member",
      name: "Mira Rao",
      birthDate: "1995-02-11",
      birthTime: "10:15",
      birthPlace: "Jaipur",
      soulGuruSubscription: {
        active: true,
        name: "Soul Guru + Astro Solve",
        astroBonusQuestions: 15
      }
    },
    subscription: {
      active: true,
      name: "Soul Guru + Astro Solve",
      astroBonusQuestions: 15
    }
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

  pushCheck("Supabase mode requires persisted More Guidance subscription", [
    result.allowed === false,
    /subscription is required/i.test(result.error || ""),
    openAiRequests.length === 0,
    supabase.state.calls.filter((call) => call.table === "more_guidance_readings" && call.operation === "upsert").length === 0
  ].every(Boolean));
}

async function checkCachedPaidReadingBypassesOpenAI() {
  const date = "2026-06-24";
  const user = paidUser("cached-member");
  const cachedGuidance = {
    overview: "The paid map begins with the half-written list on the table: a practical duty has been carrying more feeling than it deserves. Mira, let the day become less dramatic by giving the oldest task a time and a finish line. This deeper phase is about separating care from availability, especially where someone else's uncertainty keeps asking for your extra explanation. Keep the work visible, protect the first quiet hour, and let one completed promise become the proof your nervous system can trust.",
    thisWeek: "This week, choose the repair that future-you will notice. Keep one reply short, name one cost before agreeing, and let the practical shape of care matter more than intensity.",
    thisMonth: "This month, watch the same pressure return through different duties. Build one visible routine around communication, sleep, or money so the pattern has somewhere useful to land.",
    practice: "For seven days, write the oldest open loop each morning and close one small part before starting a new promise.",
    focus: "Make care visible through structure",
    watch: "Explaining when timing is enough"
  };
  const supabase = createFakeSupabase({
    subscriptions: [activeSubscription(user.id)],
    moreGuidanceReadings: [{
      id: "paid-cached-1",
      user_key: user.id,
      reading_date: date,
      prompt_version: DEEP_GUIDANCE_PROMPT_VERSION,
      model: "gpt-paid",
      created_at: "2026-06-24T04:00:00.000Z",
      guidance: cachedGuidance,
      astrology_context: {
        dailyArea: "unfinished work and personal authority"
      }
    }]
  });
  const openAiCalls = [];

  const result = await createMoreGuidanceReading({
    user,
    date
  }, {
    OPENAI_API_KEY: ""
  }, {
    supabase,
    createOpenAIClient() {
      openAiCalls.push("created");
      throw new Error("OpenAI should not be created for cached paid guidance");
    }
  });

  pushCheck("Cached paid guidance returns Supabase source", [
    result.allowed === true,
    result.cached === true,
    result.source === "supabase",
    result.guidance?.overview === cachedGuidance.overview,
    result.promptVersion === DEEP_GUIDANCE_PROMPT_VERSION,
    result.readingDate === date
  ].every(Boolean));
  pushCheck("Cached paid guidance bypasses OpenAI without API key", openAiCalls.length === 0);
}

async function checkPaidCacheMissWritesAndSecondReadUsesCache() {
  const date = "2026-06-24";
  const user = paidUser("fresh-member");
  const guidanceJson = JSON.stringify({
    overview: "The deeper pattern starts with the document you keep reopening without changing: effort is present, but the finish line keeps moving because approval has become part of the task. Mira, separate the work from the audience for one clean hour and let the result be ordinary enough to complete. In relationships, do not turn quick access into proof of care. In money and planning, write the real cost before saying yes. This month becomes lighter when structure replaces repeated explanation.",
    thisWeek: "This week, give one task a named finish line and protect it from extra commentary. Shorten the message, schedule the repair, and let consistency do the persuading.",
    thisMonth: "This month, watch where the same demand returns through work, family, and private expectation. Build one visible habit around time, spending, or rest so the pressure stops living only in your head.",
    practice: "For seven days, start with one written cost and one written limit. At night, record what became easier because the shape was clear.",
    focus: "Finish before seeking approval",
    watch: "Turning access into reassurance"
  });
  const supabase = createFakeSupabase({
    subscriptions: [activeSubscription(user.id)]
  });
  const openAiRequests = [];
  const memoryUpserts = [];

  const deps = {
    supabase,
    searchGuidanceMemory: async () => ({
      configured: true,
      matches: [{
        text: "Mira saved earlier advice about closing unfinished loops before over-explaining."
      }]
    }),
    upsertGuidanceMemory: async (payload) => {
      memoryUpserts.push(payload);
      return { configured: true, upserted: true };
    },
    createOpenAIClient() {
      return {
        responses: {
          create: async (request) => {
            openAiRequests.push(request);
            return { output_text: guidanceJson };
          }
        }
      };
    }
  };

  const first = await createMoreGuidanceReading({
    user,
    date,
    today: "Wednesday, June 24, 2026"
  }, {
    OPENAI_API_KEY: "test-openai-key",
    MORE_GUIDANCE_MODEL: "gpt-paid-contract"
  }, deps);
  const second = await createMoreGuidanceReading({
    user,
    date,
    today: "Wednesday, June 24, 2026"
  }, {
    OPENAI_API_KEY: "test-openai-key",
    MORE_GUIDANCE_MODEL: "gpt-paid-contract"
  }, deps);

  const paidWrites = supabase.state.calls.filter((call) => call.table === "more_guidance_readings" && call.operation === "upsert");
  const profileWrites = supabase.state.calls.filter((call) => call.table === "user_profiles" && call.operation === "upsert");
  const storedReading = [...supabase.state.moreGuidanceReadings.values()][0];

  pushCheck("Paid cache miss calls backend OpenAI once", [
    openAiRequests.length === 1,
    first.allowed === true,
    first.cached === false,
    first.source === "openai",
    first.model === "gpt-paid-contract",
    first.promptVersion === DEEP_GUIDANCE_PROMPT_VERSION,
    first.guidance?.overview.includes("Mira")
  ].every(Boolean));
  pushCheck("Paid cache miss writes one daily More Guidance reading", [
    paidWrites.length === 1,
    storedReading.user_key === user.id,
    storedReading.reading_date === date,
    storedReading.prompt_version === DEEP_GUIDANCE_PROMPT_VERSION,
    storedReading.model === "gpt-paid-contract",
    storedReading.guidance?.overview === first.guidance.overview,
    storedReading.astrology_context
  ].every(Boolean));
  pushCheck("Paid cache write upserts the user profile", [
    profileWrites.length === 1,
    profileWrites[0].payload.phone === user.phone,
    profileWrites[0].payload.email === user.email,
    profileWrites[0].payload.birth_place === user.birthPlace
  ].every(Boolean));
  pushCheck("Second paid same-day read uses cache without OpenAI", [
    second.allowed === true,
    second.cached === true,
    second.source === "supabase",
    second.guidance?.overview === first.guidance.overview,
    openAiRequests.length === 1,
    paidWrites.length === 1
  ].every(Boolean));
  pushCheck("Paid reading is stored in guidance memory once", [
    memoryUpserts.length === 1,
    memoryUpserts[0].kind === "more-guidance-reading",
    memoryUpserts[0].sourceId === `${date}-${DEEP_GUIDANCE_PROMPT_VERSION}`,
    memoryUpserts[0].metadata?.source === "openai",
    memoryUpserts[0].metadata?.model === "gpt-paid-contract"
  ].every(Boolean));
}

function createFakeSupabase({ subscriptions = [], moreGuidanceReadings = [] } = {}) {
  const state = {
    calls: [],
    subscriptions: new Map(),
    moreGuidanceReadings: new Map(),
    profiles: new Map(),
    nextProfileId: 1,
    nextReadingId: 1
  };

  for (const subscription of subscriptions) {
    state.subscriptions.set(subscription.user_key, { ...subscription });
  }
  for (const reading of moreGuidanceReadings) {
    state.moreGuidanceReadings.set(readingKey(reading), { ...reading });
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
    this.result = { data: null, error: null };
  }

  select() {
    return this;
  }

  eq(column, value) {
    this.filters[column] = value;
    return this;
  }

  order() {
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

    if (this.table === "more_guidance_readings") {
      const key = readingKey(payload);
      const existing = this.state.moreGuidanceReadings.get(key);
      const reading = {
        ...existing,
        ...clone(payload),
        id: existing?.id || `paid-${this.state.nextReadingId++}`,
        created_at: existing?.created_at || "2026-06-24T00:00:00.000Z"
      };
      this.state.moreGuidanceReadings.set(key, reading);
      this.result = { data: reading, error: null };
      return this;
    }

    return this;
  }

  async maybeSingle() {
    if (this.table === "more_guidance_subscriptions") {
      return {
        data: this.state.subscriptions.get(this.filters.user_key) || null,
        error: null
      };
    }

    if (this.table === "more_guidance_readings") {
      const key = readingKey({
        user_key: this.filters.user_key,
        reading_date: this.filters.reading_date,
        prompt_version: this.filters.prompt_version
      });
      return {
        data: this.state.moreGuidanceReadings.get(key) || null,
        error: null
      };
    }

    return this.result;
  }

  then(resolve, reject) {
    return Promise.resolve(this.result).then(resolve, reject);
  }
}

function activeSubscription(userKey) {
  return {
    id: `subscription-${userKey}`,
    user_key: userKey,
    plan_name: "Soul Guru + Astro Solve",
    status: "active",
    starts_at: "2026-06-01T00:00:00.000Z",
    ends_at: "2099-06-01T00:00:00.000Z",
    astro_bonus_questions: 15,
    provider: "razorpay",
    provider_payment_id: `pay-${userKey}`,
    provider_subscription_id: null,
    metadata: {},
    created_at: "2026-06-01T00:00:00.000Z"
  };
}

function paidUser(id) {
  return {
    id,
    name: "Mira Rao",
    phone: "+919800000002",
    email: `${id}@soulguru.local`,
    birthDate: "1995-02-11",
    birthTime: "10:15",
    birthPlace: "Jaipur"
  };
}

function readingKey(reading) {
  return [
    reading.user_key,
    reading.reading_date,
    reading.prompt_version
  ].join("|");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function printReport() {
  const failed = checks.filter((check) => !check.passed);
  console.log(`More Guidance contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}

async function main() {
  await checkPersistedSubscriptionRequired();
  await checkCachedPaidReadingBypassesOpenAI();
  await checkPaidCacheMissWritesAndSecondReadUsesCache();

  const failed = checks.filter((check) => !check.passed);
  printReport();

  if (failed.length > 0) {
    process.exit(1);
  }
}

await main();
