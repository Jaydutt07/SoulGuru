import {
  buildMemoryContext,
  isGuidanceMemoryConfigured,
  searchGuidanceMemory,
  upsertGuidanceMemory
} from "../src/backend/memoryService.js";

const checks = [];
const env = {
  OPENAI_API_KEY: "sk-contract-openai",
  OPENAI_EMBEDDING_MODEL: "text-embedding-3-large",
  PINECONE_API_KEY: "pc-contract-key",
  PINECONE_HOST: "memory-index.svc.pinecone.io"
};
const user = {
  id: "profile-123",
  authUserId: "user_clerk_memory",
  name: "Asha Rao",
  phone: "+919000000001",
  email: "asha@example.com",
  birthDate: "1994-08-17",
  birthTime: "06:35"
};

await checkUnconfiguredMemoryDegradesWithoutCalls();
await checkInvalidMemoryConfigSkipsCalls();
await checkSearchContract();
await checkUpsertContract();
await checkFailureDegradesSafely();
checkMemoryContextScrubsAstrologyLanguage();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

async function checkUnconfiguredMemoryDegradesWithoutCalls() {
  let embedCalls = 0;
  let fetchCalls = 0;
  const deps = {
    createEmbedding: async () => {
      embedCalls += 1;
      return [1, 2, 3];
    },
    fetch: async () => {
      fetchCalls += 1;
      return okJson({});
    }
  };

  const search = await searchGuidanceMemory({
    user,
    query: "remember this"
  }, {}, deps);
  const upsert = await upsertGuidanceMemory({
    user,
    text: "remember this",
    kind: "daily-soul-reading"
  }, {}, deps);

  pushCheck("Memory service degrades safely when unconfigured", [
    isGuidanceMemoryConfigured({}) === false,
    search.configured === false,
    search.matches.length === 0,
    upsert.configured === false,
    upsert.upserted === false,
    embedCalls === 0,
    fetchCalls === 0
  ].every(Boolean));
}

async function checkInvalidMemoryConfigSkipsCalls() {
  let embedCalls = 0;
  let fetchCalls = 0;
  const deps = {
    createEmbedding: async () => {
      embedCalls += 1;
      return [1, 2, 3];
    },
    fetch: async () => {
      fetchCalls += 1;
      return okJson({});
    }
  };

  const placeholder = await searchGuidanceMemory({
    user,
    query: "remember this"
  }, {
    ...env,
    PINECONE_API_KEY: "placeholder"
  }, deps);
  const insecureHost = await upsertGuidanceMemory({
    user,
    text: "remember this",
    kind: "daily-soul-reading"
  }, {
    ...env,
    PINECONE_HOST: "http://localhost:8080"
  }, deps);

  pushCheck("Memory service rejects placeholder keys and unsafe Pinecone hosts before network calls", [
    placeholder.configured === false,
    insecureHost.configured === false,
    embedCalls === 0,
    fetchCalls === 0,
    isGuidanceMemoryConfigured({
      ...env,
      PINECONE_HOST: "https://memory-index.svc.pinecone.io/path"
    }) === false
  ].every(Boolean));
}

async function checkSearchContract() {
  const seen = {
    embeddings: [],
    requests: []
  };
  const result = await searchGuidanceMemory({
    user,
    query: `  ${"saturn pressure and moon transit around a work decision ".repeat(80)}  `,
    topK: 50
  }, env, {
    createEmbedding: async (input, receivedEnv) => {
      seen.embeddings.push({ input, model: receivedEnv.OPENAI_EMBEDDING_MODEL });
      return [0.11, 0.22, 0.33];
    },
    fetch: async (url, options) => {
      seen.requests.push(parseRequest(url, options));
      return okJson({
        matches: [
          {
            id: "memory-1",
            score: 0.91,
            metadata: {
              text: "Saturn pressure showed up in a saved note about work.",
              kind: "saved-guidance",
              createdAt: "2026-06-20T00:00:00.000Z"
            }
          },
          {
            id: "empty-memory",
            score: 0.5,
            metadata: {
              text: ""
            }
          }
        ]
      });
    }
  });
  const request = seen.requests[0];
  const body = request.body;

  pushCheck("Memory search uses server-side embedding and Pinecone query contract", [
    isGuidanceMemoryConfigured(env) === true,
    seen.embeddings.length === 1,
    seen.embeddings[0].input.length === 1400,
    !/\s{2,}/.test(seen.embeddings[0].input),
    seen.embeddings[0].model === "text-embedding-3-large",
    request.url === "https://memory-index.svc.pinecone.io/query",
    request.method === "POST",
    request.headers["Api-Key"] === "pc-contract-key",
    body.namespace.match(/^user-[a-f0-9]{18}$/),
    !JSON.stringify(body).includes(user.phone),
    !JSON.stringify(body).includes(user.email),
    !JSON.stringify(body).includes(user.name),
    body.vector.join(",") === "0.11,0.22,0.33",
    body.topK === 10,
    body.includeMetadata === true,
    body.includeValues === false
  ].every(Boolean));
  pushCheck("Memory search maps only usable matches", [
    result.configured === true,
    result.matches.length === 1,
    result.matches[0].id === "memory-1",
    result.matches[0].score === 0.91,
    result.matches[0].kind === "saved-guidance",
    result.matches[0].createdAt === "2026-06-20T00:00:00.000Z"
  ].every(Boolean));
}

