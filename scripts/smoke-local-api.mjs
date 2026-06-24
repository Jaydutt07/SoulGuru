import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const includeAi = args.includes("--include-ai");
const includeWrites = args.includes("--include-writes");
const keepServer = args.includes("--keep-server");
const externalUrl = getArgValue("--url") || process.env.API_BASE_URL || "";
const host = getArgValue("--host") || "127.0.0.1";
const port = getArgValue("--port") || "5187";
const baseUrl = (externalUrl || `http://${host}:${port}`).replace(/\/$/, "");

const report = {
  ok: true,
  baseUrl,
  startedServer: false,
  checkedAt: new Date().toISOString(),
  checks: []
};

let server = null;
let exitCode = 1;
let stoppingServer = false;

try {
  if (!externalUrl) {
    server = startViteServer({ host, port });
    report.startedServer = true;
  }

  await waitForHealth(baseUrl);
  await checkHealth();
  await checkReadiness();
  await checkProfileLookup();
  await checkMoreGuidanceDashboard();
  await checkMoreGuidanceDeep();
  await maybeCheckOtpRequest();
  await maybeCheckSoulWisdom();
  await maybeCheckAstroSolve();

  printReport(report);
  exitCode = report.ok ? 0 : 1;
} catch (error) {
  if (!error.handled) {
    pushCheck({
      id: "smoke-runner",
      label: "Smoke runner",
      passed: false,
      detail: error.message || "Local API smoke failed unexpectedly."
    });
  }
  printReport(report);
  exitCode = 1;
} finally {
  if (server && !keepServer) {
    await stopServer(server);
  }
}

process.exit(exitCode);

