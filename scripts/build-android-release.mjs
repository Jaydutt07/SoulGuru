import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadEnv } from "vite";
import { detectAndroidBuildEnv } from "./android-build-env.mjs";

const root = process.cwd();
const mode = process.env.NODE_ENV || "production";
const format = getArgValue("--format") || "aab";
const validFormats = new Set(["aab", "apk"]);

if (!validFormats.has(format)) {
  fail(`Unsupported Android release format "${format}". Use --format=aab or --format=apk.`);
}

const baseEnv = {
  ...loadEnv(mode, root, ""),
  ...process.env,
  ANDROID_REQUIRE_RELEASE_SIGNING: "true"
};
const env = {
  ...baseEnv,
  ...detectAndroidBuildEnv(baseEnv)
};

run("node", ["scripts/validate-mobile-backend.mjs"], { cwd: root, env });
run("node", ["scripts/validate-android-release-signing.mjs"], { cwd: root, env });
run("npm", ["run", "android:sync"], { cwd: root, env });

const androidDir = path.join(root, "android");
const task = format === "aab" ? "bundleRelease" : "assembleRelease";
run("./gradlew", [task], { cwd: androidDir, env });

const source = format === "aab"
  ? path.join(androidDir, "app/build/outputs/bundle/release/app-release.aab")
  : path.join(androidDir, "app/build/outputs/apk/release/app-release.apk");
const target = path.join(root, format === "aab" ? "SoulGuru-release.aab" : "SoulGuru-release.apk");

if (!fs.existsSync(source)) {
  fail(`Expected release artifact was not created: ${source}`);
}

fs.copyFileSync(source, target);
run("node", [
  "scripts/check-android-artifact.mjs",
  `--artifact=${target}`,
  `--expect-url=${env.VITE_API_BASE_URL || ""}`
], { cwd: root, env });
console.log(`Android release ${format.toUpperCase()} created: ${target}`);

function run(command, args, options) {
  const result = spawnSync(command, args, {
    ...options,
    stdio: "inherit"
  });

  if (result.error) {
    fail(`${command} ${args.join(" ")} failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function fail(message) {
  console.error(`Android release build failed: ${message}`);
  process.exit(1);
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}
