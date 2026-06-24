import { applyVerifiedIdentity, getBearerToken } from "../src/backend/auth.js";

const checks = [];

await checkBearerParsing();
await checkMissingSecretBehavior();
await checkMissingAndInvalidTokenBehavior();
await checkVerifiedTokenInjectsClerkIdentity();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

async function checkBearerParsing() {
  pushCheck("Bearer token parser handles common header shapes", [
    getBearerToken({ headers: { authorization: "Bearer token-one" } }) === "token-one",
    getBearerToken({ headers: { Authorization: "bearer token-two" } }) === "token-two",
    getBearerToken({ headers: { authorization: ["Bearer token-three"] } }) === "token-three",
    getBearerToken({ headers: { authorization: "Basic nope" } }) === "",
    getBearerToken({ headers: {} }) === ""
  ].every(Boolean));
}

async function checkMissingSecretBehavior() {
  const optional = await applyVerifiedIdentity(req(), payload(), {
    CLERK_REQUIRE_AUTH: "false"
  });

  pushCheck("Missing Clerk secret skips only when auth is optional", [
    optional.auth?.skipped === true,
    optional.auth?.verified === false,
    optional.payload.user.name === "Asha Rao"
  ].every(Boolean));

  await expectRejects(
    "Missing Clerk secret fails closed when auth is required",
    () => applyVerifiedIdentity(req(), payload(), {
      CLERK_REQUIRE_AUTH: "true"
    }),
    /not configured/i,
    503
  );
}

async function checkMissingAndInvalidTokenBehavior() {
  const optionalMissing = await applyVerifiedIdentity(req(), payload(), {
    CLERK_SECRET_KEY: "sk_test_contract",
    CLERK_REQUIRE_AUTH: "false"
  });

  pushCheck("Missing token is allowed only when auth is optional", [
    optionalMissing.auth?.missing === true,
    optionalMissing.auth?.verified === false,
    !optionalMissing.payload.user.authUserId
  ].every(Boolean));

  await expectRejects(
    "Missing token is rejected when auth is required",
    () => applyVerifiedIdentity(req(), payload(), {
      CLERK_SECRET_KEY: "sk_test_contract",
      CLERK_REQUIRE_AUTH: "true"
    }),
    /required/i,
    401
  );

  const optionalInvalid = await applyVerifiedIdentity(req("bad-token"), payload(), {
    CLERK_SECRET_KEY: "sk_test_contract",
    CLERK_REQUIRE_AUTH: "false"
  }, {
    verifyToken: async () => {
      throw new Error("bad token");
    }
  });

  pushCheck("Invalid token is reported when auth is optional", [
    optionalInvalid.auth?.invalid === true,
    optionalInvalid.auth?.verified === false,
    !optionalInvalid.payload.user.authUserId
  ].every(Boolean));

  await expectRejects(
    "Invalid token is rejected when auth is required",
    () => applyVerifiedIdentity(req("bad-token"), payload(), {
      CLERK_SECRET_KEY: "sk_test_contract",
      CLERK_REQUIRE_AUTH: "true"
    }, {
      verifyToken: async () => {
        throw new Error("bad token");
      }
    }),
    /invalid/i,
    401
  );
}

async function checkVerifiedTokenInjectsClerkIdentity() {
  const seen = {};
  const result = await applyVerifiedIdentity(req("valid-token"), payload(), {
    CLERK_SECRET_KEY: "sk_test_contract",
    CLERK_REQUIRE_AUTH: "true",
    CLERK_JWT_AUDIENCE: "soulguru-api, mobile-app",
    CLERK_AUTHORIZED_PARTIES: "https://soulguru.app, capacitor://localhost"
  }, {
    verifyToken: async (token, options) => {
      seen.token = token;
      seen.options = options;
      return {
        sub: "user_clerk_contract",
        sid: "sess_contract"
      };
    }
  });

  pushCheck("Verified Clerk token injects backend identity", [
    seen.token === "valid-token",
    seen.options.secretKey === "sk_test_contract",
    seen.options.audience.length === 2,
    seen.options.audience[0] === "soulguru-api",
    seen.options.audience[1] === "mobile-app",
    seen.options.authorizedParties.length === 2,
    result.auth?.verified === true,
    result.auth?.authUserId === "user_clerk_contract",
    result.auth?.sessionId === "sess_contract",
    result.payload.user.name === "Asha Rao",
    result.payload.user.phone === "+919000000001",
    result.payload.user.authUserId === "user_clerk_contract",
    result.payload.user.clerkSessionId === "sess_contract"
  ].every(Boolean));
}

function req(token = "") {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {}
  };
}

function payload() {
  return {
    user: {
      name: "Asha Rao",
      phone: "+919000000001"
    }
  };
}

async function expectRejects(label, action, pattern, statusCode) {
  try {
    await action();
    pushCheck(label, false);
  } catch (error) {
    pushCheck(label, [
      pattern.test(String(error.message || "")),
      error.statusCode === statusCode
    ].every(Boolean));
  }
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function printReport() {
  console.log(`Auth contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}
