import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src", "main.jsx"), "utf8");
const checks = [];

checkProductionExistingLoginPrefersServerProfile();
checkProductionCreateIgnoresLocalDuplicateCache();
checkProductionCreateRequiresProfilePersistence();
checkProductionAstroSolvesRequiresStoredBackendAnswer();
checkProductionMoreGuidanceRequiresStoredBackendAnswer();

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
    source.includes("onLogin(mergeAccountProfile(account, profile));")
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

function checkProductionMoreGuidanceRequiresStoredBackendAnswer() {
  pushCheck("Production More Guidance does not show unstored paid guidance", [
    source.includes("if (ok && data?.guidance && (data.stored !== false || LOCAL_PAID_FALLBACK_ENABLED)) {"),
    source.includes("if (ok && data?.guidance && data.stored === false) {"),
    source.includes("setDeepGuidanceStatus(\"Deeper guidance could not be saved. Please try again shortly.\");")
  ].every(Boolean));
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function printReport() {
  console.log(`Client auth flow contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}
