import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src", "main.jsx"), "utf8");
const checks = [];

const blocks = {
  app: extractFunction("App"),
  splash: extractFunction("Splash"),
  auth: extractFunction("AuthScreen"),
  mentor: extractFunction("MentorApp"),
  soul: extractFunction("SoulGuruTab"),
  astro: extractFunction("AstroSolvesTab"),
  shani: extractFunction("ShaniTab"),
  numbers: extractFunction("NumbersTab"),
  harmony: extractFunction("HarmonyTab"),
  settings: extractFunction("SettingsDrawer")
};

checkWelcomeAndLoginSurface();
checkPrimaryTabContract();
checkSoulGuruSurface();
checkAstroSolvesSurface();
checkShaniSurface();
checkNumbersSurface();
checkHarmonySurface();
checkSettingsSurface();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkWelcomeAndLoginSurface() {
  pushCheck("Splash keeps the calm Soul Guru entry promise", includesAll(blocks.splash, [
    "splash-screen",
    "splash-water",
    "<h1>Soul Guru</h1>",
    "guardian angel for you",
    "Enter"
  ]));

  pushCheck("Login keeps existing-account and new-account OTP flows", includesAll(blocks.auth, [
    "Already existing account",
    "Create new account",
    "Name",
    "Birth date",
    "Birth time",
    "Birth place",
    "Email",
    "Phone number",
    "OTP sent",
    "Verify and enter"
  ]));
}

function checkPrimaryTabContract() {
  pushCheck("Soul Guru is the default tab after launch, login, and logout", includesAll(blocks.app, [
    "const [activeTab, setActiveTab] = useState(\"soul\");",
    "setActiveTab(\"soul\");"
  ]));

  pushCheck("Top navigation keeps the five required tabs in order with exact labels", /const TABS = \[\s*\{ id: "soul", label: "Soul Guru", Icon: Sparkles \},\s*\{ id: "astro", label: "Astro Solves", Icon: ShieldCheck \},\s*\{ id: "shani", label: "Shani", Icon: Clock3 \},\s*\{ id: "numbers", label: "#Numbers", Icon: Hash \},\s*\{ id: "harmony", label: "Harmony", Icon: Heart \}\s*\];/s.test(source));

  pushCheck("Tab shell renders tabs at the top and routes each product tab", includesAll(blocks.mentor, [
    "className=\"top-tabs\"",
    "aria-label=\"SoulGuru tabs\"",
    "TABS.map(({ id, label, Icon }) => (",
    "className={activeTab === id ? \"active\" : \"\"}",
    "onClick={() => onTabChange(id)}",
    "{activeTab === \"soul\" && (",
    "{activeTab === \"astro\" && <AstroSolvesTab",
    "{activeTab === \"shani\" && <ShaniTab",
    "{activeTab === \"numbers\" && <NumbersTab",
    "{activeTab === \"harmony\" && <HarmonyTab"
  ]));

  pushCheck("Settings remains available from the app header", includesAll(blocks.mentor, [
    "aria-label=\"Open settings\"",
    "<Settings size={20} aria-hidden=\"true\" />",
    "{settingsOpen && (",
    "<SettingsDrawer"
  ]));
}

function checkSoulGuruSurface() {
  pushCheck("Soul Guru tab presents the Words of Wisdom reading surface", includesAll(blocks.soul, [
    "<p className=\"eyebrow\">Soul Guru</p>",
    "<h2>Words of Wisdom</h2>",
    "wisdom-panel",
    "Inner weather",
    "Move",
    "Release",
    "Save Advice",
    "wisdom-feedback",
    "sendWisdomFeedback(\"accurate\")",
    "sendWisdomFeedback(\"missed\")",
    "Accurate",
    "Missed",
    "More Guidance"
  ]));

  pushCheck("Soul Guru More Guidance button opens the paid subscription page", includesAll(blocks.mentor, [
    "onMoreGuidance={() => onTabChange(\"subscription\")}",
    "{activeTab === \"subscription\" && (",
    "onBack={() => onTabChange(\"soul\")}"
  ]));
}