function startViteServer({ host: serverHost, port: serverPort }) {
  const child = spawn("npm", ["run", "dev", "--", "--host", serverHost, "--port", serverPort, "--strictPort"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      MORE_GUIDANCE_ALLOW_LOCAL_ACCESS: "true",
      ...(includeAi ? {
        SOUL_WISDOM_ALLOW_UNCACHED: "true",
        ASTRO_SOLVES_ALLOW_LOCAL_QUOTA: "true"
      } : {}),
      ...(includeAi ? {} : { MORE_GUIDANCE_DISABLE_OPENAI: "true" })
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout.on("data", (chunk) => {
    if (args.includes("--verbose")) process.stdout.write(chunk);
  });
  child.stderr.on("data", (chunk) => {
    if (args.includes("--verbose")) process.stderr.write(chunk);
  });

  child.on("exit", (code) => {
    if (stoppingServer || !report.ok || code === 0 || keepServer) return;
    console.error(`Local Vite server exited early with code ${code}.`);
  });

  return child;
}

async function waitForHealth(url) {
  const healthUrl = `${url}/api/health`;
  const started = Date.now();
  const timeoutMs = 20000;
  let lastError = "";

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(healthUrl, { headers: { Accept: "application/json" } });
      if (response.ok) return;
      lastError = `status ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await sleep(350);
  }

  pushCheck({
    id: "server-start",
    label: "Local API startup",
    passed: false,
    detail: `Unable to reach ${healthUrl}: ${lastError || "timed out"}`
  });
  const error = new Error("Local API startup failed.");
  error.handled = true;
  throw error;
}

async function checkHealth() {
  const result = await requestJson("GET", "/api/health");
  const passed = result.status === 200 && result.body?.ok === true;
  pushCheck({
    id: "health",
    label: "Health endpoint",
    passed,
    status: result.status,
    detail: passed ? "Health endpoint returned ok=true." : "Expected 200 with ok=true."
  });
}

async function checkReadiness() {
  const result = await requestJson("GET", "/api/readiness");
  const passed = [200, 503].includes(result.status) && typeof result.body?.ok === "boolean";
  pushCheck({
    id: "readiness",
    label: "Readiness endpoint",
    passed,
    status: result.status,
    detail: passed ? `Readiness status is ${result.body.status}.` : "Expected readiness JSON with ok boolean."
  });
}

async function checkProfileLookup() {
  const result = await requestJson("POST", "/api/user-profile", {
    action: "lookup",
    phone: "+919999001234"
  });
  const passed = result.status === 200 && "configured" in (result.body || {});
  pushCheck({
    id: "profile-lookup",
    label: "User profile lookup",
    passed,
    status: result.status,
    detail: passed ? `Profile service configured=${Boolean(result.body.configured)}.` : "Expected profile lookup JSON."
  });
}

async function checkMoreGuidanceDashboard() {
  const result = await requestJson("POST", "/api/more-guidance", {
    action: "dashboard",
    limit: 3,
    user: smokeUser()
  });
  const passed = result.status === 200 && Array.isArray(result.body?.guidanceHistory) && Array.isArray(result.body?.savedGuidance);
  pushCheck({
    id: "more-guidance-dashboard",
    label: "More Guidance dashboard",
    passed,
    status: result.status,
    detail: passed ? `Dashboard configured=${Boolean(result.body.configured)}.` : "Expected dashboard history arrays."
  });
}

async function checkMoreGuidanceDeep() {
  const result = await requestJson("POST", "/api/more-guidance", {
    action: "deep-guidance",
    date: "2026-06-24",
    timezone: "Asia/Kolkata",
    subscription: {
      active: true,
      name: "Soul Guru + Astro Solve",
      astroBonusQuestions: 15
    },
    user: {
      ...smokeUser(),
      soulGuruSubscription: {
        active: true,
        name: "Soul Guru + Astro Solve",
        astroBonusQuestions: 15
      }
    },
    fallback: {
      overview: "Smoke, the deeper pattern is about making one practical duty visible before it turns into emotional noise. Give the day a clear finish line, keep over-explaining away from sensitive conversations, and let one completed action rebuild trust in your timing. This paid map should feel fuller than a daily cue while still staying grounded in ordinary choices, body rhythm, work focus, and cleaner relationship timing.",
      thisWeek: "This week, protect the first useful task from distraction. Shorten one reply, name one cost before saying yes, and let a small completed promise carry more weight than another long explanation.",
      thisMonth: "This month, watch what repeats in saved readings. If the same pressure returns through different duties, treat it as a pattern asking for structure, not a reason to panic.",
      practice: "For seven days, write one evening line about what became lighter because you handled it directly.",
      focus: "Make the pattern visible",
      watch: "Over-explaining under pressure"
    }
  });
  const guidance = result.body?.guidance || {};
  const passed = result.status === 200 && Boolean(guidance.overview && guidance.thisWeek && guidance.thisMonth && guidance.practice);
  pushCheck({
    id: "more-guidance-deep",
    label: "More Guidance deep reading",
    passed,
    status: result.status,
    detail: passed
      ? `${result.body.source || "unknown"} guidance returned for ${result.body.readingDate || "requested date"}.`
      : result.body?.error || "Expected deep guidance fields."
  });
}

async function maybeCheckOtpRequest() {
  if (!includeWrites) {
    pushCheck({
      id: "otp-request",
      label: "OTP request",
      passed: true,
      skipped: true,
      detail: "Skipped by default to avoid sending OTPs or writing OTP challenges. Use --include-writes."
    });
    return;
  }

  const result = await requestJson("POST", "/api/auth-otp", {
    action: "request",
    phone: "+919999001235",
    email: "smoke@soulguru.local",
    purpose: "login"
  });
  const passed = result.status === 200 && "configured" in (result.body || {});
  pushCheck({
    id: "otp-request",
    label: "OTP request",
    passed,
    status: result.status,
    detail: passed ? `OTP configured=${Boolean(result.body.configured)}.` : "Expected OTP request JSON."
  });
}

async function maybeCheckSoulWisdom() {
  if (!includeAi) {
    pushCheck({
      id: "soul-wisdom",
      label: "Soul Wisdom AI route",
      passed: true,
      skipped: true,
      detail: "Skipped by default to avoid OpenAI spend. Use --include-ai."
    });
    return;
  }

  const result = await requestJson("POST", "/api/soul-wisdom", {
    user: smokeUser(),
    date: "2026-06-24",
    timezone: "Asia/Kolkata",
    today: "Wednesday, June 24, 2026",
    fallback: {
      wisdom: "A small practical detail deserves less room in your mind than it has been taking. Smoke, make the day smaller on purpose and keep over-explaining away from the conversation that needs attention. Let care guide your pace without hardening you. Keep one real promise cleanly, and leave enough space for the body to settle before you decide what silence means.",
      innerWeather: "Focused but tender",
      todayMove: "Finish the nearest real task",
      release: "Drop the need to prove it"
    }
  });
  const wisdom = result.body?.reading?.wisdom || result.body?.wisdom || "";
  const passed = result.status === 200 && wisdom.split(/\s+/).filter(Boolean).length >= 55;
  pushCheck({
    id: "soul-wisdom",
    label: "Soul Wisdom AI route",
    passed,
    status: result.status,
    detail: passed ? `Generated ${wisdom.split(/\s+/).filter(Boolean).length} words.` : result.body?.error || "Expected daily wisdom."
  });
}

async function maybeCheckAstroSolve() {
  if (!includeAi) {
    pushCheck({
      id: "astro-solve",
      label: "Astro Solves AI route",
      passed: true,
      skipped: true,
      detail: "Skipped by default to avoid OpenAI spend. Use --include-ai."
    });
    return;
  }

  const result = await requestJson("POST", "/api/astro-solve", {
    user: smokeUser(),
    question: "Why do I feel stuck in my career progress this week?",
    priorCount: 0,
    today: "Wednesday, June 24, 2026",
    fallback: {
      root: "The root pattern is pressure around timing, recognition, and proof. Your effort wants a visible result, but the current rhythm is asking for better structure before expansion.",
      astrology: "The supplied chart context points toward work, responsibility, and emotional steadiness. Treat the delay as a discipline signal, not a permanent judgment.",
      solution: "For seven days, write one measurable target each morning, complete the most practical action before noon, and keep a short evening record of what moved."
    }
  });
  const passed = result.status === 200 && Boolean(result.body?.answer?.root || result.body?.root);
  pushCheck({
    id: "astro-solve",
    label: "Astro Solves AI route",
    passed,
    status: result.status,
    detail: passed ? "Astro Solves returned structured answer fields." : result.body?.error || "Expected Astro Solves answer."
  });
}

async function requestJson(method, path, body) {
  const url = `${baseUrl}${path}`;
  try {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    return {
      status: response.status,
      body: await response.json().catch(() => null)
    };
  } catch (error) {
    return {
      status: 0,
      body: null,
      error: error.message
    };
  }
}

function smokeUser() {
  return {
    id: "smoke-user",
    name: "Smoke User",
    phone: "+919999001234",
    email: "smoke@soulguru.local",
    birthDate: "1994-08-17",
    birthTime: "06:35",
    birthPlace: "Mumbai"
  };
}

function pushCheck(check) {
  report.checks.push(check);
  if (!check.passed) {
    report.ok = false;
  }
}

function printReport(result) {
  console.log(`SoulGuru local API smoke: ${result.ok ? "pass" : "fail"}`);
  console.log(`URL: ${result.baseUrl}`);
  for (const check of result.checks) {
    const marker = check.skipped ? "SKIP" : check.passed ? "PASS" : "FAIL";
    const status = check.status ? ` (${check.status})` : "";
    console.log(`${marker} ${check.label}${status}`);
    console.log(`  ${check.detail}`);
  }
}

function getArgValue(name) {
  const arg = args.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stopServer(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode) {
      resolve();
      return;
    }

    stoppingServer = true;
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 2500);

    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill("SIGTERM");
  });
}
