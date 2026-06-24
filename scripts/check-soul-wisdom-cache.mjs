import {
  createDailySoulWisdom,
  isUncachedSoulWisdomAllowed,
  SOUL_WISDOM_PROMPT_VERSION
} from "../src/backend/soulWisdomService.js";

const checks = [];

async function checkUncachedModeRequiresExplicitFlag() {
  const user = soulUser("uncached-default");
  const openAiRequests = [];
  let error = null;

  try {
    await createDailySoulWisdom({
      user,
      date: "2026-06-24"
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

  pushCheck("Soul Guru uncached mode requires explicit server flag", [
    error?.statusCode === 503,
    /Supabase is required/.test(error?.message || ""),
    openAiRequests.length === 0,
    isUncachedSoulWisdomAllowed({ SOUL_WISDOM_ALLOW_UNCACHED: "true" }) === true,
    isUncachedSoulWisdomAllowed({ SOUL_WISDOM_ALLOW_UNCACHED: "false" }) === false
  ].every(Boolean));
}

async function checkExplicitUncachedModeReturnsUnstoredReading() {
  const user = soulUser("uncached-enabled");
  const wisdomJson = JSON.stringify({
    wisdom: "The notebook beside your cup is asking for a smaller promise than the one your mind keeps building. Tara, write the sentence that names the real task, then leave the larger worry outside the room for one hour. The sensitive point is not effort; it is the way pressure keeps pretending to be preparation. Finish one thing that can be verified today, and let the rest wait without earning more attention.",
    innerWeather: "Pressure becoming practical",
    todayMove: "Name the real task",
    release: "Stop rehearsing the larger worry"
  });
  const openAiRequests = [];
  const memoryUpserts = [];

  const result = await createDailySoulWisdom({
    user,
    date: "2026-06-24"
  }, {
    OPENAI_API_KEY: "test-openai-key",
    OPENAI_MODEL: "gpt-contract",
    SOUL_WISDOM_ALLOW_UNCACHED: "true"
  }, {
    supabase: null,
    searchGuidanceMemory: async () => ({ configured: false, matches: [] }),
    upsertGuidanceMemory: async (payload) => {
      memoryUpserts.push(payload);
      return { configured: false, upserted: false };
    },
    createOpenAIClient() {
      return {
        responses: {
          create: async (request) => {
            openAiRequests.push(request);
            return { output_text: wisdomJson };
          }
        }
      };
    }
  });

  pushCheck("Explicit uncached Soul Guru mode returns unstored quality-test reading", [
    result.cached === false,
    result.stored === false,
    result.model === "gpt-contract",
    result.promptVersion === SOUL_WISDOM_PROMPT_VERSION,
    openAiRequests.length === 1,
    memoryUpserts.length === 1
  ].every(Boolean));
}

async function checkCacheReadFailureDoesNotCallOpenAI() {
  const supabase = createFakeSupabase({ failDailySelect: true });
  const openAiRequests = [];
  const originalWarn = console.warn;
  let error = null;

  try {
    console.warn = () => {};
    await createDailySoulWisdom({
      user: soulUser("cache-read-failure"),
      date: "2026-06-24"
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

  pushCheck("Soul Guru cache read failure does not call OpenAI", [
    error?.statusCode === 503,
    /cache could not be checked/.test(error?.message || ""),
    openAiRequests.length === 0,
    supabase.state.calls.filter((call) => call.table === "daily_soul_readings" && call.operation === "upsert").length === 0
  ].every(Boolean));
}

async function checkCachedReadingBypassesOpenAI() {
  const date = "2026-06-24";
  const cachedWisdom = "The blue cup near your notes points to a day that wants fewer scattered promises. Tara, put the difficult message beside the practical task and finish the task first, because your mind is turning delay into a private accusation. The useful move is small: name the request, name the limit, and stop decorating the answer. Warmth will not disappear because you choose timing. Let one clean completion settle the room before you explain anything else.";
  const supabase = createFakeSupabase({
    dailyReadings: [{
      id: "daily-cached-1",
      user_key: "tara-cache",
      reading_date: date,
      prompt_version: SOUL_WISDOM_PROMPT_VERSION,
      model: "gpt-test",
      created_at: "2026-06-24T03:00:00.000Z",
      reading: {
        wisdom: cachedWisdom,
        innerWeather: "Focused after private pressure",
        todayMove: "Finish the task before replying",
        release: "Drop the decorative explanation"
      },
      astrology_context: {
        dailyArea: "relationship tone and unspoken expectations"
      }
    }]
  });
  const openAiCalls = [];

  const result = await createDailySoulWisdom({
    user: { id: "tara-cache", name: "Tara Sen", birthDate: "1992-04-12", birthTime: "08:20", birthPlace: "Pune" },
    date
  }, {
    OPENAI_API_KEY: ""
  }, {
    supabase,
    createOpenAIClient() {
      openAiCalls.push("created");
      throw new Error("OpenAI should not be created for cached readings");
    }
  });

  pushCheck("Cached reading returns Supabase source", [
    result.cached === true,
    result.source === "supabase",
    result.stored === true,
    result.wisdom === cachedWisdom,
    result.promptVersion === SOUL_WISDOM_PROMPT_VERSION,
    result.readingDate === date
  ].every(Boolean));
  pushCheck("Cached reading bypasses OpenAI without API key", openAiCalls.length === 0);
  pushCheck("Cached reading does not rewrite cache", supabase.state.calls.filter((call) => call.table === "daily_soul_readings" && call.operation === "upsert").length === 0);
}

async function checkCacheMissWritesAndSecondReadUsesCache() {
  const date = "2026-06-24";
  const user = {
    id: "leela-cache",
    name: "Leela Nair",
    phone: "+919800000001",
    email: "leela@soulguru.local",
    birthDate: "1987-10-03",
    birthTime: "19:42",
    birthPlace: "Kochi"
  };
  const wisdomJson = JSON.stringify({
    wisdom: "An unopened notebook beside the charger is the clue: your mind has been keeping a decision half lit because finishing it would make the next request real. Leela, give that thought a place on paper before lunch, then close every extra tab that turns it into a performance. The sensitive point today is not whether you care enough; it is whether care has a shape. Answer one practical thing cleanly, and let the mood catch up later.",
    innerWeather: "Sensitive but ready to act",
    todayMove: "Write the decision before lunch",
    release: "Close every extra tab"
  });
  const supabase = createFakeSupabase();
  const openAiRequests = [];
  const memoryUpserts = [];

  const deps = {
    supabase,
    searchGuidanceMemory: async () => ({
      configured: true,
      matches: [{
        text: "Leela recently saved advice about over-explaining work decisions."
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
            return { output_text: wisdomJson };
          }
        }
      };
    }
  };

  const first = await createDailySoulWisdom({
    user,
    date,
    today: "Wednesday, June 24, 2026"
  }, {
    OPENAI_API_KEY: "test-openai-key",
    OPENAI_MODEL: "gpt-contract"
  }, deps);

  const second = await createDailySoulWisdom({
    user,
    date,
    today: "Wednesday, June 24, 2026"
  }, {
    OPENAI_API_KEY: "test-openai-key",
    OPENAI_MODEL: "gpt-contract"
  }, deps);

  const dailyWrites = supabase.state.calls.filter((call) => call.table === "daily_soul_readings" && call.operation === "upsert");
  const profileWrites = supabase.state.calls.filter((call) => call.table === "user_profiles" && call.operation === "upsert");
  const storedReading = [...supabase.state.dailyReadings.values()][0];

  pushCheck("Cache miss calls backend OpenAI once", [
    openAiRequests.length === 1,
    first.cached === false,
    first.stored === true,
    first.model === "gpt-contract",
    first.promptVersion === SOUL_WISDOM_PROMPT_VERSION,
    first.reading.wisdom.includes("Leela"),
    first.memory.used === true,
    first.quality.passed === true
  ].every(Boolean));
  pushCheck("Cache miss writes one daily reading", [
    dailyWrites.length === 1,
    storedReading.user_key === "leela-cache",
    storedReading.reading_date === date,
    storedReading.prompt_version === SOUL_WISDOM_PROMPT_VERSION,
    storedReading.model === "gpt-contract",
    storedReading.reading?.wisdom === first.wisdom,
    storedReading.astrology_context
  ].every(Boolean));
  pushCheck("Cache write upserts the user profile", [
    profileWrites.length === 1,
    profileWrites[0].payload.phone === user.phone,
    profileWrites[0].payload.email === user.email,
    profileWrites[0].payload.birth_place === user.birthPlace
  ].every(Boolean));
  pushCheck("Second same-day read uses cache without OpenAI", [
    second.cached === true,
    second.source === "supabase",
    second.stored === true,
    second.wisdom === first.wisdom,
    openAiRequests.length === 1,
    dailyWrites.length === 1
  ].every(Boolean));
  pushCheck("Fresh reading is stored in guidance memory once", [
    memoryUpserts.length === 1,
    memoryUpserts[0].kind === "daily-soul-reading",
    memoryUpserts[0].sourceId === `${date}-${SOUL_WISDOM_PROMPT_VERSION}`,
    memoryUpserts[0].metadata?.model === "gpt-contract"
  ].every(Boolean));
}

async function checkCacheWriteFailureDoesNotReturnReading() {
  const user = soulUser("cache-failure");
  const wisdomJson = JSON.stringify({
    wisdom: "The glass of water near the paper is enough of a beginning for the day. Tara, make the first action plain before the worry turns it into a performance. The pressure underneath this is not weakness; it is the habit of measuring care by how much tension you can carry. Finish the visible task, leave one sentence unsent, and give your body proof that progress does not need drama.",
    innerWeather: "Focused under private pressure",
    todayMove: "Finish the visible task",
    release: "Leave one sentence unsent"
  });
  const supabase = createFakeSupabase({ failDailyUpsert: true });
  const openAiRequests = [];
  const memoryUpserts = [];
  const originalWarn = console.warn;
  let error = null;

  try {
    console.warn = () => {};
    await createDailySoulWisdom({
      user,
      date: "2026-06-24"
    }, {
      OPENAI_API_KEY: "test-openai-key"
    }, {
      supabase,
      searchGuidanceMemory: async () => ({ configured: false, matches: [] }),
      upsertGuidanceMemory: async (payload) => {
        memoryUpserts.push(payload);
        return { configured: false, upserted: false };
      },
      createOpenAIClient() {
        return {
          responses: {
            create: async (request) => {
              openAiRequests.push(request);
              return { output_text: wisdomJson };
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

  pushCheck("Soul Guru cache write failure does not return uncached reading", [
    error?.statusCode === 503,
    /could not be cached/.test(error?.message || ""),
    openAiRequests.length === 1,
    memoryUpserts.length === 0,
    supabase.state.calls.filter((call) => call.table === "daily_soul_readings" && call.operation === "upsert").length === 1
  ].every(Boolean));
}

function createFakeSupabase({ dailyReadings = [], failDailySelect = false, failDailyUpsert = false } = {}) {
  const state = {
    calls: [],
    dailyReadings: new Map(),
    profiles: new Map(),
    nextProfileId: 1,
    nextDailyId: 1,
    failDailySelect,
    failDailyUpsert
  };

  for (const reading of dailyReadings) {
    state.dailyReadings.set(dailyKey(reading), { ...reading });
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

    if (this.table === "daily_soul_readings") {
      if (this.state.failDailyUpsert) {
        this.result = {
          data: null,
          error: { message: "contract cache failure" }
        };
        return this;
      }

      const key = dailyKey(payload);
      const existing = this.state.dailyReadings.get(key);
      const reading = {
        ...existing,
        ...clone(payload),
        id: existing?.id || `daily-${this.state.nextDailyId++}`,
        created_at: existing?.created_at || "2026-06-24T00:00:00.000Z"
      };
      this.state.dailyReadings.set(key, reading);
      this.result = { data: reading, error: null };
      return this;
    }

    return this;
  }

  async maybeSingle() {
    if (this.table === "daily_soul_readings") {
      if (this.state.failDailySelect) {
        return {
          data: null,
          error: { message: "contract cache read failure" }
        };
      }

      const key = dailyKey({
        user_key: this.filters.user_key,
        reading_date: this.filters.reading_date,
        prompt_version: this.filters.prompt_version
      });
      return {
        data: this.state.dailyReadings.get(key) || null,
        error: null
      };
    }

    return this.result;
  }

  then(resolve, reject) {
    return Promise.resolve(this.result).then(resolve, reject);
  }
}

function dailyKey(reading) {
  return [
    reading.user_key,
    reading.reading_date,
    reading.prompt_version
  ].join("|");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function soulUser(id) {
  return {
    id,
    name: "Tara Sen",
    phone: "+919800000002",
    email: `${id}@soulguru.local`,
    birthDate: "1992-04-12",
    birthTime: "08:20",
    birthPlace: "Pune"
  };
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function printReport() {
  const failed = checks.filter((check) => !check.passed);
  console.log(`Soul Wisdom cache contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}

async function main() {
  await checkUncachedModeRequiresExplicitFlag();
  await checkExplicitUncachedModeReturnsUnstoredReading();
  await checkCacheReadFailureDoesNotCallOpenAI();
  await checkCachedReadingBypassesOpenAI();
  await checkCacheMissWritesAndSecondReadUsesCache();
  await checkCacheWriteFailureDoesNotReturnReading();

  const failed = checks.filter((check) => !check.passed);
  printReport();

  if (failed.length > 0) {
    process.exit(1);
  }
}

await main();
