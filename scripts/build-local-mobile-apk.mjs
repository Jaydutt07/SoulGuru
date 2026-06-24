import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const printUrlOnly = args.includes("--print-url");
const skipHealth = args.includes("--skip-health");
const host = getArgValue("--host") || process.env.SOULGURU_LAN_HOST || detectLanHost();
const port = getArgValue("--port") || process.env.SOULGURU_LAN_PORT || "5173";
const apiBaseUrl = (getArgValue("--url") || process.env.VITE_API_BASE_URL || `http://${host}:${port}`).replace(/\/$/, "");

if (!host && !getArgValue("--url") && !process.env.VITE_API_BASE_URL) {
  fail("No LAN IP was found. Pass --host=YOUR_MAC_LAN_IP or set SOULGURU_LAN_HOST.");
}

if (printUrlOnly) {
  console.log(apiBaseUrl);
  process.exit(0);
}

await ensureBackendHealth(apiBaseUrl, { skipHealth });

const env = {
  ...process.env,
  ...detectAndroidBuildEnv(),
  VITE_API_BASE_URL: apiBaseUrl
};

console.log(`Building local phone APK with VITE_API_BASE_URL=${apiBaseUrl}`);
console.log("Keep the dev server running with: npm run dev:lan");

const result = spawnSync("npm", ["run", "android:apk"], {
  cwd: process.cwd(),
  env,
  stdio: "inherit"
});

process.exit(result.status ?? 1);

async function ensureBackendHealth(url, { skipHealth: shouldSkip }) {
  if (shouldSkip) return;

  const healthUrl = `${url}/api/health`;
  const response = await fetch(healthUrl).catch((error) => {
    fail([
      `Unable to reach ${healthUrl}: ${error.message}`,
      "Start the LAN dev server first: npm run dev:lan",
      "Make sure your phone and Mac are on the same network."
    ].join("\n"));
  });

  if (!response?.ok) {
    fail(`Backend health check failed at ${healthUrl} with status ${response?.status || "unknown"}.`);
  }
}

function detectLanHost() {
  const interfaces = os.networkInterfaces();
  for (const items of Object.values(interfaces)) {
    for (const item of items || []) {
      if (item.family === "IPv4" && !item.internal && isPrivateIpv4(item.address)) {
        return item.address;
      }
    }
  }

  for (const items of Object.values(interfaces)) {
    for (const item of items || []) {
      if (item.family === "IPv4" && !item.internal) {
        return item.address;
      }
    }
  }

  return "";
}

function detectAndroidBuildEnv() {
  const env = {};
  const javaHome = process.env.JAVA_HOME || firstExistingPath([
    "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home",
    "/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home",
    "/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home",
    "/usr/local/opt/openjdk/libexec/openjdk.jdk/Contents/Home"
  ], "bin/java");
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || firstExistingPath([
    path.join(os.homedir(), "Library/Android/sdk"),
    "/opt/homebrew/share/android-commandlinetools",
    "/usr/local/share/android-commandlinetools"
  ], "platforms");

  const pathParts = [];
  if (javaHome) {
    env.JAVA_HOME = javaHome;
    pathParts.push(path.join(javaHome, "bin"));
  }
  if (androidHome) {
    env.ANDROID_HOME = androidHome;
    env.ANDROID_SDK_ROOT = androidHome;
    pathParts.push(
      path.join(androidHome, "platform-tools"),
      path.join(androidHome, "cmdline-tools/latest/bin")
    );
  }

  if (pathParts.length > 0) {
    env.PATH = [...pathParts, process.env.PATH].filter(Boolean).join(path.delimiter);
  }

  return env;
}

function firstExistingPath(candidates, requiredChild) {
  return candidates.find((candidate) => fs.existsSync(path.join(candidate, requiredChild))) || "";
}

function isPrivateIpv4(address) {
  const parts = String(address || "").split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  return (
    parts[0] === 10 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
}

function getArgValue(name) {
  const arg = args.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}

function fail(message) {
  console.error(`Local mobile APK build failed: ${message}`);
  process.exit(1);
}
