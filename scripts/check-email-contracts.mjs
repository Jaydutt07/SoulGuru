import { buildMembershipEmail, isResendConfigured, sendEmail } from "../src/backend/emailService.js";

const checks = [];

await checkUnconfiguredAndInvalidEmailSkipsNetwork();
await checkResendPayloadContract();
await checkResendErrorContract();
checkMembershipEmailContract();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

async function checkUnconfiguredAndInvalidEmailSkipsNetwork() {
  let fetchCalls = 0;
  const deps = {
    fetch: async () => {
      fetchCalls += 1;
      return okJson({});
    }
  };

  const unconfigured = await sendEmail({
    to: "asha@example.com",
    subject: "Hello",
    text: "Body"
  }, {}, deps);
  const missingFields = await sendEmail({
    to: "",
    subject: "Hello",
    text: "Body"
  }, {
    RESEND_API_KEY: "re_contract",
    RESEND_FROM_EMAIL: "SoulGuru <hello@soulguru.app>"
  }, deps);
  const placeholderConfig = await sendEmail({
    to: "asha@example.com",
    subject: "Hello",
    text: "Body"
  }, {
    RESEND_API_KEY: "fake-resend-key",
    RESEND_FROM_EMAIL: "<sender-email>"
  }, deps);

  pushCheck("Email service skips network when unconfigured or missing fields", [
    unconfigured.sent === false,
    unconfigured.skipped === true,
    missingFields.sent === false,
    missingFields.skipped === true,
    /missing/i.test(missingFields.reason || ""),
    placeholderConfig.sent === false,
    placeholderConfig.skipped === true,
    /resend is not configured/i.test(placeholderConfig.reason || ""),
    fetchCalls === 0
  ].every(Boolean));
  pushCheck("Email service treats only real Resend env values as configured", [
    isResendConfigured({
      RESEND_API_KEY: "re_contract_key",
      RESEND_FROM_EMAIL: "SoulGuru <hello@soulguru.app>"
    }) === true,
    isResendConfigured({
      RESEND_API_KEY: "placeholder",
      RESEND_FROM_EMAIL: "SoulGuru <hello@soulguru.app>"
    }) === false,
    isResendConfigured({
      RESEND_API_KEY: "re_contract_key",
      RESEND_FROM_EMAIL: "SoulGuru <not-an-email>"
    }) === false
  ].every(Boolean));
}

async function checkResendPayloadContract() {
  const seen = [];
  const result = await sendEmail({
    to: "asha@example.com",
    subject: "Your SoulGuru login OTP",
    text: "Your SoulGuru OTP is 123456.",
    html: "<p>Your SoulGuru OTP is <strong>123456</strong>.</p>",
    tags: [{ name: "category", value: "otp" }]
  }, {
    RESEND_API_KEY: "re_contract_key",
    RESEND_FROM_EMAIL: "SoulGuru <hello@soulguru.app>"
  }, {
    fetch: async (url, options) => {
      seen.push(parseRequest(url, options));
      return okJson({ id: "email_contract_1" });
    }
  });
  const request = seen[0];

  pushCheck("Email service sends Resend API payload with server key", [
    request.url === "https://api.resend.com/emails",
    request.method === "POST",
    request.headers.Authorization === "Bearer re_contract_key",
    request.headers["Content-Type"] === "application/json",
    request.body.from === "SoulGuru <hello@soulguru.app>",
    Array.isArray(request.body.to),
    request.body.to[0] === "asha@example.com",
    request.body.subject === "Your SoulGuru login OTP",
    request.body.text.includes("123456"),
    request.body.html.includes("<strong>123456</strong>"),
    request.body.tags[0].name === "category",
    request.body.tags[0].value === "otp",
    result.sent === true,
    result.id === "email_contract_1"
  ].every(Boolean));
}

async function checkResendErrorContract() {
  await expectRejects(
    "Email service surfaces Resend errors",
    () => sendEmail({
      to: "asha@example.com",
      subject: "Hello",
      text: "Body"
    }, {
      RESEND_API_KEY: "re_contract_key",
      RESEND_FROM_EMAIL: "SoulGuru <hello@soulguru.app>"
    }, {
      fetch: async () => ({
        ok: false,
        status: 429,
        async json() {
          return { message: "Rate limited by Resend" };
        }
      })
    }),
    /rate limited/i
  );
}

function checkMembershipEmailContract() {
  const email = buildMembershipEmail({
    name: "Asha <script>alert(1)</script>",
    endsAt: "2026-09-01T00:00:00.000Z"
  });

  pushCheck("Membership email describes paid plan and 15 Astro Solves questions", [
    email.subject === "Your Soul Guru + Astro Solve guidance is active",
    email.text.includes("Soul Guru + Astro Solve guidance is active"),
    email.text.includes("15 additional Astro Solves questions"),
    email.text.includes("2026"),
    email.html.includes("Soul Guru + Astro Solve is active"),
    email.html.includes("15 additional Astro Solves questions"),
    email.html.includes("2026")
  ].every(Boolean));
  pushCheck("Membership email escapes HTML in rendered fields", [
    email.html.includes("Asha &lt;script&gt;alert(1)&lt;/script&gt;"),
    !email.html.includes("<script>alert(1)</script>")
  ].every(Boolean));
}

async function expectRejects(label, action, pattern) {
  try {
    await action();
    pushCheck(label, false);
  } catch (error) {
    pushCheck(label, pattern.test(String(error.message || "")));
  }
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
  console.log(`Email contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}
