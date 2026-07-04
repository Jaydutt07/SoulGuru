import fs from "node:fs";
import path from "node:path";
import { SOUL_WISDOM_PROMPT_VERSION } from "../src/soulWisdomVersion.js";

const source = fs.readFileSync(path.join(process.cwd(), "src", "main.jsx"), "utf8");
const authClientSource = fs.readFileSync(path.join(process.cwd(), "src", "authClient.js"), "utf8");
const checks = [];

checkFrontendClerkBridge();
checkProductionExistingLoginPrefersServerProfile();
checkProductionCreateIgnoresLocalDuplicateCache();
checkProductionCreateRequiresProfilePersistence();
checkProductionDoesNotPersistLocalSessions();
checkNativeDebugApkKeepsLocalAuthFallback();
checkLoginAnalyticsUsesDirectProfileSource();
checkProductionSoulGuruRequiresStoredBackendReading();
checkProductionSoulGuruRetriesPendingBackendReading();
checkProductionSoulGuruPrefetchesAndDedupesDailyReading();
checkSoulGuruCacheUsesCurrentPromptVersion();
checkProductionAstroSolvesSyncsBackendAllowance();
checkProductionAstroSolvesRequiresStoredBackendAnswer();
checkProductionMoreGuidanceRequiresStoredBackendAnswer();
checkProductionSaveAdviceRequiresStoredBackendAnswer();
checkProductionShaniDoesNotTrustLocalMemberPlan();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkProductionExistingLoginPrefersServerProfile() {
  pushCheck("Production existing-account login prefers server profile over local cache", source.includes(
    "const account = await lookupAccountFromServer(phone) || (LOCAL_AUTH_FALLBACK_ENABLED ? accounts[phone] : null);"
  ));
}

function checkFrontendClerkBridge() {
  pushCheck("Frontend Clerk bridge loads configured ClerkJS and attaches bearer tokens", [
    source.includes("from \"./authClient.js\";"),
    source.includes("authFetch,"),
    source.includes("initializeClerkAuth,"),
    source.includes("initializeClerkAuth();"),
    authClientSource.includes("const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || \"\";"),
    authClientSource.includes("https://${clerkDomain}/npm/@clerk/ui@1/dist/ui.browser.js"),
    authClientSource.includes("https://${clerkDomain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js"),
    authClientSource.includes("\"data-clerk-publishable-key\": CLERK_PUBLISHABLE_KEY"),
    authClientSource.includes("headers.set(\"Authorization\", `Bearer ${token}`);"),
    authClientSource.includes("return window.atob(padded).replace(/\\$$/, \"\");"),
    authClientSource.includes("export async function getClerkSessionSnapshot()"),
    authClientSource.includes("export async function openClerkSignIn()"),
    authClientSource.includes("export async function signOutClerk()"),
    source.includes("<section className=\"secure-session-panel\">"),
    source.includes("signOutClerk();")
  ].every(Boolean));
}

function checkProductionCreateIgnoresLocalDuplicateCache() {
  pushCheck("Production account creation treats only server profile as duplicate", source.includes(
    "if ((LOCAL_AUTH_FALLBACK_ENABLED && accounts[phone]) || serverAccount) {"
  ));
}

function checkProductionCreateRequiresProfilePersistence() {
  pushCheck("Production account creation requires profile persistence before login", [
    source.includes("if (!LOCAL_AUTH_FALLBACK_ENABLED) {"),
    source.includes("const profile = await syncUserProfileToServer(account);"),
    source.includes("setError(\"Unable to save your account profile. Please try again shortly.\");"),
    source.includes("onLogin(mergeAccountProfile(account, profile), { flow: \"create\", method: \"direct_profile\" });")
  ].every(Boolean));
}

function checkProductionDoesNotPersistLocalSessions() {
  pushCheck("Production login does not persist or restore local account sessions", [
    source.includes("if (LOCAL_AUTH_FALLBACK_ENABLED) {\n      window.localStorage.setItem(SESSION_KEY, enrichedAccount.phone);"),
    source.includes("if (LOCAL_AUTH_FALLBACK_ENABLED) {\n        window.localStorage.setItem(SESSION_KEY, next.phone);"),
    source.includes("if (!LOCAL_AUTH_FALLBACK_ENABLED) {\n    return enrichedAccount;\n  }"),
    source.includes("function getSessionUser() {\n  if (!LOCAL_AUTH_FALLBACK_ENABLED) return null;")
  ].every(Boolean));
}

