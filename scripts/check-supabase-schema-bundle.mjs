import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
const checks = [];
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const result = spawnSync(process.execPath, ["scripts/generate-supabase-schema-bundle.mjs"], {
  cwd: process.cwd(),
  encoding: "utf8",
  env: {
    ...process.env,
    SOURCE_DATE_EPOCH: "1780000000"
  }
});
const bundle = result.stdout;

checkGeneratorRuns();
checkBundleHeader();
checkMigrationCoverage();
checkBundleIsSecretSafe();
checkOutFileMode();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkGeneratorRuns() {
  pushCheck("Supabase schema bundle generator runs", [
    result.status === 0,
    result.stderr === "",
    bundle.includes("SoulGuru Supabase production schema bundle")
  ].every(Boolean), [result.stderr].filter(Boolean));
}

function checkBundleHeader() {
  pushCheck("Supabase schema bundle is operator-safe and timestamp-stable when requested", [
    bundle.includes("-- Generated: 2026-05-28T20:26:40.000Z"),
    bundle.includes("Source: supabase/migrations/*.sql in lexical order."),
    bundle.includes("Apply this to the Supabase SQL editor or migration pipeline"),
    bundle.includes("This bundle is secret-free."),
    !bundle.includes("SUPABASE_SERVICE_ROLE_KEY"),
    !bundle.includes("OPENAI_API_KEY")
  ].every(Boolean));
}

function checkMigrationCoverage() {
  const missingMarkers = [];
  const missingSql = [];
  let previousIndex = -1;

  for (const [index, file] of migrationFiles.entries()) {
    const marker = `-- === ${index + 1}/${migrationFiles.length}: ${file} ===`;
    const markerIndex = bundle.indexOf(marker);
    if (markerIndex === -1) {
      missingMarkers.push(marker);
    }
    if (markerIndex <= previousIndex) {
      missingMarkers.push(`${file} appears out of order`);
    }
    previousIndex = markerIndex;

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8").trim();
    if (!bundle.includes(sql)) {
      missingSql.push(file);
    }
  }

  const extraMigrationMarkers = [...bundle.matchAll(/-- === \d+\/\d+: ([^=]+?) ===/g)]
    .map((match) => match[1].trim())
    .filter((file) => !migrationFiles.includes(file));

  pushCheck("Supabase schema bundle includes every migration exactly once in order", [
    missingMarkers.length === 0,
    missingSql.length === 0,
    extraMigrationMarkers.length === 0,
    countMatches(bundle, /-- === \d+\/\d+: [^=]+? ===/g) === migrationFiles.length
  ].every(Boolean), [
    ...missingMarkers,
    ...missingSql.map((file) => `missing SQL from ${file}`),
    ...extraMigrationMarkers.map((file) => `unexpected migration marker ${file}`)
  ]);
}

function checkBundleIsSecretSafe() {
  const sentinelEnv = {
    ...process.env,
    SOURCE_DATE_EPOCH: "1780000000",
    OPENAI_API_KEY: "openai-schema-bundle-sentinel",
    SUPABASE_SERVICE_ROLE_KEY: "supabase-schema-bundle-sentinel",
    RAZORPAY_KEY_SECRET: "razorpay-schema-bundle-sentinel",
    OTP_HASH_SECRET: "otp-schema-bundle-sentinel"
  };
  const sentinelResult = spawnSync(process.execPath, ["scripts/generate-supabase-schema-bundle.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: sentinelEnv
  });
  const leaked = Object.values(sentinelEnv).filter((value) => /schema-bundle-sentinel/.test(value) && sentinelResult.stdout.includes(value));

  pushCheck("Supabase schema bundle never prints live secret values", [
    sentinelResult.status === 0,
    leaked.length === 0
  ].every(Boolean), leaked);
}

function checkOutFileMode() {
  const outputPath = path.join("tmp", "supabase-schema-bundle.contract.sql");
  const absoluteOutputPath = path.join(process.cwd(), outputPath);
  fs.rmSync(absoluteOutputPath, { force: true });
  const outResult = spawnSync(process.execPath, ["scripts/generate-supabase-schema-bundle.mjs", `--out=${outputPath}`], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      SOURCE_DATE_EPOCH: "1780000000"
    }
  });
  const exists = fs.existsSync(absoluteOutputPath);
  const written = exists ? fs.readFileSync(absoluteOutputPath, "utf8") : "";
  fs.rmSync(absoluteOutputPath, { force: true });

  pushCheck("Supabase schema bundle can be written to an operator-selected file", [
    outResult.status === 0,
    outResult.stdout.includes("Supabase schema bundle written:"),
    exists,
    written === bundle
  ].every(Boolean), [outResult.stderr].filter(Boolean));
}

function countMatches(text, pattern) {
  return [...String(text || "").matchAll(pattern)].length;
}

function pushCheck(label, passed, details = []) {
  checks.push({ label, passed, details });
}

function printReport() {
  console.log(`Supabase schema bundle contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
    for (const detail of check.details) {
      console.log(`  - ${detail}`);
    }
  }
}
