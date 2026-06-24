import {
  buildRateLimitKey,
  checkRateLimit,
  hashRateLimitSubject
} from "../src/backend/rateLimit.js";

const checks = [];

await checkUnconfiguredRateLimitSkipsNetwork();
await checkRateLimitKeyPrivacy();
await checkUpstashPipelineContract();
await checkBlockedAndDegradedBehavior();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

async function checkUnconfiguredRateLimitSkipsNetwork() {
  let fetchCalls = 0;
  const result = await checkRateLimit({
    env: {},
    key: "raw-user",
    route: "soul-wisdom",
    limit: 20,
    fetchImpl: async () => {
      fetchCalls += 1;
      return okJson([]);
    }
  });

  pushCheck("Rate limit skips network when Upstash is unconfigured", [
    result.allowed === true,
    result.remaining === 20,
    result.skipped === true,
    fetchCalls === 0
  ].every(Boolean));
}

async function checkRateLimitKeyPrivacy() {
  const req = {
    headers: {
      "x-forwarded-for": "203.0.113.10, 10.0.0.1"
    },
    socket: {
      remoteAddress: "10.0.0.2"
    }
  };
  const authKey = buildRateLimitKey(req, {
    authUserId: "user_clerk_rate",
    phone: "+919000000001",
    email: "asha@example.com"
  });
  const phoneKey = buildRateLimitKey(req, {
    phone: "+919000000001"
  });
  const ipKey = buildRateLimitKey(req, {});

  pushCheck("Rate limit subjects are deterministic hashes without raw PII", [
    authKey === hashRateLimitSubject("user_clerk_rate"),
    phoneKey === hashRateLimitSubject("+919000000001"),
    ipKey === hashRateLimitSubject("203.0.113.10"),
    /^rl_[a-f0-9]{32}$/.test(authKey),
    /^rl_[a-f0-9]{32}$/.test(phoneKey),
    /^rl_[a-f0-9]{32}$/.test(ipKey),
    !authKey.includes("user_clerk_rate"),
    !phoneKey.includes("9000000001"),
    !ipKey.includes("203.0.113.10")
  ].every(Boolean));
}

async function checkUpstashPipelineContract() {
  const seen = [];
  const result = await checkRateLimit({
    env: {
      UPSTASH_REDIS_REST_URL: "https://upstash-contract.redis",
      UPSTASH_REDIS_REST_TOKEN: "upstash-token"
    },
    key: "asha@example.com",
    route: "Soul Wisdom / Daily",
    limit: 20,
    windowSeconds: 600,
    fetchImpl: async (url, options) => {
      seen.push(parseRequest(url, options));
      return okJson([
        { result: 7 },
        { result: 1 }
      ]);
    }
  });
  const request = seen[0];
  const redisKey = request.body[0][1];

  pushCheck("Rate limit sends hashed Upstash pipeline request", [
    request.url === "https://upstash-contract.redis/pipeline",
    request.method === "POST",
    request.headers.Authorization === "Bearer upstash-token",
    request.headers["Content-Type"] === "application/json",
    request.body.length === 2,
    request.body[0][0] === "INCR",
    request.body[1][0] === "EXPIRE",
    request.body[1][1] === redisKey,
    request.body[1][2] === 600,
    request.body[1][3] === "NX",
    redisKey.startsWith("soulguru:rate:soul-wisdom-daily:rl_"),
    /^soulguru:rate:soul-wisdom-daily:rl_[a-f0-9]{32}$/.test(redisKey),
    !redisKey.includes("asha@example.com")
  ].every(Boolean));
  pushCheck("Rate limit response computes remaining allowance", [
    result.allowed === true,
    result.count === 7,
    result.limit === 20,
    result.remaining === 13,
    result.resetSeconds === 600
  ].every(Boolean));
}

async function checkBlockedAndDegradedBehavior() {
  const blocked = await checkRateLimit({
    env: {
      UPSTASH_REDIS_REST_URL: "https://upstash-contract.redis/",
      UPSTASH_REDIS_REST_TOKEN: "upstash-token"
    },
    key: hashRateLimitSubject("already-hashed"),
    route: "astro-solve",
    limit: 3,
    windowSeconds: 60,
    fetchImpl: async (url, options) => okJson([
      { result: 4 },
      { result: 1 },
      { url, method: options.method }
    ])
  });

  const originalWarn = console.warn;
  console.warn = () => {};
  let degraded;
  try {
    degraded = await checkRateLimit({
      env: {
        UPSTASH_REDIS_REST_URL: "https://upstash-contract.redis",
        UPSTASH_REDIS_REST_TOKEN: "upstash-token"
      },
      key: "raw-phone",
      route: "otp",
      limit: 5,
      fetchImpl: async () => ({
        ok: false,
        status: 503,
        async json() {
          return {};
        }
      })
    });
  } finally {
    console.warn = originalWarn;
  }

  pushCheck("Rate limit blocks requests over limit", [
    blocked.allowed === false,
    blocked.count === 4,
    blocked.limit === 3,
    blocked.remaining === 0,
    blocked.resetSeconds === 60
  ].every(Boolean));
  pushCheck("Rate limit degrades open on Upstash failure", [
    degraded.allowed === true,
    degraded.remaining === 5,
    degraded.degraded === true
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
    body: JSON.parse(options.body || "[]")
  };
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function printReport() {
  console.log(`Rate limit contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}
