import fs from "node:fs";
import {
  buildShaniRemedyMap,
  createPanditGuidance,
  getShaniDashboard,
  isLocalShaniAccessAllowed,
  SHANI_PANDIT_PROMPT_VERSION,
  SHANI_PANDIT_SYSTEM_PROMPT
} from "../src/backend/shaniService.js";

const checks = [];

async function checkDashboardWorksWithoutMembershipBackend() {
  const result = await getShaniDashboard({
    user: shaniUser("dashboard")
  }, {}, {
    supabase: null,
    now: new Date("2026-06-24T00:00:00.000Z")
  });

  pushCheck("Shani dashboard returns Saade Sati report without local paid unlock", [
    result.configured === false,
    result.membership === null,
    result.remedyMap === null,
    Array.isArray(result.panditHistory),
    typeof result.report?.phaseTitle === "string",
    typeof result.report?.summary === "string"
  ].every(Boolean));
}

function checkPromptRequiresPhaseQuestionAndRemedySpecificity() {
  pushCheck("Shani Pandit prompt requires phase, question cue, and seven-day remedy specificity", [
    SHANI_PANDIT_SYSTEM_PROMPT.includes("exact phase title"),
    SHANI_PANDIT_SYSTEM_PROMPT.includes("Outside Saade Sati"),
    SHANI_PANDIT_SYSTEM_PROMPT.includes("Moon and Saturn context"),
    SHANI_PANDIT_SYSTEM_PROMPT.includes("visible word from the user's question"),
    SHANI_PANDIT_SYSTEM_PROMPT.includes("For seven days"),
    SHANI_PANDIT_SYSTEM_PROMPT.includes("Saturday seva"),
    SHANI_PANDIT_SYSTEM_PROMPT.includes("duty completion")
  ].every(Boolean));
}

function checkPromptRequiresQualifiedSupportForAnxietySleepAndLegalRisk() {
  pushCheck("Shani Pandit prompt requires qualified support for sleep, anxiety, and legal risk", [
    SHANI_PANDIT_SYSTEM_PROMPT.includes("anxiety"),
    SHANI_PANDIT_SYSTEM_PROMPT.includes("weak sleep"),
    SHANI_PANDIT_SYSTEM_PROMPT.includes("safety-sensitive"),
    SHANI_PANDIT_SYSTEM_PROMPT.includes("qualified-support"),
    SHANI_PANDIT_SYSTEM_PROMPT.includes("doctor"),
    SHANI_PANDIT_SYSTEM_PROMPT.includes("therapist"),
    SHANI_PANDIT_SYSTEM_PROMPT.includes("mental-health professional"),
    SHANI_PANDIT_SYSTEM_PROMPT.includes("lawyer")
  ].every(Boolean));
}

function checkPromptRepairKeepsQualityFixesDirect() {
  const source = fs.readFileSync("src/backend/shaniService.js", "utf8");
  pushCheck("Shani Pandit repair prompt keeps phase, question, and professional-help fixes direct", [
    source.includes("If the rejection mentions professional help"),
    source.includes("direct qualified-support wording inside caution"),
    source.includes("If the rejection mentions the question or phase"),
    source.includes("report's exact phase title")
  ].every(Boolean));
}

async function checkDashboardReturnsMemberRemedyMap() {
  const user = shaniUser("dashboard-member");
  const result = await getShaniDashboard({
    user,
    limit: 5
  }, {}, {
    supabase: createFakeSupabase({
      memberships: [activeMembership(user.id)]
    }),
    now: new Date("2026-06-24T00:00:00.000Z")
  });

  pushCheck("Active Shani membership returns member remedy map", [
    result.configured === true,
    result.membership?.active === true,
    result.remedyMap?.phase?.title === result.report.phaseTitle,
    result.remedyMap?.nextSevenDays?.focus,
    result.remedyMap?.nextMonth?.action,
    result.remedyMap?.dailyPractices?.length === 3,
    Number.isInteger(result.remedyMap?.renewal?.daysLeft),
    Array.isArray(result.panditHistory)
  ].every(Boolean));

  const directMap = buildShaniRemedyMap({
    user,
    report: result.report,
    membership: result.membership,
    now: new Date("2026-06-24T00:00:00.000Z")
  });
  pushCheck("Shani remedy map is deterministic for the same member and report", [
    directMap.phase.title === result.remedyMap.phase.title,
    directMap.nextSevenDays.focus === result.remedyMap.nextSevenDays.focus,
    directMap.dailyPractices.length === result.remedyMap.dailyPractices.length
  ].every(Boolean));
}