function checkNativeDebugApkKeepsLocalAuthFallback() {
  pushCheck("Native APK without backend URL keeps local direct-auth fallback unless explicitly disabled", [
    source.includes("const LOCAL_AUTH_FALLBACK_SETTING = import.meta.env.VITE_LOCAL_AUTH_FALLBACK;"),
    source.includes("const IS_NATIVE_MOBILE_SHELL = detectNativeMobileShell();"),
    source.includes("const NATIVE_DEMO_AUTH_DEFAULT = IS_NATIVE_MOBILE_SHELL && !API_BASE_URL && LOCAL_AUTH_FALLBACK_SETTING !== \"false\";"),
    source.includes("const LOCAL_AUTH_FALLBACK_ENABLED = LOCAL_AUTH_FALLBACK_SETTING === \"true\" || import.meta.env.MODE !== \"production\" || NATIVE_DEMO_AUTH_DEFAULT;"),
    source.includes("const LOCAL_READING_FALLBACK_ENABLED = LOCAL_AUTH_FALLBACK_ENABLED && !API_BASE_URL;"),
    source.includes("function detectNativeMobileShell() {"),
    source.includes("return [\"android\", \"ios\"].includes(capacitor.getPlatform?.());")
  ].every(Boolean));
}

function checkLoginAnalyticsUsesDirectProfileSource() {
  pushCheck("Client login analytics records direct profile entry without OTP layer", [
    source.includes("function handleLogin(account, loginMeta = {}) {"),
    source.includes("method: loginMeta.method || \"direct_profile\""),
    source.includes("server_backed: Boolean(loginMeta.serverBacked)"),
    source.includes("onLogin(account, { flow: \"existing\", method: \"direct_profile\" });"),
    source.includes("onLogin(mergeAccountProfile(account, profile), { flow: \"create\", method: \"direct_profile\" });"),
    source.includes("onLogin(account, { flow: \"create\", method: \"direct_profile\" });"),
    source.includes("Continue to Soul Guru"),
    !source.includes("function buildLoginMeta(pendingOtp, flow) {"),
    !source.includes("requestOtpFromServer"),
    !source.includes("verifyOtpWithServer"),
    !source.includes("trackEvent(\"login_completed\", { mode: \"otp_demo\" });")
  ].every(Boolean));
}

function checkProductionSoulGuruRequiresStoredBackendReading() {
  pushCheck("Production Soul Guru does not show or cache unstored local fallback readings", [
    source.includes("const [reading, setReading] = useState(LOCAL_READING_FALLBACK_ENABLED ? fallbackReading : null);"),
    source.includes("if (data.stored === false && !LOCAL_READING_FALLBACK_ENABLED) {"),
    source.includes("if (data.stored !== false || LOCAL_READING_FALLBACK_ENABLED) {"),
    source.includes("cached.stored === false || cached.source === \"local-fallback\""),
    source.includes("disabled={isSavingAdvice || !reading}")
  ].every(Boolean));
}

function checkProductionSoulGuruRetriesPendingBackendReading() {
  const retryLimit = numericConstant("SOUL_WISDOM_PENDING_RETRY_LIMIT");
  const retryIntervalMs = numericConstant("SOUL_WISDOM_PENDING_RETRY_MS");

  pushCheck("Production Soul Guru retries in-progress backend readings without local fallback", [
    retryLimit >= 60,
    retryIntervalMs >= 5000,
    retryLimit * retryIntervalMs >= 300000,
    source.includes("return { ok: response.ok, status: response.status, data };"),
    source.includes("status === 409 && /already being prepared/.test(data?.error || \"\")"),
    source.includes("setReadingStatus(\"Soul Guru is finishing today's guidance. This can take a few minutes the first time, then it will be saved for today.\");"),
    source.includes("trackEvent(\"soul_wisdom_pending\", { attempt });"),
    source.includes("retryTimer = window.setTimeout(() => requestDailyReading(attempt + 1), SOUL_WISDOM_PENDING_RETRY_MS);"),
    source.includes("if (retryTimer) window.clearTimeout(retryTimer);"),
    source.includes("setReadingStatus(\"Soul Guru is still preparing today's guidance. Keep this tab open or check again shortly.\");"),
    source.includes("trackEvent(\"soul_wisdom_failed\", { reason: \"pending_timeout\" });")
  ].every(Boolean));
}

function checkProductionSoulGuruPrefetchesAndDedupesDailyReading() {
  pushCheck("Production Soul Guru prefetches and dedupes today's backend reading", [
    source.includes("const SOUL_READING_REQUESTS = new Map();"),
    source.includes("if (readDailyReadingCache(user, todayKey)?.reading) return;"),
    source.includes("const payload = buildDailyReadingPayload(user, todayKey, fallbackReading);"),
    source.includes("requestDailyReadingFromServer(user, todayKey, payload)"),
    source.includes("function buildDailyReadingPayload(user, todayKey, fallbackReading) {"),
    source.includes("function requestDailyReadingFromServer(user, todayKey, payload) {"),
    source.includes("if (SOUL_READING_REQUESTS.has(requestKey)) {"),
    source.includes("SOUL_READING_REQUESTS.set(requestKey, request);"),
    source.includes("SOUL_READING_REQUESTS.delete(requestKey);")
  ].every(Boolean));
}

