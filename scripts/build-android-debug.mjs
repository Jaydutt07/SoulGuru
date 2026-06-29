import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { detectAndroidBuildEnv } from "./android-build-env.mjs";

const root = process.cwd();
const backendMode = process.argv.includes("--backend");
const env = {
  ...process.env,
  ...detectAndroidBuildEnv(process.env)
};

if (backendMode) {
  env.VITE_LOCAL_AUTH_FALLBACK = "false";
  console.log("Building backend-connected debug APK with demo OTP fallback disabled.");
} else if (!env.VITE_LOCAL_AUTH_FALLBACK) {
  env.VITE_LOCAL_AUTH_FALLBACK = "true";
  console.log("Building debug APK with demo OTP fallback enabled.");
}

run("npm", ["run", "android:sync"], { cwd: root, env });

const androidDir = path.join(root, "android");
run("./gradlew", ["assembleDebug"], { cwd: androidDir, env });

const source = path.join(androidDir, "app/build/outputs/apk/debug/app-debug.apk");
const target = path.join(root, "SoulGuru-debug.apk");

if (!fs.existsSync(source)) {
  fail(`Expected debug APK was not created: ${source}`);
}

fs.copyFileSync(source, target);
console.log(`Android debug APK created: ${target}`);

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
  console.error(`Android debug build failed: ${message}`);
  process.exit(1);
}