async function checkLocalAccessRequiresExplicitFlag() {
  const openAiRequests = [];
  let error = null;

  try {
    await createPanditGuidance({
      user: shaniUser("local-default"),
      question: "What remedy should I do for career pressure?",
      membership: localMembership()
    }, {
      OPENAI_API_KEY: "fake-openai-key"
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

  pushCheck("Shani local Pandit access requires explicit server flag", [
    error?.statusCode === 503,
    /Supabase is required/.test(error?.message || ""),
    openAiRequests.length === 0,
    isLocalShaniAccessAllowed({ SHANI_ALLOW_LOCAL_ACCESS: "true" }) === true,
    isLocalShaniAccessAllowed({ SHANI_ALLOW_LOCAL_ACCESS: "false" }) === false
  ].every(Boolean));
}

async function checkPersistedMembershipRequired() {
  const user = shaniUser("no-member");
  const openAiRequests = [];
  const result = await createPanditGuidance({
    user,
    question: "How do I handle conflict during Saade Sati?"
  }, {
    OPENAI_API_KEY: "fake-openai-key"
  }, {
    supabase: createFakeSupabase(),
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

  pushCheck("Shani Pandit requires persisted active remedy membership", [
    result.allowed === false,
    result.error === "Shani remedy membership is required",
    openAiRequests.length === 0
  ].every(Boolean));
}

async function checkMembershipReadFailureDoesNotCallOpenAI() {
  const user = shaniUser("read-failure");
  const openAiRequests = [];
  let error = null;
  const originalWarn = console.warn;

  try {
    console.warn = () => {};
    await createPanditGuidance({
      user,
      question: "What should I do for money stress?"
    }, {
      OPENAI_API_KEY: "fake-openai-key"
    }, {
      supabase: createFakeSupabase({
        failMembershipSelect: true
      }),
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

  pushCheck("Shani membership read failure does not call OpenAI", [
    error?.statusCode === 503,
    /membership could not be checked/.test(error?.message || ""),
    openAiRequests.length === 0
  ].every(Boolean));
}

async function checkActiveMembershipStoresPanditAnswer() {
  const user = shaniUser("member-store");
  const supabase = createFakeSupabase({
    memberships: [activeMembership(user.id)]
  });
  const result = await createPanditGuidance({
    user,
    question: "What remedy should I do for work pressure?"
  }, {
    SHANI_PANDIT_DISABLE_OPENAI: "true"
  }, {
    supabase,
    now: new Date("2026-06-24T00:00:00.000Z")
  });

  pushCheck("Active Shani membership stores Pandit fallback answer", [
    result.allowed === true,
    result.stored === true,
    result.source === "local-fallback",
    result.promptVersion === SHANI_PANDIT_PROMPT_VERSION,
    Boolean(result.answer?.text),
    supabase.state.messages.length === 1,
    supabase.state.messages[0].prompt_version === SHANI_PANDIT_PROMPT_VERSION
  ].every(Boolean));
}

async function checkStoreFailureDoesNotReturnPaidAnswer() {
  const user = shaniUser("store-failure");
  let error = null;
  const originalWarn = console.warn;

  try {
    console.warn = () => {};
    await createPanditGuidance({
      user,
      question: "What should I do for relationship pressure?"
    }, {
      SHANI_PANDIT_DISABLE_OPENAI: "true"
    }, {
      supabase: createFakeSupabase({
        memberships: [activeMembership(user.id)],
        failMessageInsert: true
      })
    });
  } catch (caughtError) {
    error = caughtError;
  } finally {
    console.warn = originalWarn;
  }

  pushCheck("Shani Pandit answer is not returned when storage fails", [
    error?.statusCode === 503,
    /could not be saved/.test(error?.message || "")
  ].every(Boolean));
}

async function checkOpenAiAnswerIsStoredForMember() {
  const user = shaniUser("openai-member");
  const supabase = createFakeSupabase({
    memberships: [activeMembership(user.id)]
  });
  const openAiRequests = [];
  const result = await createPanditGuidance({
    user,
    question: "I am afraid about my career. What should I do?",
    report: {
      active: true,
      phaseIndex: 2,
      phaseTitle: "Peak phase",
      moonSign: "Pisces",
      saturnSign: "Pisces",
      endLabel: "Estimated completion: Mar 17, 2031",
      summary: "Peak phase pressure around responsibility and work conduct."
    }
  }, {
    OPENAI_API_KEY: "fake-openai-key",
    SHANI_PANDIT_MODEL: "gpt-contract"
  }, {
    supabase,
    createOpenAIClient() {
      return {
        responses: {
          create: async (request) => {
            openAiRequests.push(request);
            return {
              output_text: passingPanditAnswerJson()
            };
          }
        }
      };
    }
  });

  pushCheck("Shani OpenAI Pandit answer is member-gated and stored", [
    result.allowed === true,
    result.stored === true,
    result.source === "openai",
    result.model === "gpt-contract",
    result.quality?.passed === true,
    openAiRequests.length === 1,
    openAiRequests[0].instructions.includes("Output valid JSON only"),
    supabase.state.messages.length === 1,
    supabase.state.messages[0].source === "openai"
  ].every(Boolean));
}

async function checkOpenAiSafetyAnswerRepairsWithoutFallback() {
  const user = shaniUser("openai-safety-repair");
  const supabase = createFakeSupabase({
    memberships: [activeMembership(user.id)]
  });
  const result = await createPanditGuidance({
    user,
    question: "Saade Sati is not active, but anxiety and sleep are weak. How do I prepare?",
    report: {
      active: false,
      phaseIndex: 0,
      phaseTitle: "Outside Saade Sati",
      moonSign: "Virgo",
      saturnSign: "Pisces",
      endLabel: "Next watch begins around Aug 8, 2036",
      summary: "Saade Sati does not appear active right now."
    }
  }, {
    OPENAI_API_KEY: "fake-openai-key",
    SHANI_PANDIT_MODEL: "gpt-contract"
  }, {
    supabase,
    createOpenAIClient() {
      return {
        responses: {
          create: async () => ({
            output_text: JSON.stringify({
              text: "Mira, this Outside Saade Sati period is preparation, not punishment. Moon in Virgo shows why weak sleep quickly becomes panic, while Saturn in Pisces asks for routine, service, and steady conduct before pressure grows. Mira should keep sleep and anxiety practical for the next seven days: protect the first hour, reduce late checking, and complete one small duty early. Shani support stays clean when preparation is quiet, repeated, and free from fear.",
              practice: "For seven days, sleep and wake at fixed times, sit for nine breaths before sunrise, and keep Saturday simple with lamp and service.",
              caution: "Mira, do not treat weak sleep as a sign; let routine and humility lead."
            })
          })
        }
      };
    }
  });

  pushCheck("Shani OpenAI safety answer repairs qualified support without fallback", [
    result.source === "openai",
    result.quality?.fallbackUsed === false,
    result.quality?.passed === true,
    !/\bpanic\b/i.test(JSON.stringify(result.answer || {})),
    countWord(JSON.stringify(result.answer || {}), "Mira") <= 1,
    /qualified doctor|therapist|trusted local support/i.test(result.answer?.caution || ""),
    supabase.state.messages[0]?.source === "openai"
  ].every(Boolean));
}

function passingPanditAnswerJson() {
  return JSON.stringify({
    text: "Mira, this career pressure belongs to the Peak phase lesson: finish responsibility before chasing escape. Shani is not asking for fear; Shani is asking for visible conduct. Moon in Pisces shows why uncertainty becomes heavy in the body, while Saturn in Pisces asks for a cleaner work rhythm, fewer claims, and one completed duty that can be inspected. For the next seven days, keep the question practical: what work can be documented, repaid, or completed before another promise is made?",
    practice: "For seven days, finish one delayed work task before noon, light a sesame-oil lamp on Saturday, and offer quiet service without display.",
    caution: "Avoid dramatic resignations, fear-led promises, or public complaints; let proof of duty lead."
  });
}

function createFakeSupabase({
  memberships = [],
  failMembershipSelect = false,
  failHistorySelect = false,
  failMessageInsert = false
} = {}) {
  const state = {
    memberships: new Map(),
    messages: [],
    profiles: new Map(),
    nextProfileId: 1,
    nextMessageId: 1,
    failMembershipSelect,
    failHistorySelect,
    failMessageInsert
  };

  for (const membership of memberships) {
    state.memberships.set(membership.user_key, { ...membership });
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

  upsert(payload) {
    if (this.table === "user_profiles") {
      const key = payload.auth_user_id || payload.phone || payload.email || `profile-${this.state.nextProfileId}`;
      const existing = this.state.profiles.get(key);
      const id = existing?.id || `profile-${this.state.nextProfileId++}`;
      const profile = { ...existing, ...clone(payload), id };
      this.state.profiles.set(key, profile);
      this.result = { data: profile, error: null };
    }
    return this;
  }

  insert(payload) {
    if (this.table === "shani_pandit_messages") {
      if (this.state.failMessageInsert) {
        this.result = { data: null, error: { message: "contract Pandit insert failure" } };
        return this;
      }

      const message = {
        ...clone(payload),
        id: `pandit-${this.state.nextMessageId++}`,
        created_at: "2026-06-24T00:00:00.000Z"
      };
      this.state.messages.push(message);
      this.result = { data: message, error: null };
    }
    return this;
  }

  async maybeSingle() {
    if (this.table === "shani_remedy_memberships") {
      if (this.state.failMembershipSelect) {
        return { data: null, error: { message: "contract membership read failure" } };
      }
      const membership = this.state.memberships.get(this.filters.user_key) || null;
      return { data: membership, error: null };
    }

    return this.result;
  }

  async single() {
    return this.result;
  }

  then(resolve, reject) {
    if (this.table === "shani_pandit_messages") {
      const result = this.state.failHistorySelect
        ? { data: null, error: { message: "contract history read failure" } }
        : {
            data: this.state.messages
              .filter((message) => message.user_key === this.filters.user_key)
              .slice()
              .reverse(),
            error: null
          };
      return Promise.resolve(result).then(resolve, reject);
    }

    return Promise.resolve(this.result).then(resolve, reject);
  }
}

function activeMembership(userKey, overrides = {}) {
  return {
    id: `shani-membership-${userKey}`,
    user_key: userKey,
    plan_id: "3m",
    plan_name: "3 months",
    status: "active",
    starts_at: "2026-06-01T00:00:00.000Z",
    ends_at: "2099-06-01T00:00:00.000Z",
    provider: "razorpay",
    provider_payment_id: `pay-shani-${userKey}`,
    provider_subscription_id: null,
    metadata: {},
    created_at: "2026-06-01T00:00:00.000Z",
    ...overrides
  };
}

function localMembership() {
  return {
    active: true,
    planId: "local",
    planName: "Local Shani preview"
  };
}

function shaniUser(id) {
  return {
    id,
    name: "Mira Rao",
    phone: "+919800000004",
    email: `${id}@soulguru.local`,
    birthDate: "1995-02-11",
    birthTime: "10:15",
    birthPlace: "Jaipur"
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function countWord(text, word) {
  if (!word) return 0;
  const pattern = new RegExp(`\\b${word}\\b`, "gi");
  return (String(text || "").match(pattern) || []).length;
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function printReport() {
  const failed = checks.filter((check) => !check.passed);
  console.log(`Shani contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}

async function main() {
  checkPromptRequiresPhaseQuestionAndRemedySpecificity();
  checkPromptRequiresQualifiedSupportForAnxietySleepAndLegalRisk();
  checkPromptRepairKeepsQualityFixesDirect();
  await checkDashboardWorksWithoutMembershipBackend();
  await checkDashboardReturnsMemberRemedyMap();
  await checkLocalAccessRequiresExplicitFlag();
  await checkPersistedMembershipRequired();
  await checkMembershipReadFailureDoesNotCallOpenAI();
  await checkActiveMembershipStoresPanditAnswer();
  await checkStoreFailureDoesNotReturnPaidAnswer();
  await checkOpenAiAnswerIsStoredForMember();
  await checkOpenAiSafetyAnswerRepairsWithoutFallback();

  const failed = checks.filter((check) => !check.passed);
  printReport();

  if (failed.length > 0) {
    process.exit(1);
  }
}

await main();