async function checkUpsertContract() {
  const longText = `  ${"A saved guidance line with   extra space. ".repeat(80)}  `;
  const seen = {
    embeddings: [],
    requests: []
  };
  const result = await upsertGuidanceMemory({
    user,
    text: longText,
    kind: "daily-soul-reading",
    sourceId: "source/2026-06-24!",
    metadata: {
      promptVersion: "contract-v1",
      score: 7,
      active: true,
      generatedAt: new Date("2026-06-24T00:00:00.000Z"),
      nested: { unsafe: "object" },
      unsafeEmail: "asha@example.com",
      unsafePhone: "+91 90000 00001",
      "Bad Key!": "cleaned",
      omitMe: null
    }
  }, env, {
    createEmbedding: async (input, receivedEnv) => {
      seen.embeddings.push({ input, model: receivedEnv.OPENAI_EMBEDDING_MODEL });
      return [0.44, 0.55, 0.66];
    },
    fetch: async (url, options) => {
      seen.requests.push(parseRequest(url, options));
      return okJson({ upsertedCount: 1 });
    }
  });
  const request = seen.requests[0];
  const vector = request.body.vectors[0];

  pushCheck("Memory upsert trims text and writes hashed Pinecone vector", [
    seen.embeddings.length === 1,
    seen.embeddings[0].input.length === 1400,
    !/\s{2,}/.test(seen.embeddings[0].input),
    request.url === "https://memory-index.svc.pinecone.io/vectors/upsert",
    request.method === "POST",
    request.headers["Api-Key"] === "pc-contract-key",
    request.body.namespace.match(/^user-[a-f0-9]{18}$/),
    !JSON.stringify(request.body).includes(user.phone),
    !JSON.stringify(request.body).includes(user.email),
    !JSON.stringify(request.body).includes(user.name),
    vector.id.match(/^daily-soul-reading-[a-f0-9]{12}-source2026-06-24$/),
    vector.values.join(",") === "0.44,0.55,0.66",
    vector.metadata.text.length <= 1400,
    vector.metadata.text.length > 1000,
    vector.metadata.kind === "daily-soul-reading",
    vector.metadata.sourceId === "source/2026-06-24!"
  ].every(Boolean));
  pushCheck("Memory upsert sanitizes metadata and returns Pinecone result", [
    vector.metadata.promptVersion === "contract-v1",
    vector.metadata.score === 7,
    vector.metadata.active === true,
    vector.metadata.generatedAt === "2026-06-24T00:00:00.000Z",
    vector.metadata.unsafeEmail === "[redacted-email]",
    vector.metadata.unsafePhone === "[redacted-phone]",
    vector.metadata.BadKey === "cleaned",
    !("nested" in vector.metadata),
    !("omitMe" in vector.metadata),
    !JSON.stringify(vector.metadata).includes("asha@example.com"),
    !JSON.stringify(vector.metadata).includes("+91 90000 00001"),
    result.configured === true,
    result.upserted === true,
    result.id === vector.id,
    result.count === 1
  ].every(Boolean));
}

async function checkFailureDegradesSafely() {
  const originalWarn = console.warn;
  console.warn = () => {};
  let result;
  try {
    result = await searchGuidanceMemory({
      user,
      query: "will degrade"
    }, env, {
      createEmbedding: async () => [0.1],
      fetch: async () => ({
        ok: false,
        status: 503,
        async json() {
          return { message: "Pinecone unavailable" };
        }
      })
    });
  } finally {
    console.warn = originalWarn;
  }

  pushCheck("Memory failures degrade without throwing", [
    result.configured === true,
    result.degraded === true,
    Array.isArray(result.matches),
    result.matches.length === 0
  ].every(Boolean));
}

function checkMemoryContextScrubsAstrologyLanguage() {
  const context = buildMemoryContext({
    matches: [
      {
        text: "Saturn pressure and moon transit appeared in the chart with karma.",
        kind: "saved-guidance"
      },
      {
        text: "The horoscope mentioned zodiac timing and planet pressure.",
        kind: "astro-solve"
      }
    ]
  });

  pushCheck("Memory context scrubs astrology terms before Soul Guru prompt use", [
    context.includes("discipline pressure"),
    context.includes("emotional timing"),
    context.includes("inner map"),
    context.includes("repeated lesson"),
    !/\b(Saturn|moon transit|chart|karma|horoscope|zodiac|planet)\b/i.test(context)
  ].every(Boolean));
}

function okJson(payload) {
  return {
    ok: true,
    status: 200,
    async json() {
      return payload;
    }
  };
}

function parseRequest(url, options = {}) {
  return {
    url,
    method: options.method,
    headers: options.headers || {},
    body: JSON.parse(options.body || "{}")
  };
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function printReport() {
  console.log(`Guidance memory contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}
