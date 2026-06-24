import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function detectAndroidBuildEnv(baseEnv = process.env) {
  const env = {};
  const javaHome = baseEnv.JAVA_HOME || firstExistingPath([
    "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home",
    "/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home",
    "/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home",
    "/usr/local/opt/openjdk/libexec/openjdk.jdk/Contents/Home"
  ], "bin/java");
  const androidHome = baseEnv.ANDROID_HOME || baseEnv.ANDROID_SDK_ROOT || firstExistingPath([
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
    env.PATH = [...pathParts, baseEnv.PATH].filter(Boolean).join(path.delimiter);
  }

  return env;
}

function firstExistingPath(candidates, requiredChild) {
  return candidates.find((candidate) => fs.existsSync(path.join(candidate, requiredChild))) || "";
}
