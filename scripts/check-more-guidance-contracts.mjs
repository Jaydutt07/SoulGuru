import {
  buildSubscriptionTracking,
  createMoreGuidanceReading,
  DEEP_GUIDANCE_PROMPT_VERSION,
  getMoreGuidanceDashboard,
  isLocalMoreGuidanceAllowed,
  saveGuidance
} from "../src/backend/guidanceService.js";

const checks = [];

async function checkLocalAccessRequiresExplicitFlag() {
  const user = paidUser("local-access-default");
  const openAiRequests = [];
  let error = null;

  try {
    await createMoreGuidanceReading({
      user: {
        ...user,
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

  pushCheck("More Guidance local access requires explicit server flag", [
    error?.statusCode === 503,
    /Supabase is required/.test(error?.message || ""),
    openAiRequests.length === 0,
    isLocalMoreGuidanceAllowed({ MORE_GUIDANCE_ALLOW_LOCAL_ACCESS: "true" }) === true,
    isLocalMoreGuidanceAllowed({ MORE_GUIDANCE_ALLOW_LOCAL_ACCESS: "false" }) === false
  ].every(Boolean));
}

async function checkExplicitLocalAccessReturnsUnstoredGuidance() {
  const user = paidUser("local-access-enabled");

  const result = await createMoreGuidanceReading({
    user: {
      ...user,
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
    },
    fallback: {
      overview: "Mira, the local test map is about making one practical duty visible before it grows emotional weight. Give the day a finish line, reduce the explanation around sensitive conversations, and let one completed action restore trust in your timing. This fallback is intentionally available only when the server opts into local More Guidance access.",
      thisWeek: "This week, protect one useful task from extra commentary. Shorten one reply and name one cost before agreeing.",
      thisMonth: "This month, watch the same pressure return through different duties and give it one repeatable structure.",
      practice: "For seven days, write one evening line about what became lighter because you handled it directly.",
      focus: "Make the pattern visible",
      watch: "Over-explaining under pressure"
    }
  }, {
    MORE_GUIDANCE_ALLOW_LOCAL_ACCESS: "true",
    MORE_GUIDANCE_DISABLE_OPENAI: "true"
  }, {
    supabase: null,
    upsertGuidanceMemory: async () => ({ configured: false, upserted: false })
  });

  pushCheck("Explicit local More Guidance access returns unstored fallback", [
    result.allowed === true,
    result.cached === false,
    result.stored === false,
    result.source === "local-fallback",
    result.promptVersion === DEEP_GUIDANCE_PROMPT_VERSION
  ].every(Boolean));
}

async function checkGeneratedLocalPaidGuidanceIsHighQuality() {
  const user = {
    ...paidUser("generated-local-paid"),
    soulGuruSubscription: {
      active: true,
      name: "Soul Guru + Astro Solve",
      astroBonusQuestions: 15
    }
  };
  const memoryUpserts = [];
  const result = await createMoreGuidanceReading({
    user,
    subscription: user.soulGuruSubscription,
    date: "2026-06-25"
  }, {
    MORE_GUIDANCE_ALLOW_LOCAL_ACCESS: "true",
    MORE_GUIDANCE_DISABLE_OPENAI: "true"
  }, {
    supabase: null,
    upsertGuidanceMemory: async (payload) => {
      memoryUpserts.push(payload);
      return { configured: false, upserted: false };
    }
  });
  const text = [
    result.guidance?.overview,
    result.guidance?.thisWeek,
    result.guidance?.thisMonth,
    result.guidance?.practice,
    result.guidance?.focus,
    result.guidance?.watch
  ].filter(Boolean).join("\n");

  pushCheck("Generated local paid guidance uses current quality fallback", [
    result.allowed === true,
    result.source === "local-fallback",
    result.promptVersion === DEEP_GUIDANCE_PROMPT_VERSION,
    result.quality?.passed === true,
    words(result.guidance?.overview).length >= 105,
    words(result.guidance?.thisWeek).length >= 45,
    words(result.guidance?.thisMonth).length >= 45,
    words(result.guidance?.practice).length >= 30,
    !/the deeper pattern|you may feel|trust the process|^This week,|^This month,/im.test(text),
    memoryUpserts.length === 1,
    memoryUpserts[0].kind === "more-guidance-reading"
  ].every(Boolean));
}

async function checkDashboardReturnsThreeMonthTracking() {
  const user = paidUser("dashboard-member");
  const now = new Date("2026-07-16T00:00:00.000Z");
  const supabase = createFakeSupabase({
    subscriptions: [activeSubscription(user.id, {
      starts_at: "2026-06-01T00:00:00.000Z",
      ends_at: "2026-09-01T00:00:00.000Z"
    })]
  });
  const expectedTracking = buildSubscriptionTracking({
    active: true,
    startedAt: "2026-06-01T00:00:00.000Z",
    endsAt: "2026-09-01T00:00:00.000Z"
  }, now);
  const result = await getMoreGuidanceDashboard({
    user,
    limit: 5
  }, {}, {
    supabase,
    now
  });

  pushCheck("More Guidance dashboard returns 3-month subscription tracking", [
    result.configured === true,
    result.subscription?.active === true,
    result.tracking?.status === expectedTracking.status,
    result.tracking?.daysLeft === expectedTracking.daysLeft,
    result.tracking?.progress === expectedTracking.progress,
    result.tracking?.monthIndex === 2,
    result.tracking?.checkpoints?.length === 3,
    result.tracking?.checkpoints?.some((checkpoint) => checkpoint.status === "current")
  ].every(Boolean));
}

async function checkDashboardReadFailuresReturnErrors() {
  const user = paidUser("dashboard-read-failure");
  const cases = [
    {
      label: "subscription",
      options: { failSubscriptionSelect: true },
      pattern: /subscription could not be checked/
    },
    {
      label: "history",
      options: { failHistorySelect: true },
      pattern: /history could not be loaded/
    },
    {
      label: "saved guidance",
      options: { failSavedSelect: true },
      pattern: /Saved guidance could not be loaded/
    }
  ];
  const results = [];
  const originalWarn = console.warn;

  try {
    console.warn = () => {};
    for (const item of cases) {
      let error = null;
      try {
        await getMoreGuidanceDashboard({
          user,
          limit: 5
        }, {}, {
          supabase: createFakeSupabase({
            subscriptions: [activeSubscription(user.id)],
            ...item.options
          })
        });
      } catch (caughtError) {
        error = caughtError;
      }
      results.push(error?.statusCode === 503 && item.pattern.test(error.message || ""));
    }
  } finally {
    console.warn = originalWarn;
  }

  pushCheck("More Guidance dashboard read failures do not return empty synced data", results.every(Boolean));
}

function checkSubscriptionTrackingLifecycle() {
  const subscription = {
    active: true,
    startedAt: "2026-06-01T00:00:00.000Z",
    endsAt: "2026-09-01T00:00:00.000Z"
  };
  const upcoming = buildSubscriptionTracking(subscription, new Date("2026-05-25T00:00:00.000Z"));
  const active = buildSubscriptionTracking(subscription, new Date("2026-07-01T00:00:00.000Z"));
  const complete = buildSubscriptionTracking(subscription, new Date("2026-09-01T00:00:00.000Z"));

  pushCheck("More Guidance tracking reports upcoming active and complete lifecycle states", [
    upcoming.status === "upcoming",
    upcoming.progress === 0,
    active.status === "active",
    active.monthIndex === 1,
    complete.status === "complete",
    complete.daysLeft === 0,
    complete.progress === 100,
    complete.checkpoints.every((checkpoint) => checkpoint.status === "complete")
  ].every(Boolean));
}

async function checkLocalSaveGuidanceRequiresExplicitFlag() {
  let error = null;
  try {
    await saveGuidance({
      user: paidUser("local-save-default"),
      sourceId: "saved-local-default",
      reading: {
        wisdom: "A short saved reading for contract coverage.",
        innerWeather: "Focused",
        todayMove: "Save one useful line",
        release: "Drop the rest"
      }
    }, {}, {
      supabase: null
    });
  } catch (caughtError) {
    error = caughtError;
  }

  pushCheck("Saved guidance local mode requires explicit server flag", [
    error?.statusCode === 503,
    /Supabase is required/.test(error?.message || "")
  ].every(Boolean));
}

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

async function checkPaidSubscriptionReadFailureDoesNotCallOpenAI() {
  const user = paidUser("paid-subscription-read-failure");
  const supabase = createFakeSupabase({
    failSubscriptionSelect: true
  });
  const openAiRequests = [];
  const originalWarn = console.warn;
  let error = null;

  try {
    console.warn = () => {};
    await createMoreGuidanceReading({
      user,
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

  pushCheck("Paid More Guidance subscription read failure does not call OpenAI", [
    error?.statusCode === 503,
    /subscription could not be checked/.test(error?.message || ""),
    openAiRequests.length === 0,
    supabase.state.calls.filter((call) => call.table === "more_guidance_readings" && call.operation === "upsert").length === 0
  ].every(Boolean));
}

async function checkCachedPaidReadingBypassesOpenAI() {
  const date = "2026-06-24";
  const user = paidUser("cached-member");
  const cachedGuidance = paidGuidanceFixture();
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
    result.stored === true,
    result.source === "supabase",
    result.guidance?.overview === cachedGuidance.overview,
    result.promptVersion === DEEP_GUIDANCE_PROMPT_VERSION,
    result.readingDate === date
  ].every(Boolean));
  pushCheck("Cached paid guidance bypasses OpenAI without API key", openAiCalls.length === 0);
}

async function checkPaidCacheReadFailureDoesNotCallOpenAI() {
  const date = "2026-06-24";
  const user = paidUser("read-failure-member");
  const supabase = createFakeSupabase({
    subscriptions: [activeSubscription(user.id)],
    failReadingSelect: true
  });
  const openAiRequests = [];
  const originalWarn = console.warn;
  let error = null;

  try {
    console.warn = () => {};
    await createMoreGuidanceReading({
      user,
      date
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

  pushCheck("More Guidance cache read failure does not call OpenAI", [
    error?.statusCode === 503,
    /cache could not be checked/.test(error?.message || ""),
    openAiRequests.length === 0,
    supabase.state.calls.filter((call) => call.table === "more_guidance_readings" && call.operation === "upsert").length === 0
  ].every(Boolean));
}

async function checkPaidCacheMissWritesAndSecondReadUsesCache() {
  const date = "2026-06-24";
  const user = paidUser("fresh-member");
  const guidanceJson = JSON.stringify(paidGuidanceFixture());
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
    first.stored === true,
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
    second.stored === true,
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

async function checkPaidGuidanceRepairsLowQualityDraftBeforeCaching() {
  const date = "2026-06-25";
  const user = paidUser("repair-member");
  const weakGuidanceJson = JSON.stringify({
    overview: "Mira, you may feel a deeper pattern today, and the best thing is to stay steady. This phase asks for clarity, calm energy, and trust in the process while you make one small move.",
    thisWeek: "This week, keep moving gently and trust yourself.",
    thisMonth: "This month, stay open to better alignment.",
    practice: "Breathe and write what matters.",
    focus: "Trust the process",
    watch: "Energy shifts"
  });
  const repairedGuidance = paidGuidanceFixture({
    focus: "Give the promise a container",
    watch: "Instant access replacing care"
  });
  const supabase = createFakeSupabase({
    subscriptions: [activeSubscription(user.id)]
  });
  const openAiRequests = [];
  const memoryUpserts = [];

  const result = await createMoreGuidanceReading({
    user,
    date
  }, {
    OPENAI_API_KEY: "test-openai-key",
    MORE_GUIDANCE_MODEL: "gpt-paid-contract"
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
                ? weakGuidanceJson
                : JSON.stringify(repairedGuidance)
            };
          }
        }
      };
    }
  });

  const storedReading = [...supabase.state.moreGuidanceReadings.values()][0];

  pushCheck("Paid guidance repairs weak AI draft before caching", [
    openAiRequests.length === 2,
    /Quality repair/.test(openAiRequests[1].input),
    /you may feel/.test(openAiRequests[1].input),
    result.allowed === true,
    result.source === "openai",
    result.quality?.attempts === 2,
    result.quality?.repaired === true,
    result.quality?.passed === true,
    result.guidance.overview === repairedGuidance.overview,
    storedReading.guidance.overview === repairedGuidance.overview,
    !storedReading.guidance.overview.includes("you may feel"),
    memoryUpserts.length === 1,
    memoryUpserts[0].metadata?.source === "openai"
  ].every(Boolean));
}

async function checkPaidGuidanceUsesQualityFallbackAfterFailedRepair() {
  const date = "2026-06-26";
  const user = paidUser("failed-repair-member");
  const weakGuidanceJson = JSON.stringify({
    overview: "Mira, you may feel a deeper pattern today, and the universe could be asking for calm energy. Trust the process and choose one small steady thing.",
    thisWeek: "This week, stay steady and trust the process.",
    thisMonth: "This month, keep your energy clear.",
    practice: "Breathe, reflect, and stay open.",
    focus: "Trust the process",
    watch: "Energy shifts"
  });
  const supabase = createFakeSupabase({
    subscriptions: [activeSubscription(user.id)]
  });
  const openAiRequests = [];

  const result = await createMoreGuidanceReading({
    user,
    date
  }, {
    OPENAI_API_KEY: "test-openai-key",
    MORE_GUIDANCE_MODEL: "gpt-paid-contract"
  }, {
    supabase,
    searchGuidanceMemory: async () => ({ configured: false, matches: [] }),
    upsertGuidanceMemory: async () => ({ configured: true, upserted: true }),
    createOpenAIClient() {
      return {
        responses: {
          create: async (request) => {
            openAiRequests.push(request);
            return { output_text: weakGuidanceJson };
          }
        }
      };
    }
  });

  const storedReading = [...supabase.state.moreGuidanceReadings.values()][0];

  pushCheck("Paid guidance uses quality fallback after failed repair", [
    openAiRequests.length === 2,
    result.allowed === true,
    result.source === "quality-fallback",
    result.quality?.attempts === 2,
    result.quality?.repaired === true,
    result.quality?.passed === true,
    result.quality?.fallbackUsed === true,
    storedReading.guidance.overview === result.guidance.overview,
    !storedReading.guidance.overview.includes("you may feel"),
    !storedReading.guidance.focus.toLowerCase().includes("trust the process")
  ].every(Boolean));
}

async function checkPaidCacheWriteFailureDoesNotReturnReading() {
  const date = "2026-06-24";
  const user = paidUser("write-failure-member");
  const guidanceJson = JSON.stringify(paidGuidanceFixture());
  const supabase = createFakeSupabase({
    subscriptions: [activeSubscription(user.id)],
    failReadingUpsert: true
  });
  const openAiRequests = [];
  const memoryUpserts = [];
  const originalWarn = console.warn;
  let error = null;

  try {
    console.warn = () => {};
    await createMoreGuidanceReading({
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
              return { output_text: guidanceJson };
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

  pushCheck("More Guidance cache write failure does not return uncounted reading", [
    error?.statusCode === 503,
    /could not be cached/.test(error?.message || ""),
    openAiRequests.length === 1,
    memoryUpserts.length === 0,
    supabase.state.calls.filter((call) => call.table === "more_guidance_readings" && call.operation === "upsert").length === 1
  ].every(Boolean));
}

function createFakeSupabase({
  subscriptions = [],
  moreGuidanceReadings = [],
  failReadingSelect = false,
  failReadingUpsert = false,
  failSubscriptionSelect = false,
  failHistorySelect = false,
  failSavedSelect = false
} = {}) {
  const state = {
    calls: [],
    subscriptions: new Map(),
    moreGuidanceReadings: new Map(),
    profiles: new Map(),
    nextProfileId: 1,
    nextReadingId: 1,
    failReadingSelect,
    failReadingUpsert,
    failSubscriptionSelect,
    failHistorySelect,
    failSavedSelect
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
      if (this.state.failReadingUpsert) {
        this.result = {
          data: null,
          error: { message: "contract paid cache failure" }
        };
        return this;
      }

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
      if (this.state.failSubscriptionSelect) {
        return {
          data: null,
          error: { message: "contract subscription read failure" }
        };
      }
      return {
        data: this.state.subscriptions.get(this.filters.user_key) || null,
        error: null
      };
    }

    if (this.table === "more_guidance_readings") {
      if (this.state.failReadingSelect) {
        return {
          data: null,
          error: { message: "contract paid cache read failure" }
        };
      }

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
    if (this.table === "daily_soul_readings") {
      const result = this.state.failHistorySelect
        ? { data: null, error: { message: "contract history read failure" } }
        : { data: [], error: null };
      return Promise.resolve(result).then(resolve, reject);
    }

    if (this.table === "saved_guidance") {
      const result = this.state.failSavedSelect
        ? { data: null, error: { message: "contract saved read failure" } }
        : { data: [], error: null };
      return Promise.resolve(result).then(resolve, reject);
    }

    return Promise.resolve(this.result).then(resolve, reject);
  }
}

function activeSubscription(userKey, overrides = {}) {
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
    created_at: "2026-06-01T00:00:00.000Z",
    ...overrides
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

function paidGuidanceFixture(overrides = {}) {
  return {
    overview: "The notebook left open beside the calendar shows the real pattern: practical work keeps absorbing feelings that belong in a clearer conversation. Mira, the three-month map is to stop treating every unfinished detail as a private emergency and start giving each duty a clean container. The cost of the old habit is not only tiredness; it is delayed trust in your own timing. Put one promise on the page, name the limit around it, and let the next relationship or work reply respect that limit. When care becomes visible through structure, the day stops asking your body to carry every possible outcome without demanding a dramatic breakthrough.",
    thisWeek: "Begin with the task that keeps returning after dinner or before sleep. Write its real size, give it one finish line, and keep the explanation around it brief. If someone reaches for instant access, answer with timing instead of apology, then complete the smallest visible part before opening a new promise.",
    thisMonth: "Track where the same pressure appears through work, money, family, and rest. The useful move is to build one visible system rather than negotiate each moment from scratch. Review the saved readings weekly, look for the repeating cost, and let one habit around time or communication become the container that holds it.",
    practice: "For seven days, write one limit before the first difficult reply. At night, note what became lighter because the limit stayed visible, then use that evidence to choose tomorrow's first action.",
    focus: "Put one limit on the page",
    watch: "Apology replacing clear timing",
    ...overrides
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

function words(text) {
  return String(text || "").split(/\s+/).filter(Boolean);
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
  await checkLocalAccessRequiresExplicitFlag();
  await checkExplicitLocalAccessReturnsUnstoredGuidance();
  await checkGeneratedLocalPaidGuidanceIsHighQuality();
  await checkDashboardReturnsThreeMonthTracking();
  await checkDashboardReadFailuresReturnErrors();
  checkSubscriptionTrackingLifecycle();
  await checkLocalSaveGuidanceRequiresExplicitFlag();
  await checkPersistedSubscriptionRequired();
  await checkPaidSubscriptionReadFailureDoesNotCallOpenAI();
  await checkCachedPaidReadingBypassesOpenAI();
  await checkPaidCacheReadFailureDoesNotCallOpenAI();
  await checkPaidCacheMissWritesAndSecondReadUsesCache();
  await checkPaidGuidanceRepairsLowQualityDraftBeforeCaching();
  await checkPaidGuidanceUsesQualityFallbackAfterFailedRepair();
  await checkPaidCacheWriteFailureDoesNotReturnReading();

  const failed = checks.filter((check) => !check.passed);
  printReport();

  if (failed.length > 0) {
    process.exit(1);
  }
}

await main();
