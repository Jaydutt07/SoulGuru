import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src", "main.jsx"), "utf8");
const checks = [];

checkSoulGuruEntryPoint();
checkDashboardSync();
checkDeepGuidanceSync();
checkDeepGuidancePendingRetry();
checkSubscriptionUi();
checkTrackingUi();
checkGuidanceHistoryAndSavedAdvice();
checkProductionFallbackBoundaries();
checkSaveAdviceBackendFlow();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkSoulGuruEntryPoint() {
  pushCheck("Soul Guru More Guidance button opens subscription page", [
    source.includes("onMoreGuidance={() => onTabChange(\"subscription\")}"),
    source.includes("function SoulGuruTab({ user, updateUser, onMoreGuidance })"),
    source.includes("<Crown size={18} aria-hidden=\"true\" />"),
    source.includes("More Guidance"),
    source.includes("{activeTab === \"subscription\" && ("),
    source.includes("<SubscriptionPage"),
    source.includes("onBack={() => onTabChange(\"soul\")}")
  ].every(Boolean));
}

function checkDashboardSync() {
  pushCheck("More Guidance page loads dashboard history and subscription from backend", [
    source.includes("function SubscriptionPage({ user, updateUser, onBack })"),
    source.includes("const [serverDashboard, setServerDashboard] = useState(null);"),
    source.includes("authFetch(getApiUrl(\"/api/more-guidance\"),"),
    source.includes("action: \"dashboard\","),
    source.includes("limit: 10,"),
    source.includes("setServerDashboard(data);"),
    source.includes("setDashboardStatus(\"Guidance synced.\");"),
    source.includes("soulGuruSubscription: data.subscription")
  ].every(Boolean));

  pushCheck("More Guidance page derives active membership from server before local preview", [
    source.includes("const serverSubscription = serverDashboard?.subscription?.active ? serverDashboard.subscription : null;"),
    source.includes("const localSubscription = LOCAL_PAID_FALLBACK_ENABLED ? user.soulGuruSubscription : null;"),
    source.includes("const subscription = serverSubscription || localSubscription;"),
    source.includes("const isActive = Boolean(subscription?.active);")
  ].every(Boolean));
}

function checkDeepGuidanceSync() {
  pushCheck("More Guidance page requests paid deep guidance from backend", [
    source.includes("action: \"deep-guidance\","),
    source.includes("date: dateKey,"),
    source.includes("timezone: user.birthTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || \"Asia/Kolkata\","),
    source.includes("subscription,"),
    source.includes("context,"),
    source.includes("fallback: LOCAL_PAID_FALLBACK_ENABLED ? fallbackDeepGuidance : undefined"),
    source.includes("setDeepGuidanceStatus(\"Preparing deeper guidance...\");")
  ].every(Boolean));

  pushCheck("Production More Guidance rejects unstored deep guidance", [
    source.includes("if (ok && data?.guidance && (data.stored !== false || LOCAL_PAID_FALLBACK_ENABLED)) {"),
    source.includes("if (ok && data?.guidance && data.stored === false) {"),
    source.includes("setDeepGuidance(null);"),
    source.includes("setDeepGuidanceStatus(\"Deeper guidance could not be saved. Please try again shortly.\");")
  ].every(Boolean));
}

function checkDeepGuidancePendingRetry() {
  const retryLimit = numericConstant("MORE_GUIDANCE_PENDING_RETRY_LIMIT");
  const retryIntervalMs = numericConstant("MORE_GUIDANCE_PENDING_RETRY_MS");

  pushCheck("Production More Guidance retries in-progress paid backend readings", [
    retryLimit >= 60,
    retryIntervalMs >= 5000,
    retryLimit * retryIntervalMs >= 300000,
    source.includes("let retryTimer = null;"),
    source.includes("const requestDeepGuidance = (attempt = 0) => {"),
    source.includes("status === 409 && /already being prepared/.test(data?.error || \"\")"),
    source.includes("setDeepGuidanceStatus(\"Soul Guru is finishing your deeper guidance. This can take a few minutes the first time, then it will be saved.\");"),
    source.includes("trackEvent(\"more_guidance_pending\", { attempt });"),
    source.includes("retryTimer = window.setTimeout(() => requestDeepGuidance(attempt + 1), MORE_GUIDANCE_PENDING_RETRY_MS);"),
    source.includes("if (retryTimer) window.clearTimeout(retryTimer);"),
    source.includes("setDeepGuidanceStatus(\"Soul Guru is still preparing your deeper guidance. Keep this page open or check again shortly.\");"),
    source.includes("trackEvent(\"more_guidance_failed\", { reason: \"pending_timeout\" });")
  ].every(Boolean));
}

function checkSubscriptionUi() {
  pushCheck("Subscription page presents Soul Guru plus Astro Solve paid offer", [
    source.includes("<h2>Soul Guru + Astro Solve</h2>"),
    source.includes("<h3>3 months of deeper guidance</h3>"),
    source.includes("Detailed daily mentorship from Soul Guru plus 15 additional Astro Solves questions"),
    source.includes("More detailed Soul Guru readings"),
    source.includes("15 more Astro Solves questions"),
    source.includes("Guidance written in a calm mentor tone"),
    source.includes("Activate 3 months")
  ].every(Boolean));

  pushCheck("Checkout activation records 3-month plan and 15 Astro Solves bonus", [
    source.includes("name: \"Soul Guru + Astro Solve\","),
    source.includes("duration: \"3 months\","),
    source.includes("astroBonusQuestions: 15,"),
    source.includes("endsAt: end.toISOString()"),
    source.includes("trackEvent(\"more_guidance_activated\"")
  ].every(Boolean));
}