function checkAstroSolvesSurface() {
  pushCheck("Astro Solves keeps the problem-to-solution product surface", includesAll(blocks.astro, [
    "<p className=\"eyebrow\">Astro Solves</p>",
    "<h2>Solution for everything</h2>",
    "Share your problem",
    "{remaining} detailed analysis left",
    "Get solution",
    "Root",
    "Astrology",
    "Solution"
  ]));

  pushCheck("Astro Solves enforces free allowance and points upgrade copy to More Guidance", includesAll(blocks.astro, [
    "const [serverAllowance, setServerAllowance] = useState(null);",
    "const localAllowance = getAstroQuestionAllowance(user);",
    "const allowance = serverAllowance?.limit ?? localAllowance;",
    "serverAllowance?.remaining",
    "remaining <= 0",
    "More Guidance adds 15 more questions.",
    "More Guidance can continue from here."
  ]));
}

function checkShaniSurface() {
  pushCheck("Shani tab keeps exact capitalization and Saade Sati surface", includesAll(blocks.shani, [
    "<p className=\"eyebrow\">Shani</p>",
    "<h2>Saade Sati</h2>",
    "Time remaining",
    "Next watch window",
    "Remedy membership",
    "Open Pandit chat"
  ]));

  pushCheck("Shani countdown shows years, months, and days only", [
    includesAll(blocks.shani, [
      "countdown.years",
      "<span>years</span>",
      "countdown.months",
      "<span>months</span>",
      "countdown.days",
      "<span>days</span>"
    ]),
    !/\bcountdown\.hours\b/i.test(blocks.shani),
    !/<span>\s*hours?\s*<\/span>/i.test(blocks.shani),
    !/<p className="eyebrow">shani<\/p>/.test(blocks.shani)
  ].every(Boolean));
}

function checkNumbersSurface() {
  pushCheck("#Numbers keeps the required title and playful numerology cards", [
    includesAll(blocks.numbers, [
      "<p className=\"eyebrow\">#Numbers</p>",
      "<h2>Numbers that Build Life</h2>",
      "const numbers = useMemo(() => getNumbers(user), [user]);",
      "number-grid",
      "number-card",
      "item.note"
    ]),
    !blocks.numbers.includes("<h2>numbers that build life</h2>")
  ].every(Boolean));
}

function checkHarmonySurface() {
  pushCheck("Harmony keeps the Love Guru compatibility workflow", includesAll(blocks.harmony, [
    "<p className=\"eyebrow\">Harmony</p>",
    "<h2>Love Guru</h2>",
    "Partner name",
    "Partner birth date",
    "generateCompatibility(user, partner)",
    "Check harmony",
    "compat-result"
  ]));
}

function checkSettingsSurface() {
  pushCheck("Settings drawer exposes the core profile and entitlement details", includesAll(blocks.settings, [
    "<p className=\"eyebrow\">Settings</p>",
    "<dt>Phone</dt>",
    "<dt>Email</dt>",
    "<dt>Birth date</dt>",
    "<dt>Birth time</dt>",
    "<dt>Birth place</dt>",
    "<dt>Astro Solves</dt>",
    "<dt>More Guidance</dt>",
    "Soul Guru + Astro Solve",
    "Sign out"
  ]));

  pushCheck("Settings drawer exposes backend connection status for mobile QA", includesAll(blocks.settings, [
    "backendStatus",
    "<p className=\"eyebrow\">Backend</p>",
    "backend-status-panel",
    "API_BASE_URL",
    "refreshBackendStatus",
    "<RefreshCw size={16} aria-hidden=\"true\" />"
  ]));
}

function includesAll(text, snippets) {
  return snippets.every((snippet) => text.includes(snippet));
}

function extractFunction(name) {
  const start = source.indexOf(`function ${name}`);
  if (start === -1) return "";

  const paramsEnd = source.indexOf(")", start);
  const openBrace = source.indexOf("{", paramsEnd);
  if (openBrace === -1) return source.slice(start);

  let depth = 0;
  for (let index = openBrace; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }

  return source.slice(start);
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function printReport() {
  console.log(`Client product surface contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}
