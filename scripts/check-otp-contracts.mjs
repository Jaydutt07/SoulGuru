import { createHmac } from "node:crypto";
import { buildDeploymentReadiness } from "../src/backend/readinessService.js";
import { requestOtp, verifyOtp } from "../src/backend/otpService.js";

const checks = [];
const phone = "+919800000004";
const email = "otp@soulguru.local";
const otpSecret = "contract-otp-secret-with-at-least-32-chars";

async function checkSupabaseOtpRequestStoresHashAndHidesDemoCode() {
  const supabase = createFakeSupabase();
  const deliveries = [];

  const result = await requestOtp({
    phone: "+91 98000 00004",
    email,
    purpose: "login"
  }, {
    OTP_HASH_SECRET: otpSecret,
    OTP_DEMO_ENABLED: "false",
    OTP_EXPIRY_MINUTES: "12",
    OTP_SMS_WEBHOOK_URL: "https://sms.example.test/send",
    OTP_SMS_WEBHOOK_TOKEN: "sms-webhook-token-123"
  }, {
    supabase,
    createOtpCode: () => "123456",
    deliverOtp: async (payload) => {
      deliveries.push({
        ...payload,
        storedBeforeDelivery: supabase.state.challenges.size,
        storedChallengeId: [...supabase.state.challenges.keys()][0]
      });
      return { sent: true, channel: "sms-webhook", id: "sms-contract-1" };
    }
  });

  const challenge = supabase.state.challenges.get(result.challengeId);

  pushCheck("Supabase OTP request hides demo code and delivers through backend", [
    result.configured === true,
    result.challengeId === "otp-1",
    result.demoCode === undefined,
    result.delivery?.sent === true,
    result.delivery?.channel === "sms-webhook",
    deliveries.length === 1,
    deliveries[0].storedBeforeDelivery === 1,
    deliveries[0].storedChallengeId === result.challengeId,
    deliveries[0].code === "123456",
    deliveries[0].phone === phone
  ].every(Boolean));
  pushCheck("Supabase OTP stores only a hash", [
    challenge.phone === phone,
    challenge.email === email,
    challenge.purpose === "login",
    challenge.code_hash === hashOtp({ phone, code: "123456", secret: otpSecret }),
    challenge.code_hash !== "123456",
    /^[a-f0-9]{64}$/.test(challenge.code_hash),
    challenge.delivery_channel === "sms-webhook",
    challenge.metadata?.deliveryId === "sms-contract-1",
    challenge.attempts === 0,
    !challenge.verified_at
  ].every(Boolean));
}

async function checkOtpInsertFailureDoesNotDeliverCode() {
  const supabase = createFakeSupabase({ failChallengeInsert: true });
  const deliveries = [];

  await expectRejects(
    "OTP challenge insert failure does not deliver code",
    () => requestOtp({
      phone,
      email,
      purpose: "login"
    }, {
      OTP_HASH_SECRET: otpSecret,
      OTP_DEMO_ENABLED: "false",
      OTP_SMS_WEBHOOK_URL: "https://sms.example.test/send",
      OTP_SMS_WEBHOOK_TOKEN: "sms-webhook-token-123"
    }, {
      supabase,
      createOtpCode: () => "123456",
      deliverOtp: async (payload) => {
        deliveries.push(payload);
        return { sent: true, channel: "sms-webhook" };
      }
    }),
    /Unable to create OTP challenge/i
  );

  pushCheck("Failed OTP challenge insert leaves no delivery or stored code", [
    deliveries.length === 0,
    supabase.state.challenges.size === 0
  ].every(Boolean));
}

async function checkOtpHashSecretIsRequiredBeforeDelivery() {
  const supabase = createFakeSupabase();
  const deliveries = [];

  await expectRejects(
    "Supabase OTP request requires strong hash secret before delivery",
    () => requestOtp({
      phone,
      email,
      purpose: "login"
    }, {
      OTP_HASH_SECRET: "too-short",
      OTP_DEMO_ENABLED: "false"
    }, {
      supabase,
      createOtpCode: () => "123456",
      deliverOtp: async (payload) => {
        deliveries.push(payload);
        return { sent: true, channel: "sms-webhook" };
      }
    }),
    /OTP_HASH_SECRET.*32/i,
    500
  );

  pushCheck("Weak OTP hash secret does not send or store OTP", [
    deliveries.length === 0,
    supabase.state.challenges.size === 0
  ].every(Boolean));
}

