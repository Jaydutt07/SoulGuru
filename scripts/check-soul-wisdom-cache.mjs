import {
  createDailySoulWisdom,
  isUncachedSoulWisdomAllowed,
  readCachedDailySoulWisdom,
  SOUL_WISDOM_PROMPT_VERSION
} from "../src/backend/soulWisdomService.js";
import { buildBackendUserKey, isBackendUserKey } from "../src/backend/userIdentity.js";
import { buildAstrologyContext, buildTransitDateForUser } from "../src/astrologyEngine.js";

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
  const date = "2026-06-24";
  const today = "Wednesday, June 24, 2026";
  const wisdomJson = contractWisdomJson(user, date);
  const openAiRequests = [];
  const memoryUpserts = [];

  const result = await createDailySoulWisdom({
    user,
    date,
    today
  }, {
    OPENAI_API_KEY: "test-openai-key",
    OPENAI_MODEL: "gpt-contract",
    SOUL_WISDOM_MODEL: "gpt-soul-contract",
    SOUL_WISDOM_MAX_OUTPUT_TOKENS: "180",
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
    result.model === "gpt-soul-contract",
    result.promptVersion === SOUL_WISDOM_PROMPT_VERSION,
    openAiRequests.length === 1,
    openAiRequests[0].model === "gpt-soul-contract",
    openAiRequests[0].max_output_tokens === 180,
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
  const user = { id: "tara-cache", name: "Tara Sen", birthDate: "1992-04-12", birthTime: "08:20", birthPlace: "Pune" };
  const userKey = buildBackendUserKey(user);
  const cachedWisdom = "The blue cup near your notes points to a day that wants fewer scattered promises. Tara, put the difficult message beside the practical task and finish the task first, because your mind is turning delay into a private accusation. The useful move is small: name the request, name the limit, and stop decorating the answer. Warmth will not disappear because you choose timing. Let one clean completion settle the room before you explain anything else.";
  const supabase = createFakeSupabase({
    dailyReadings: [{
      id: "daily-cached-1",
      user_key: userKey,
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
    user,
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
    isBackendUserKey(userKey),
    result.wisdom === cachedWisdom,
    result.promptVersion === SOUL_WISDOM_PROMPT_VERSION,
    result.readingDate === date
  ].every(Boolean));
  pushCheck("Cached reading bypasses OpenAI without API key", openAiCalls.length === 0);
  pushCheck("Cached reading does not rewrite cache", supabase.state.calls.filter((call) => call.table === "daily_soul_readings" && call.operation === "upsert").length === 0);
}

async function checkCachedReaderBypassesRateLimitedGenerationPath() {
  const date = "2026-06-24";
  const user = { id: "tara-cache-reader", name: "Tara Sen", birthDate: "1992-04-12", birthTime: "08:20", birthPlace: "Pune" };
  const userKey = buildBackendUserKey(user);
  const supabase = createFakeSupabase({
    dailyReadings: [{
      id: "daily-cached-reader-1",
      user_key: userKey,
      reading_date: date,
      prompt_version: SOUL_WISDOM_PROMPT_VERSION,
      model: "gpt-test",
      created_at: "2026-06-24T03:00:00.000Z",
      reading: {
        wisdom: "The notebook line that waits near the morning task gives Tara a clean place to stop explaining. Use the first quiet block to finish the one promise that can be seen, then keep the reply short enough to remain kind. A fed body and a closed note will carry more trust than another private hearing. When the room asks for proof, point it toward the completed detail.",
        innerWeather: "Focused after private pressure",
        todayMove: "Finish the visible promise",
        release: "Drop the extra defense"
      },
      astrology_context: {
        dailyArea: "relationship tone and unspoken expectations"
      }
    }]
  });

  const result = await readCachedDailySoulWisdom({
    user,
    date
  }, {
    OPENAI_API_KEY: ""
  }, {
    supabase
  });

  pushCheck("Cache-first Soul Guru reader returns stored reading without generation", [
    result.cached === true,
    result.source === "supabase",
    result.stored === true,
    result.wisdom === result.reading.wisdom,
    result.promptVersion === SOUL_WISDOM_PROMPT_VERSION,
    supabase.state.calls.filter((call) => call.table === "daily_soul_readings" && call.operation === "upsert").length === 0,
    supabase.state.calls.filter((call) => call.table === "soul_wisdom_generation_locks").length === 0
  ].every(Boolean));
}

async function checkCacheMissWritesAndSecondReadUsesCache() {
  const date = "2026-06-24";
  const today = "Wednesday, June 24, 2026";
  const user = {
    id: "leela-cache",
    name: "Leela Nair",
    phone: "+919800000001",
    email: "leela@soulguru.local",
    birthDate: "1987-10-03",
    birthTime: "19:42",
    birthPlace: "Kochi"
  };
  const wisdomJson = contractWisdomJson(user, date);
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
    today
  }, {
    OPENAI_API_KEY: "test-openai-key",
    OPENAI_MODEL: "gpt-contract"
  }, deps);

  const second = await createDailySoulWisdom({
    user,
    date,
    today
  }, {
    OPENAI_API_KEY: "test-openai-key",
    OPENAI_MODEL: "gpt-contract"
  }, deps);

  const dailyWrites = supabase.state.calls.filter((call) => call.table === "daily_soul_readings" && call.operation === "upsert");
  const profileWrites = supabase.state.calls.filter((call) => call.table === "user_profiles" && call.operation === "upsert");
  const lockInserts = supabase.state.calls.filter((call) => call.table === "soul_wisdom_generation_locks" && call.operation === "insert");
  const lockDeletes = supabase.state.calls.filter((call) => call.table === "soul_wisdom_generation_locks" && call.operation === "delete");
  const storedReading = [...supabase.state.dailyReadings.values()][0];
  const userKey = buildBackendUserKey(user);

  pushCheck("Cache miss calls backend OpenAI once", [
    openAiRequests.length === 1,
    openAiRequests[0].max_output_tokens === 220,
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
    storedReading.user_key === userKey,
    isBackendUserKey(storedReading.user_key),
    storedReading.user_key !== user.id,
    storedReading.user_key !== user.phone,
    storedReading.user_key !== user.email,
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
  pushCheck("Cache miss acquires and releases one daily generation lock", [
    lockInserts.length === 1,
    lockInserts[0].payload.user_key === userKey,
    isBackendUserKey(lockInserts[0].payload.user_key),
    lockInserts[0].payload.reading_date === date,
    lockInserts[0].payload.prompt_version === SOUL_WISDOM_PROMPT_VERSION,
    lockTtlRemainingMs(lockInserts[0].payload.expires_at) >= 240000,
    lockTtlRemainingMs(lockInserts[0].payload.expires_at) <= 310000,
    lockDeletes.length >= 2,
    supabase.state.generationLocks.size === 0
  ].every(Boolean));
  pushCheck("Fresh reading is stored in guidance memory once", [
    memoryUpserts.length === 1,
    memoryUpserts[0].kind === "daily-soul-reading",
    memoryUpserts[0].sourceId === `${date}-${SOUL_WISDOM_PROMPT_VERSION}`,
    memoryUpserts[0].metadata?.model === "gpt-contract"
  ].every(Boolean));
}

async function checkMemoryUpsertDoesNotBlockReadingResponse() {
  const date = "2026-06-24";
  const user = soulUser("memory-nonblocking");
  const wisdomJson = contractWisdomJson(user, date);
  const supabase = createFakeSupabase();
  let resolveMemory;
  let memoryStarted = false;
  let memorySettled = false;

  const result = await createDailySoulWisdom({
    user,
    date
  }, {
    OPENAI_API_KEY: "test-openai-key",
    OPENAI_MODEL: "gpt-contract"
  }, {
    supabase,
    searchGuidanceMemory: async () => ({ configured: false, matches: [] }),
    upsertGuidanceMemory: async () => {
      memoryStarted = true;
      return new Promise((resolve) => {
        resolveMemory = () => {
          memorySettled = true;
          resolve({ configured: true, upserted: true });
        };
      });
    },
    createOpenAIClient() {
      return {
        responses: {
          create: async () => ({ output_text: wisdomJson })
        }
      };
    }
  });

  await Promise.resolve();

  pushCheck("Soul Guru returns cached reading response before deferred memory upsert settles", [
    result.stored === true,
    result.cached === false,
    result.quality?.passed === true,
    memoryStarted === true,
    memorySettled === false
  ].every(Boolean));

  resolveMemory?.();
  await Promise.resolve();
}

async function checkGenerationLockContentionDoesNotCallOpenAI() {
  const user = soulUser("lock-contention");
  const date = "2026-06-24";
  const userKey = buildBackendUserKey(user);
  const supabase = createFakeSupabase({
    generationLocks: [{
      user_key: userKey,
      reading_date: date,
      prompt_version: SOUL_WISDOM_PROMPT_VERSION,
      lock_owner: "existing-worker",
      expires_at: "2099-01-01T00:00:00.000Z"
    }]
  });
  const openAiRequests = [];
  let error = null;

  try {
    await createDailySoulWisdom({
      user,
      date
    }, {
      OPENAI_API_KEY: "test-openai-key",
      SOUL_WISDOM_LOCK_POLL_ATTEMPTS: "0",
      SOUL_WISDOM_LOCK_POLL_INTERVAL_MS: "0"
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
  }

  pushCheck("Concurrent daily Soul Guru generation returns 409 without OpenAI", [
    error?.statusCode === 409,
    /already being prepared/.test(error?.message || ""),
    openAiRequests.length === 0,
    supabase.state.calls.filter((call) => call.table === "soul_wisdom_generation_locks" && call.operation === "insert").length === 1,
    supabase.state.calls.filter((call) => call.table === "daily_soul_readings" && call.operation === "upsert").length === 0,
    supabase.state.generationLocks.size === 1
  ].every(Boolean));
}

async function checkSeedMismatchRepairsBeforeCaching() {
  const date = "2026-06-25";
  const user = {
    name: "Asha Rao",
    phone: "+919000000001",
    email: "asha@example.com",
    birthDate: "1994-08-17",
    birthTime: "06:35",
    birthPlace: "Mumbai"
  };
  const mismatchedWisdomJson = JSON.stringify({
    wisdom: "The calendar square keeps asking for a decision before the morning gets noisy. Asha, the useful pressure is not about doing everything; it is about giving one promise a visible edge before the day scatters. Write the smallest task clearly, keep the reply shorter than the worry, and let practical action happen before any private debate. If someone pulls for reassurance, answer with timing instead of a long defense. One completed detail will give your body better evidence than another round of thinking.",
    innerWeather: "Pressure becoming practical",
    todayMove: "Give one promise an edge",
    release: "Stop feeding the debate"
  });
  const repairedWisdom = buildContractReading(user, date);
  const supabase = createFakeSupabase();
  const openAiRequests = [];
  const memoryUpserts = [];

  const result = await createDailySoulWisdom({
    user,
    date
  }, {
    OPENAI_API_KEY: "test-openai-key",
    OPENAI_MODEL: "gpt-contract"
  }, {
    supabase,
    searchGuidanceMemory: async () => ({ configured: false, matches: [] }),
    upsertGuidanceMemory: async (payload) => {
      memoryUpserts.push(payload);
      return { configured: true, upserted: true };
    },
    createOpenAIClient() {
      return {
        responses: {
          create: async (request) => {
            openAiRequests.push(request);
            return {
              output_text: openAiRequests.length === 1
                ? mismatchedWisdomJson
                : JSON.stringify(repairedWisdom)
            };
          }
        }
      };
    }
  });

  const storedReading = [...supabase.state.dailyReadings.values()][0];

  pushCheck("Soul Guru repairs seeded-scene mismatch before caching", [
    openAiRequests.length === 2,
    /opening did not use seeded scene/.test(openAiRequests[1].input),
    result.quality?.attempts === 2,
    result.quality?.repaired === true,
    result.quality?.passed === true,
    result.wisdom === repairedWisdom.wisdom,
    storedReading.reading?.wisdom === repairedWisdom.wisdom,
    !storedReading.reading?.wisdom.includes("calendar square keeps asking"),
    memoryUpserts.length === 1
  ].every(Boolean));
}

async function checkQualityDiagnosticsAreOptIn() {
  const date = "2026-06-25";
  const user = {
    name: "Asha Rao",
    phone: "+919000000001",
    email: "asha@example.com",
    birthDate: "1994-08-17",
    birthTime: "06:35",
    birthPlace: "Mumbai"
  };
  const mismatchedWisdomJson = JSON.stringify({
    wisdom: "The calendar square keeps asking for a decision before the morning gets noisy. Asha, the useful pressure is not about doing everything; it is about giving one promise a visible edge before the day scatters. Write the smallest task clearly, keep the reply shorter than the worry, and let practical action happen before any private debate. If someone pulls for reassurance, answer with timing instead of a long defense. One completed detail will give your body better evidence than another round of thinking.",
    innerWeather: "Pressure becoming practical",
    todayMove: "Give one promise an edge",
    release: "Stop feeding the debate"
  });
  const repairedWisdom = buildContractReading(user, date);

  const withoutDiagnostics = await runUncachedRepairScenario({
    user,
    date,
    firstOutput: mismatchedWisdomJson,
    secondOutput: JSON.stringify(repairedWisdom),
    diagnostics: false
  });
  const withDiagnostics = await runUncachedRepairScenario({
    user,
    date,
    firstOutput: mismatchedWisdomJson,
    secondOutput: JSON.stringify(repairedWisdom),
    diagnostics: true
  });
  const serializedDiagnostics = JSON.stringify(withDiagnostics.result.quality?.issueHistory || []);

  pushCheck("Soul Guru quality diagnostics are explicit and secret-safe", [
    withoutDiagnostics.result.quality?.attempts === 2,
    withoutDiagnostics.result.quality?.issueHistory === undefined,
    withDiagnostics.result.quality?.attempts === 2,
    Array.isArray(withDiagnostics.result.quality?.issueHistory),
    withDiagnostics.result.quality.issueHistory.length === 2,
    withDiagnostics.result.quality.issueHistory[0].issues.length > 0,
    withDiagnostics.result.quality.issueHistory[1].issues.length === 0,
    !serializedDiagnostics.includes("calendar square keeps asking"),
    !serializedDiagnostics.includes("test-openai-key"),
    withDiagnostics.openAiRequests.length === 2
  ].every(Boolean));
}

async function runUncachedRepairScenario({ user, date, firstOutput, secondOutput, diagnostics }) {
  const openAiRequests = [];
  const result = await createDailySoulWisdom({
    user,
    date
  }, {
    OPENAI_API_KEY: "test-openai-key",
    OPENAI_MODEL: "gpt-contract",
    SOUL_WISDOM_ALLOW_UNCACHED: "true",
    ...(diagnostics ? { SOUL_WISDOM_QUALITY_DIAGNOSTICS: "true" } : {})
  }, {
    supabase: null,
    searchGuidanceMemory: async () => ({ configured: false, matches: [] }),
    upsertGuidanceMemory: async () => ({ configured: false, upserted: false }),
    createOpenAIClient() {
      return {
        responses: {
          create: async (request) => {
            openAiRequests.push(request);
            return {
              output_text: openAiRequests.length === 1
                ? firstOutput
                : secondOutput
            };
          }
        }
      };
    }
  });
  return { result, openAiRequests };
}

async function checkMechanicalDirectAddressRepairsBeforeCaching() {
  const date = "2026-06-25";
  const user = {
    name: "Asha Rao",
    phone: "+919000000001",
    email: "asha@example.com",
    birthDate: "1994-08-17",
    birthTime: "06:35",
    birthPlace: "Mumbai"
  };
  const mechanicalWisdomJson = JSON.stringify({
    wisdom: "The old mental tab keeps reopening, but the answer is not more thinking; it is giving one task a visible place. Write the smallest task clearly, keep the reply shorter than the worry, and let practical action happen before private debate. Asha, Notice where loyalty has become self-abandonment before the relationship tone starts deciding your whole day. If someone pulls for reassurance, answer with timing instead of a long defense, and let one completed detail give your body better evidence.",
    innerWeather: "Pressure becoming practical",
    todayMove: "Give one promise an edge",
    release: "Stop feeding the debate"
  });
  const repairedWisdom = buildContractReading(user, date);
  const supabase = createFakeSupabase();
  const openAiRequests = [];

  const result = await createDailySoulWisdom({
    user,
    date
  }, {
    OPENAI_API_KEY: "test-openai-key",
    OPENAI_MODEL: "gpt-contract"
  }, {
    supabase,
    searchGuidanceMemory: async () => ({ configured: false, matches: [] }),
    upsertGuidanceMemory: async () => ({ configured: true, upserted: true }),
    createOpenAIClient() {
      return {
        responses: {
          create: async (request) => {
            openAiRequests.push(request);
            return {
              output_text: openAiRequests.length === 1
                ? mechanicalWisdomJson
                : JSON.stringify(repairedWisdom)
            };
          }
        }
      };
    }
  });

  const storedReading = [...supabase.state.dailyReadings.values()][0];

  pushCheck("Soul Guru repairs mechanical direct-address casing before caching", [
    openAiRequests.length === 2,
    /direct address used mechanical capitalized imperative casing/.test(openAiRequests[1].input),
    result.quality?.attempts === 2,
    result.quality?.repaired === true,
    result.quality?.passed === true,
    result.wisdom === repairedWisdom.wisdom,
    storedReading.reading?.wisdom === repairedWisdom.wisdom,
    !storedReading.reading?.wisdom.includes("Asha, Notice")
  ].every(Boolean));
}

async function checkAwkwardTemplateJoinRepairsBeforeCaching() {
  const date = "2026-06-25";
  const user = {
    name: "Asha Rao",
    phone: "+919000000001",
    email: "asha@example.com",
    birthDate: "1994-08-17",
    birthTime: "06:35",
    birthPlace: "Mumbai"
  };
  const repairedWisdom = buildContractReading(user, date);
  const awkwardWisdomJson = JSON.stringify({
    ...repairedWisdom,
    wisdom: `Let turn the useful part into one finish. ${repairedWisdom.wisdom}`
  });
  const supabase = createFakeSupabase();
  const openAiRequests = [];

  const result = await createDailySoulWisdom({
    user,
    date
  }, {
    OPENAI_API_KEY: "test-openai-key",
    OPENAI_MODEL: "gpt-contract"
  }, {
    supabase,
    searchGuidanceMemory: async () => ({ configured: false, matches: [] }),
    upsertGuidanceMemory: async () => ({ configured: true, upserted: true }),
    createOpenAIClient() {
      return {
        responses: {
          create: async (request) => {
            openAiRequests.push(request);
            return {
              output_text: openAiRequests.length === 1
                ? awkwardWisdomJson
                : JSON.stringify(repairedWisdom)
            };
          }
        }
      };
    }
  });

  const storedReading = [...supabase.state.dailyReadings.values()][0];

  pushCheck("Soul Guru repairs awkward template joins before caching", [
    openAiRequests.length === 2,
    /matched low-quality or repeated phrasing rules/.test(openAiRequests[1].input),
    result.quality?.attempts === 2,
    result.quality?.repaired === true,
    result.quality?.passed === true,
    result.wisdom === repairedWisdom.wisdom,
    storedReading.reading?.wisdom === repairedWisdom.wisdom,
    !storedReading.reading?.wisdom.includes("Let turn")
  ].every(Boolean));
}

async function checkCacheWriteFailureDoesNotReturnReading() {
  const user = soulUser("cache-failure");
  const date = "2026-06-24";
  const wisdomJson = contractWisdomJson(user, date);
  const supabase = createFakeSupabase({ failDailyUpsert: true });
  const openAiRequests = [];
  const memoryUpserts = [];
  const originalWarn = console.warn;
  let error = null;

  try {
    console.warn = () => {};
    await createDailySoulWisdom({
      user,
      date
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

function createFakeSupabase({
  dailyReadings = [],
  generationLocks = [],
  failDailySelect = false,
  failDailyUpsert = false,
  failLockInsert = false,
  failLockDelete = false
} = {}) {
  const state = {
    calls: [],
    dailyReadings: new Map(),
    generationLocks: new Map(),
    profiles: new Map(),
    nextProfileId: 1,
    nextDailyId: 1,
    nextLockId: 1,
    failDailySelect,
    failDailyUpsert,
    failLockInsert,
    failLockDelete
  };

  for (const reading of dailyReadings) {
    state.dailyReadings.set(dailyKey(reading), { ...reading });
  }
  for (const lock of generationLocks) {
    state.generationLocks.set(lockKey(lock), {
      id: lock.id || `lock-${state.nextLockId++}`,
      created_at: lock.created_at || "2026-06-24T00:00:00.000Z",
      ...clone(lock)
    });
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
    this.pendingDelete = false;
    this.result = { data: null, error: null };
  }

  select() {
    return this;
  }

  eq(column, value) {
    this.filters[column] = value;
    return this;
  }

  lt(column, value) {
    this.filters[column] = { operator: "lt", value };
    return this;
  }

  delete() {
    this.pendingDelete = true;
    return this;
  }

  insert(payload) {
    this.state.calls.push({
      table: this.table,
      operation: "insert",
      payload: clone(payload)
    });

    if (this.table === "soul_wisdom_generation_locks") {
      if (this.state.failLockInsert) {
        this.result = {
          data: null,
          error: { message: "contract lock insert failure" }
        };
        return this;
      }

      const key = lockKey(payload);
      if (this.state.generationLocks.has(key)) {
        this.result = {
          data: null,
          error: {
            code: "23505",
            message: "duplicate key value violates unique constraint \"soul_wisdom_generation_locks_user_date_prompt_key\""
          }
        };
        return this;
      }

      const lock = {
        ...clone(payload),
        id: `lock-${this.state.nextLockId++}`,
        created_at: "2026-06-24T00:00:00.000Z"
      };
      this.state.generationLocks.set(key, lock);
      this.result = { data: lock, error: null };
      return this;
    }

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

  async single() {
    return this.result;
  }

  then(resolve, reject) {
    if (this.pendingDelete) {
      this.result = this.executeDelete();
      this.pendingDelete = false;
    }
    return Promise.resolve(this.result).then(resolve, reject);
  }

  executeDelete() {
    this.state.calls.push({
      table: this.table,
      operation: "delete",
      filters: clone(this.filters)
    });

    if (this.table !== "soul_wisdom_generation_locks") {
      return { data: null, error: null };
    }
    if (this.state.failLockDelete) {
      return { data: null, error: { message: "contract lock delete failure" } };
    }

    let deleted = 0;
    for (const [key, lock] of [...this.state.generationLocks.entries()]) {
      if (matchesFilters(lock, this.filters)) {
        this.state.generationLocks.delete(key);
        deleted += 1;
      }
    }

    return { data: { deleted }, error: null };
  }
}

function dailyKey(reading) {
  return [
    reading.user_key,
    reading.reading_date,
    reading.prompt_version
  ].join("|");
}

function lockKey(lock) {
  return [
    lock.user_key,
    lock.reading_date,
    lock.prompt_version
  ].join("|");
}

function lockTtlRemainingMs(expiresAt) {
  return new Date(expiresAt).getTime() - Date.now();
}

function matchesFilters(row, filters) {
  for (const [column, expected] of Object.entries(filters)) {
    if (expected && typeof expected === "object" && expected.operator === "lt") {
      if (!(String(row[column] || "") < String(expected.value || ""))) return false;
      continue;
    }
    if (row[column] !== expected) return false;
  }
  return true;
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

function contractWisdomJson(user, date) {
  return JSON.stringify(buildContractReading(user, date));
}

function buildContractReading(user, date) {
  const context = buildAstrologyContext(user, buildTransitDateForUser(user, date));
  const scene = sentenceCase(context.openingScene || context.dailyScene || "the desk detail that keeps returning");
  const name = firstName(user.name);
  const nameClause = name ? `, ${name}` : "";

  return {
    wisdom: `${scene} can stay small${nameClause}; finish one task by lunchtime today before making the story louder.`,
    innerWeather: "Focused under visible pressure",
    todayMove: "Finish one task before lunchtime",
    release: "Stop making the story louder"
  };
}

function sentenceCase(text) {
  const cleaned = String(text || "").replace(/[.!?]+$/g, "").trim();
  if (!cleaned) return "The desk detail";
  return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`;
}

function firstName(name) {
  return String(name || "friend").trim().split(/\s+/)[0] || "";
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
  await checkCachedReaderBypassesRateLimitedGenerationPath();
  await checkCacheMissWritesAndSecondReadUsesCache();
  await checkMemoryUpsertDoesNotBlockReadingResponse();
  await checkGenerationLockContentionDoesNotCallOpenAI();
  await checkSeedMismatchRepairsBeforeCaching();
  await checkQualityDiagnosticsAreOptIn();
  await checkMechanicalDirectAddressRepairsBeforeCaching();
  await checkAwkwardTemplateJoinRepairsBeforeCaching();
  await checkCacheWriteFailureDoesNotReturnReading();

  const failed = checks.filter((check) => !check.passed);
  printReport();

  if (failed.length > 0) {
    process.exit(1);
  }
}

await main();
