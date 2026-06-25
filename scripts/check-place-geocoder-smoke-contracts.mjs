import path from "node:path";
import { spawn } from "node:child_process";

const checks = [];

await checkAllowsMissingEnvOnlyWhenExplicit();
await checkStrictMissingEnvFails();
await checkFixtureResolutionPasses();
await checkBadCoordinatesFail();
await checkExpectedTimezoneMismatchFails();
await checkJsonOutputDoesNotLeakProviderConfig();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

async function checkAllowsMissingEnvOnlyWhenExplicit() {
  const result = await runSmoke(["--allow-missing-env"], emptyGeocoderEnv());
  pushCheck("Place geocoder smoke skips missing env only when allowed", [
    result.status === 0,
    result.stdout.includes("skipped"),
    result.stdout.includes("PLACE_GEOCODER_URL"),
    result.stdout.includes("PLACE_GEOCODER_USER_AGENT")
  ].every(Boolean));
}

async function checkStrictMissingEnvFails() {
  const result = await runSmoke([], emptyGeocoderEnv());
  pushCheck("Place geocoder smoke fails missing env in strict mode", [
    result.status !== 0,
    result.stderr.includes("Missing birth place geocoder configuration"),
    result.stderr.includes("PLACE_GEOCODER_URL"),
    result.stderr.includes("PLACE_GEOCODER_USER_AGENT")
  ].every(Boolean));
}

async function checkFixtureResolutionPasses() {
  const result = await runSmoke(["--fixture=paris"], validGeocoderEnv());
  pushCheck("Place geocoder smoke accepts a valid geocoder response", [
    result.status === 0,
    result.stdout.includes("SoulGuru place geocoder smoke: pass"),
    result.stdout.includes("PASS Birth place geocoder resolves requested place"),
    result.stdout.includes("PASS Resolved timezone matches expected smoke target"),
    result.stdout.includes("timezone=Europe/Paris"),
    result.stdout.includes("source=geocoder")
  ].every(Boolean));
}

async function checkBadCoordinatesFail() {
  const result = await runSmoke(["--fixture=invalid-coordinates"], validGeocoderEnv());
  pushCheck("Place geocoder smoke rejects unusable geocoder coordinates", [
    result.status !== 0,
    result.stdout.includes("SoulGuru place geocoder smoke: fail"),
    result.stdout.includes("FAIL Birth place geocoder resolves requested place"),
    result.stdout.includes("FAIL Resolved coordinates are usable")
  ].every(Boolean));
}

async function checkExpectedTimezoneMismatchFails() {
  const result = await runSmoke([
    "--fixture=paris",
    "--expect-timezone=Asia/Kolkata"
  ], validGeocoderEnv());
  pushCheck("Place geocoder smoke catches expected timezone mismatches", [
    result.status !== 0,
    result.stdout.includes("FAIL Resolved timezone matches expected smoke target"),
    result.stdout.includes("Expected Asia/Kolkata, received Europe/Paris")
  ].every(Boolean));
}

async function checkJsonOutputDoesNotLeakProviderConfig() {
  const result = await runSmoke([
    "--fixture=paris",
    "--json"
  ], validGeocoderEnv());

  let parsed = null;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    parsed = null;
  }

  pushCheck("Place geocoder smoke JSON output avoids provider config values", [
    result.status === 0,
    parsed?.ok === true,
    parsed?.result?.timezone === "Europe/Paris",
    !result.stdout.includes("geocoder.example"),
    !result.stdout.includes("SoulGuru Contract Geocoder"),
    !JSON.stringify(parsed || {}).includes("PLACE_GEOCODER_URL")
  ].every(Boolean));
}

function validGeocoderEnv() {
  return {
    PLACE_GEOCODER_URL: "https://geocoder.example/search",
    PLACE_GEOCODER_USER_AGENT: "SoulGuru Contract Geocoder"
  };
}

function emptyGeocoderEnv() {
  return {
    PLACE_GEOCODER_URL: "",
    PLACE_GEOCODER_USER_AGENT: ""
  };
}

function runSmoke(args = [], env = {}) {
  const smokePath = path.join(process.cwd(), "scripts", "smoke-place-geocoder.mjs");
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [smokePath, ...args], {
      cwd: process.cwd(),
      env: {
        PATH: process.env.PATH,
        NODE_ENV: "production",
        ...env
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function printReport() {
  console.log(`Place geocoder smoke contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}