async function checkOtpDeliveryConfigIsRequiredBeforeStorage() {
  const supabase = createFakeSupabase();

  await expectRejects(
    "Supabase OTP request requires configured delivery before storage",
    () => requestOtp({
      phone,
      email,
      purpose: "login"
    }, {
      OTP_HASH_SECRET: otpSecret,
      OTP_DEMO_ENABLED: "false"
    }, {
      supabase,
      createOtpCode: () => "123456"
    }),
    /OTP delivery is not configured/i,
    500
  );

  pushCheck("Missing OTP delivery config leaves no stored challenge", supabase.state.challenges.size === 0);
}

async function checkSmsWebhookTokenIsRequiredBeforeStorage() {
  const missingTokenSupabase = createFakeSupabase();
  const placeholderTokenSupabase = createFakeSupabase();

  await expectRejects(
    "SMS OTP webhook requires bearer token before storage",
    () => requestOtp({
      phone,
      email,
      purpose: "login"
    }, {
      OTP_HASH_SECRET: otpSecret,
      OTP_DEMO_ENABLED: "false",
      OTP_SMS_WEBHOOK_URL: "https://sms.example.test/send"
    }, {
      supabase: missingTokenSupabase,
      createOtpCode: () => "123456"
    }),
    /OTP_SMS_WEBHOOK_TOKEN.*configured/i,
    500
  );

  await expectRejects(
    "SMS OTP webhook rejects placeholder token before storage",
    () => requestOtp({
      phone,
      email,
      purpose: "login"
    }, {
      OTP_HASH_SECRET: otpSecret,
      OTP_DEMO_ENABLED: "false",
      OTP_SMS_WEBHOOK_URL: "https://sms.example.test/send",
      OTP_SMS_WEBHOOK_TOKEN: "replace-with-sms-token"
    }, {
      supabase: placeholderTokenSupabase,
      createOtpCode: () => "123456"
    }),
    /OTP_SMS_WEBHOOK_TOKEN.*configured/i,
    500
  );

  pushCheck("Invalid SMS webhook token leaves no stored challenge", [
    missingTokenSupabase.state.challenges.size === 0,
    placeholderTokenSupabase.state.challenges.size === 0
  ].every(Boolean));
}

async function checkSmsWebhookUrlIsValidatedBeforeStorage() {
  const supabase = createFakeSupabase();

  await expectRejects(
    "SMS OTP webhook rejects insecure URL before storage",
    () => requestOtp({
      phone,
      email,
      purpose: "login"
    }, {
      OTP_HASH_SECRET: otpSecret,
      OTP_DEMO_ENABLED: "false",
      OTP_SMS_WEBHOOK_URL: "http://sms.example.test/send",
      OTP_SMS_WEBHOOK_TOKEN: "sms-webhook-token-123"
    }, {
      supabase,
      createOtpCode: () => "123456"
    }),
    /OTP_SMS_WEBHOOK_URL.*HTTPS/i,
    500
  );

  pushCheck("Insecure SMS webhook URL leaves no stored challenge", supabase.state.challenges.size === 0);
}

