import fs from "node:fs";

const checks = [];
const manifest = readFile("android/app/src/main/AndroidManifest.xml");
const dataExtractionRules = readFile("android/app/src/main/res/xml/data_extraction_rules.xml");

checkManifestBackupDisabled();
checkDataExtractionDisabled();
checkManifestDoesNotForceDebuggable();
checkFileProviderIsNotExported();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkManifestBackupDisabled() {
  pushCheck("Android manifest disables cloud backup for production user data", [
    manifest.includes('android:allowBackup="false"'),
    manifest.includes('android:fullBackupContent="false"'),
    manifest.includes('android:dataExtractionRules="@xml/data_extraction_rules"')
  ].every(Boolean));
}

function checkDataExtractionDisabled() {
  pushCheck("Android data extraction rules exclude app data from backup and transfer", [
    dataExtractionRules.includes("<data-extraction-rules>"),
    dataExtractionRules.includes("<cloud-backup"),
    dataExtractionRules.includes("<device-transfer>"),
    hasRootExclude(dataExtractionRules, "cloud-backup"),
    hasRootExclude(dataExtractionRules, "device-transfer")
  ].every(Boolean));
}

function checkManifestDoesNotForceDebuggable() {
  pushCheck("Android manifest does not force debuggable builds", !/android:debuggable\s*=\s*"true"/.test(manifest));
}

function checkFileProviderIsNotExported() {
  pushCheck("Android FileProvider remains non-exported", [
    manifest.includes('android:name="androidx.core.content.FileProvider"'),
    manifest.includes('android:exported="false"'),
    manifest.includes('android:grantUriPermissions="true"')
  ].every(Boolean));
}

function hasRootExclude(text, tagName) {
  const block = String(text || "").match(new RegExp(`<${tagName}[^>]*>[\\s\\S]*?</${tagName}>`))?.[0] || "";
  return /<exclude\s+domain="root"\s+path="\."\s*\/>/.test(block);
}

function readFile(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function pushCheck(label, passed, details = []) {
  checks.push({ label, passed, details });
}

function printReport() {
  console.log(`Android security contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
    for (const detail of check.details || []) {
      console.log(`  - ${detail}`);
    }
  }
}
