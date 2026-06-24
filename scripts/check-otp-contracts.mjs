import { createHash } from "node:crypto";
import { requestOtp, verifyOtp } from "../src/backend/otpService.js";

const checks = [];
const phone = "+919800000004";
const email = "otp@soulguru.local";
const otpSecret = "contract-otp-secret";

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
    OTP_EXPIRY_MINUTES: "12"
  }, {
    supabase,
    createOtpCode: () => "123456",
    deliverOtp: async (payload) => {
      deliveries.push(payload);
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
  const repeat = await verifyOtp({
    challengeId: "otp-verify",
    phone,
    code: "654321"
  }, {
    OTP_HASH_SECRET: otpSecret
  }, {
    supabase
  });

  pushCheck("Correct OTP verifies after a failed attempt", [
    afterWrong.attempts === 1,
    success.configured === true,
    success.verified === true,
    Boolean(success.verifiedAt),
    afterSuccess.attempts === 2,
    Boolean(afterSuccess.verified_at),
    repeat.alreadyVerified === true
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

function createFakeSupabase({ challenges = [] } = {}) {
  const state = {
    calls: [],
    challenges: new Map(),
    nextChallengeId: 1
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
  return createHash("sha256")
    .update(`${normalizePhone(phone)}.${code}.${secret}`)
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
  await checkVerifyOtpAttemptsAndSuccess();
  await checkMaxAttemptsAndExpiryBlockVerification();

  const failed = checks.filter((check) => !check.passed);
  printReport();

  if (failed.length > 0) {
    process.exit(1);
  }
}

await main();