function checkTrackingUi() {
  pushCheck("Active More Guidance page renders 3-month tracking details", [
    source.includes("<article className=\"tracking-panel\">"),
    source.includes("<h3>3-month tracking</h3>"),
    source.includes("{tracking?.daysLeft ?? 0} days left"),
    source.includes("className=\"progress-track\""),
    source.includes("Month {tracking?.monthIndex || 1} of 3"),
    source.includes("{tracking?.weeksLeft ?? 0} weeks left"),
    source.includes("{tracking?.progress ?? 0}% complete"),
    source.includes("(tracking?.checkpoints || []).map((checkpoint) => ("),
    source.includes("Started {formatDate(tracking?.startedAt)}. Ends {formatDate(tracking?.endsAt)}.")
  ].every(Boolean));

  pushCheck("Local preview tracking mirrors three-month lifecycle", [
    source.includes("function buildLocalSubscriptionTracking(subscription)"),
    source.includes("const end = subscription.endsAt ? new Date(subscription.endsAt) : addMonths(start, 3);"),
    source.includes("daysLeft,"),
    source.includes("weeksLeft: Math.max(0, Math.ceil(daysLeft / 7)),"),
    source.includes("monthIndex,"),
    source.includes("checkpoints: buildTrackingCheckpoints(progress)"),
    source.includes("label: \"Month 1\""),
    source.includes("label: \"Month 2\""),
    source.includes("label: \"Month 3\"")
  ].every(Boolean));
}

function checkGuidanceHistoryAndSavedAdvice() {
  pushCheck("More Guidance page renders reading history and saved advice panels", [
    source.includes("const guidanceHistory = mergeGuidanceItems(serverDashboard?.guidanceHistory || [], localGuidanceHistory);"),
    source.includes("const savedGuidance = mergeGuidanceItems(serverDashboard?.savedGuidance || [], localSavedGuidance);"),
    source.includes("<GuidanceList title=\"Reading history\" items={guidanceHistory} empty=\"Your deeper readings will collect here.\" />"),
    source.includes("<GuidanceList title=\"Saved advice\" items={savedGuidance} empty=\"Save guidance from Soul Guru to keep it here.\" />"),
    source.includes("function GuidanceList({ title, items, empty })"),
    source.includes("items.slice(0, 5).map((item) => ("),
    source.includes("getGuidanceListCopy(item)"),
    source.includes("item.guidance?.overview"),
    source.includes("item.reading?.guidance?.overview")
  ].every(Boolean));

  pushCheck("More Guidance page adds synced paid readings into history", [
    source.includes("guidanceHistory: mergeGuidanceItems(["),
    source.includes("id: data.id || `more-guidance-${data.readingDate || dateKey}`"),
    source.includes("guidance: data.guidance,"),
    source.includes("wisdom: data.guidance.overview")
  ].every(Boolean));
}

function checkProductionFallbackBoundaries() {
  pushCheck("Production More Guidance page does not show local-only paid content", [
    source.includes("const localGuidanceHistory = LOCAL_PAID_FALLBACK_ENABLED ? getCachedGuidanceHistory(user) : [];"),
    source.includes("const localSavedGuidance = LOCAL_PAID_FALLBACK_ENABLED ? user.savedGuidance || [] : [];"),
    source.includes("const activeDeepGuidance = deepGuidance || (LOCAL_PAID_FALLBACK_ENABLED ? fallbackDeepGuidance : null);"),
    source.includes("if (LOCAL_PAID_FALLBACK_ENABLED) {"),
    source.includes("setDeepGuidance(fallbackDeepGuidance);"),
    source.includes("setDeepGuidanceStatus(\"Using local deeper guidance until the backend is connected.\");")
  ].every(Boolean));
}

function checkSaveAdviceBackendFlow() {
  pushCheck("Save Advice sends Soul Guru reading to backend saved guidance route", [
    source.includes("async function saveGuidanceToServer(user, reading, sourceId)"),
    source.includes("authFetch(getApiUrl(\"/api/more-guidance\"),"),
    source.includes("action: \"save-guidance\","),
    source.includes("sourceId,"),
    source.includes("reading"),
    source.includes("if (!data.saved && !LOCAL_PAID_FALLBACK_ENABLED) {"),
    source.includes("throw new Error(\"Guidance was not stored. Please try again.\");")
  ].every(Boolean));

  pushCheck("Paid More Guidance can save the deeper guidance map", [
    source.includes("async function saveDeepGuidanceAdvice()"),
    source.includes("setDeepSaveStatus(\"Saving deeper advice...\");"),
    source.includes("type: \"more-guidance\","),
    source.includes("guidance: activeDeepGuidance"),
    source.includes("setDeepSaveStatus(result.saved ? \"Deeper advice saved.\" : \"Saved locally until the backend is connected.\");"),
    source.includes("trackEvent(\"more_guidance_saved\"")
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
  console.log(`Client More Guidance contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}
