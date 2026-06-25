import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
const outputPath = getArgValue("--out");

const migrations = readMigrations();
const bundle = buildBundle(migrations);

if (outputPath) {
  const absoluteOutputPath = path.resolve(process.cwd(), outputPath);
  fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });
  fs.writeFileSync(absoluteOutputPath, bundle);
  console.log(`Supabase schema bundle written: ${absoluteOutputPath}`);
} else {
  process.stdout.write(bundle);
}

function readMigrations() {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Missing migrations directory: ${migrationsDir}`);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  if (!files.length) {
    throw new Error("No Supabase migrations found.");
  }

  return files.map((file) => ({
    file,
    sql: fs.readFileSync(path.join(migrationsDir, file), "utf8").trim()
  }));
}

function buildBundle(items) {
  const generatedAt = process.env.SOURCE_DATE_EPOCH
    ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
    : new Date().toISOString();
  const lines = [
    "-- SoulGuru Supabase production schema bundle",
    `-- Generated: ${generatedAt}`,
    "-- Source: supabase/migrations/*.sql in lexical order.",
    "-- Apply this to the Supabase SQL editor or migration pipeline for a new production project.",
    "-- This bundle is secret-free. Do not paste API keys, service-role keys, OTP secrets, or provider secrets into SQL.",
    ""
  ];

  for (const [index, migration] of items.entries()) {
    lines.push(
      `-- === ${index + 1}/${items.length}: ${migration.file} ===`,
      migration.sql,
      ""
    );
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}