function checkSoulGuruCacheUsesCurrentPromptVersion() {
  pushCheck("Client Soul Guru cache namespace matches current prompt version", [
    source.includes("import { SOUL_WISDOM_PROMPT_VERSION } from \"./soulWisdomVersion.js\";"),
    source.includes("const SOUL_READING_CACHE_VERSION = SOUL_WISDOM_PROMPT_VERSION;"),
    source.includes("const SOUL_READING_CACHE_PREFIX = `soulguru.dailySoulReading.${SOUL_READING_CACHE_VERSION}`;"),
    source.includes("const SOUL_READING_HISTORY_PREFIX = `soulguru.dailySoulReadingHistory.${SOUL_READING_CACHE_VERSION}`;"),
    /^soul-wisdom-v\d+$/.test(SOUL_WISDOM_PROMPT_VERSION),
    source.includes("cached?.promptVersion !== SOUL_READING_CACHE_VERSION"),
    source.includes("promptVersion: SOUL_READING_CACHE_VERSION")
  ].every(Boolean));
}

function checkProductionAstroSolvesRequiresStoredBackendAnswer() {
  pushCheck("Production Astro Solves does not use local fallback for failed or unstored answers", [
    source.includes("if (!response.ok && !LOCAL_AUTH_FALLBACK_ENABLED) {"),
    source.includes("if (response.ok && data.stored === false && !LOCAL_AUTH_FALLBACK_ENABLED) {"),
    source.includes("if (!LOCAL_AUTH_FALLBACK_ENABLED) {\n        setSolveStatus(\"Astro Solves is unavailable. Please try again shortly.\");"),
    source.includes("trackEvent(\"astro_solve_failed\", { reason: \"not_stored\" });")
  ].every(Boolean));
}

function checkProductionAstroSolvesSyncsBackendAllowance() {
  pushCheck("Production Astro Solves syncs allowance from backend before trusting local counts", [
    source.includes("const [serverAllowance, setServerAllowance] = useState(null);"),
    source.includes("const allowance = serverAllowance?.limit ?? localAllowance;"),
    source.includes("const remaining = Number.isFinite(serverAllowance?.remaining)"),
    source.includes("if (LOCAL_AUTH_FALLBACK_ENABLED) {\n        setServerAllowance(null);"),
    source.includes("action: \"allowance\","),
    source.includes("user: buildAstroSolveUserPayload(user)"),
    source.includes("setServerAllowance(response.ok && data.allowance ? data.allowance : null);"),
    source.includes("if (data.allowance) {\n        setServerAllowance(data.allowance);")
  ].every(Boolean));
}

function checkProductionMoreGuidanceRequiresStoredBackendAnswer() {
  pushCheck("Production More Guidance does not show unstored paid guidance", [
    source.includes("if (ok && data?.guidance && (data.stored !== false || LOCAL_PAID_FALLBACK_ENABLED)) {"),
    source.includes("if (ok && data?.guidance && data.stored === false) {"),
    source.includes("setDeepGuidanceStatus(\"Deeper guidance could not be saved. Please try again shortly.\");")
  ].every(Boolean));
}

function checkProductionSaveAdviceRequiresStoredBackendAnswer() {
  pushCheck("Production Save Advice waits for backend persistence", [
    source.includes("const result = await saveGuidanceToServer(user, reading, savedItem.id);"),
    source.includes("if (!data.saved && !LOCAL_PAID_FALLBACK_ENABLED) {"),
    source.includes("setSaveStatus(\"Advice could not sync. Please try again shortly.\");"),
    source.includes("trackEvent(\"guidance_save_failed\");")
  ].every(Boolean));
}

function checkProductionShaniDoesNotTrustLocalMemberPlan() {
  pushCheck("Production Shani does not unlock Pandit from local memberPlan", [
    source.includes("const serverMembership = serverDashboard?.membership?.active ? serverDashboard.membership : null;"),
    source.includes("const localMemberPlanId = LOCAL_PAID_FALLBACK_ENABLED ? user.memberPlan : \"\";"),
    source.includes("const effectiveMemberPlanId = serverMembership?.planId || localMemberPlanId;"),
    source.includes("const canUsePandit = Boolean(panditMembership?.active);"),
    source.includes("action: \"pandit\","),
    source.includes("if (response.ok && data?.answer && data.stored !== false) {"),
    source.includes("if (LOCAL_PAID_FALLBACK_ENABLED) {"),
    source.includes("setPlanStatus(\"Secure Shani remedy checkout is required before member guidance can unlock.\");")
  ].every(Boolean));
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function numericConstant(name) {
  const match = source.match(new RegExp(`const ${name} = (\\d+);`));
  return match ? Number(match[1]) : 0;
}

function printReport() {
  console.log(`Client auth flow contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}