async function checkSmsWebhookSendsBearerToken() {
  const supabase = createFakeSupabase();
  const fetchCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    fetchCalls.push({ url, options });
    return {
      ok: true,
      status: 200,
      json: async () => ({ messageId: "sms-contract-message" })
    };
  };

  try {
    const result = await requestOtp({
      phone,
      email,
      purpose: "create"
    }, {
      OTP_HASH_SECRET: otpSecret,
      OTP_DEMO_ENABLED: "false",
      OTP_EXPIRY_MINUTES: "9",
      OTP_SMS_WEBHOOK_URL: "https://sms.example.test/send",
      OTP_SMS_WEBHOOK_TOKEN: "sms-webhook-token-123"
    }, {
      supabase,
      createOtpCode: () => "123456"
    });
    const challenge = supabase.state.challenges.get(result.challengeId);
    const requestBody = JSON.parse(fetchCalls[0]?.options?.body || "{}");

    pushCheck("SMS OTP webhook sends bearer token and phone payload", [
      fetchCalls.length === 1,
      fetchCalls[0].url === "https://sms.example.test/send",
      fetchCalls[0].options.method === "POST",
      fetchCalls[0].options.headers.Authorization === "Bearer sms-webhook-token-123",
      requestBody.to === phone,
      requestBody.code === "123456",
      requestBody.purpose === "create",
      requestBody.message.includes("123456")
    ].every(Boolean));
    pushCheck("SMS OTP webhook success updates stored delivery channel", [
      result.delivery?.sent === true,
      result.delivery?.channel === "sms-webhook",
      result.delivery?.id === "sms-contract-message",
      challenge.delivery_channel === "sms-webhook",
      challenge.metadata?.deliveryId === "sms-contract-message"
    ].every(Boolean));
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function checkVerifyOtpAttemptsAndSuccess() {
  const supabase = createFakeSupabase({
    challenges: [buildChallenge({
      id: "otp-verify",
      phone,
      email,
      code: "654321",
      attempts: 0,
      expiresAt: "2099-06-24T00:00:00.000Z"
    })]
  });

  await expectRejects(
    "Wrong OTP increments attempts",
    () => verifyOtp({
      challengeId: "otp-verify",
      phone,
      code: "000000"
    }, {
      OTP_HASH_SECRET: otpSecret,
      OTP_MAX_ATTEMPTS: "5"
    }, {
      supabase
    }),
    /did not match/i,
    401
  );

  const afterWrong = clone(supabase.state.challenges.get("otp-verify"));
  const success = await verifyOtp({
    challengeId: "otp-verify",
    phone,
    code: "654321"
  }, {
    OTP_HASH_SECRET: otpSecret,
    OTP_MAX_ATTEMPTS: "5"
  }, {
    supabase
  });
  const afterSuccess = supabase.state.challenges.get("otp-verify");
  await expectRejects(
    "Verified OTP cannot be replayed",
    () => verifyOtp({
      challengeId: "otp-verify",
      phone,
      code: "654321"
    }, {
      OTP_HASH_SECRET: otpSecret
    }, {
      supabase
    }),
    /already been used/i,
    409
  );

  pushCheck("Correct OTP verifies after a failed attempt", [
    afterWrong.attempts === 1,
    success.configured === true,
    success.verified === true,
    Boolean(success.verifiedAt),
    afterSuccess.attempts === 2,
    Boolean(afterSuccess.verified_at)
  ].every(Boolean));
}

async function checkMaxAttemptsAndExpiryBlockVerification() {
  const supabase = createFakeSupabase({
    challenges: [
      buildChallenge({
        id: "otp-limit",
        phone,
        email,
        code: "111111",
        attempts: 5,
        expiresAt: "2099-06-24T00:00:00.000Z"
      }),
      buildChallenge({
        id: "otp-expired",
        phone,
        email,
        code: "222222",
        attempts: 0,
        expiresAt: "2000-01-01T00:00:00.000Z"
      })
    ]
  });

  await expectRejects(
    "Max OTP attempts block verification",
    () => verifyOtp({
      challengeId: "otp-limit",
      phone,
      code: "111111"
    }, {
      OTP_HASH_SECRET: otpSecret,
      OTP_MAX_ATTEMPTS: "5"
    }, {
      supabase
    }),
    /too many/i,
    429
  );
  await expectRejects(
    "Expired OTP blocks verification",
    () => verifyOtp({
      challengeId: "otp-expired",
      phone,
      code: "222222"
    }, {
      OTP_HASH_SECRET: otpSecret
    }, {
      supabase
    }),
    /expired/i,
    410
  );

  pushCheck("Blocked OTPs are not marked verified", [
    !supabase.state.challenges.get("otp-limit").verified_at,
    !supabase.state.challenges.get("otp-expired").verified_at
  ].every(Boolean));
}

function checkOtpReadinessRequiresStrongSecret() {
  const baseEnv = {
    OPENAI_API_KEY: "sk-contract",
    OPENAI_MODEL: "gpt-5.5",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role",
    OTP_SMS_WEBHOOK_URL: "https://sms.example.test",
    OTP_SMS_WEBHOOK_TOKEN: "sms-webhook-token-123",
    RAZORPAY_KEY_ID: "rzp_test_contract",
    RAZORPAY_KEY_SECRET: "razorpay-secret",
    RAZORPAY_WEBHOOK_SECRET: "webhook-secret",
    MORE_GUIDANCE_PRICE_PAISE: "49900"
  };
  const weakReport = buildDeploymentReadiness({
    ...baseEnv,
    OTP_HASH_SECRET: "too-short"
  });
  const strongReport = buildDeploymentReadiness({
    ...baseEnv,
    OTP_HASH_SECRET: otpSecret
  });
  const weakOtp = weakReport.checks.find((check) => check.id === "otp");
  const strongOtp = strongReport.checks.find((check) => check.id === "otp");

  pushCheck("Production readiness rejects weak OTP hash secret", [
    weakOtp?.status === "fail",
    weakOtp?.missingEnv.includes("OTP_HASH_SECRET>=32 characters")
  ].every(Boolean));
  pushCheck("Production readiness accepts strong OTP hash secret", strongOtp?.status === "pass");
}

function createFakeSupabase({ challenges = [], failChallengeInsert = false } = {}) {
  const state = {
    calls: [],
    challenges: new Map(),
    nextChallengeId: 1,
    failChallengeInsert
  };

  for (const challenge of challenges) {
    state.challenges.set(challenge.id, { ...challenge });
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
    this.pendingUpdate = null;
    this.result = { data: null, error: null };
  }

  select() {
    return this;
  }

  eq(column, value) {
    this.filters[column] = value;
    return this;
  }

  insert(payload) {
    this.state.calls.push({
      table: this.table,
      operation: "insert",
      payload: clone(payload)
    });

    if (this.table === "auth_otp_challenges") {
      if (this.state.failChallengeInsert) {
        this.result = {
          data: null,
          error: { message: "contract insert failure" }
        };
        return this;
      }

      const id = `otp-${this.state.nextChallengeId++}`;
      const challenge = {
        id,
        attempts: 0,
        verified_at: null,
        created_at: "2026-06-24T00:00:00.000Z",
        ...clone(payload)
      };
      this.state.challenges.set(id, challenge);
      this.result = {
        data: {
          id,
          expires_at: challenge.expires_at,
          delivery_channel: challenge.delivery_channel
        },
        error: null
      };
    }

    return this;
  }

  update(payload) {
    this.pendingUpdate = clone(payload);
    return this;
  }

  async single() {
    return this.result;
  }

  async maybeSingle() {
    if (this.table === "auth_otp_challenges") {
      const challenge = this.state.challenges.get(this.filters.id);
      if (!challenge || challenge.phone !== this.filters.phone) {
        return { data: null, error: null };
      }
      return { data: clone(challenge), error: null };
    }

    return this.result;
  }

  then(resolve, reject) {
    if (this.pendingUpdate && this.table === "auth_otp_challenges") {
      this.state.calls.push({
        table: this.table,
        operation: "update",
        filters: clone(this.filters),
        payload: clone(this.pendingUpdate)
      });
      const challenge = this.state.challenges.get(this.filters.id);
      if (challenge) {
        Object.assign(challenge, clone(this.pendingUpdate));
      }
      return Promise.resolve({ data: null, error: null }).then(resolve, reject);
    }

    return Promise.resolve(this.result).then(resolve, reject);
  }
}

async function expectRejects(label, action, pattern, statusCode) {
  try {
    await action();
    pushCheck(label, false);
  } catch (error) {
    pushCheck(label, [
      pattern.test(String(error.message || "")),
      statusCode ? error.statusCode === statusCode : true
    ].every(Boolean));
  }
}

function buildChallenge({ id, phone, email, code, attempts, expiresAt }) {
  return {
    id,
    phone,
    email,
    purpose: "login",
    code_hash: hashOtp({ phone, code, secret: otpSecret }),
    delivery_channel: "sms-webhook",
    attempts,
    expires_at: expiresAt,
    verified_at: null,
    metadata: {}
  };
}

function hashOtp({ phone, code, secret }) {
  return createHmac("sha256", secret)
    .update(`${normalizePhone(phone)}.${code}`)
    .digest("hex");
}

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function printReport() {
  const failed = checks.filter((check) => !check.passed);
  console.log(`OTP contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}

async function main() {
  await checkSupabaseOtpRequestStoresHashAndHidesDemoCode();
  await checkOtpInsertFailureDoesNotDeliverCode();
  await checkOtpHashSecretIsRequiredBeforeDelivery();
  await checkOtpDeliveryConfigIsRequiredBeforeStorage();
  await checkSmsWebhookTokenIsRequiredBeforeStorage();
  await checkSmsWebhookUrlIsValidatedBeforeStorage();
  await checkSmsWebhookSendsBearerToken();
  await checkVerifyOtpAttemptsAndSuccess();
  await checkMaxAttemptsAndExpiryBlockVerification();
  checkOtpReadinessRequiresStrongSecret();

  const failed = checks.filter((check) => !check.passed);
  printReport();

  if (failed.length > 0) {
    process.exit(1);
  }
}

await main();
