import fs from "node:fs";
import {
  ENV_EXAMPLE_KEYS,
  FALLBACK_FLAG_DEFAULTS,
  PUBLIC_ENV_ALLOWLIST,
  SERVER_ONLY_ENV_KEYS
} from "../src/backend/envManifest.js";
import { PROVIDER_STACK } from "../src/backend/providerStack.js";

const outPath = getArgValue("--out");
const envExample = parseEnvExample(readFile(".env.example"));
const providerSections = buildProviderSections();
const supplementalSections = buildSupplementalSections(providerSections.usedKeys);
const output = `${buildTemplate([...providerSections.sections, ...supplementalSections]).join("\n")}\n`;

if (outPath) {
  fs.writeFileSync(outPath, output);
  console.log(`Production env template written to ${outPath}`);
} else {
  process.stdout.write(output);
}

function buildProviderSections() {
  const usedKeys = new Set();
  const sections = PROVIDER_STACK
    .filter((provider) => provider.envScope?.length)
    .map((provider) => {
      const keys = provider.envScope.filter((key) => ENV_EXAMPLE_KEYS.includes(key));
      keys.forEach((key) => usedKeys.add(key));
      return {
        title: provider.name,
        description: `${provider.purpose}. ${provider.notes || ""}`.trim(),
        keys
      };
    })
    .filter((section) => section.keys.length);

  return { sections, usedKeys };
}

function buildSupplementalSections(usedKeys) {
  const remainingKeys = ENV_EXAMPLE_KEYS.filter((key) => !usedKeys.has(key));
  const androidKeys = remainingKeys.filter((key) => key.startsWith("ANDROID_"));
  const operatorKeys = remainingKeys.filter((key) => [
    "API_BASE_URL",
    "DEPLOYMENT_SMOKE_AUTH_TOKEN",
    "SOULGURU_LAN_HOST",
    "SOULGURU_LAN_PORT"
  ].includes(key));
  const runtimeKeys = remainingKeys.filter((key) => !androidKeys.includes(key) && !operatorKeys.includes(key));

  return [
    {
      title: "Shared Runtime Defaults",
      description: "Production-safe model, timeout, rate-limit, local-fallback, OTP, and pricing defaults.",
      keys: runtimeKeys
    },
    {
      title: "Android Release Signing",
      description: "Local release signing values for operator machines only; never commit keystores or passwords.",
      keys: androidKeys
    },
    {
      title: "Operator Smoke Helpers",
      description: "Local-only helper variables for deployed smoke checks and LAN APK previews.",
      keys: operatorKeys
    }
  ].filter((section) => section.keys.length);
}

function buildTemplate(sections) {
  const lines = [
    "# SoulGuru Production Env Template",
    "# Generated from src/backend/envManifest.js and src/backend/providerStack.js.",
    "# Placeholder-only: it never reads live .env values or prints secrets.",
    "# Fill values in Vercel/project env or a private local file. Do not commit filled secrets.",
    "# Only VITE_* keys are public browser/APK values; server-only secrets must stay backend-only.",
    ""
  ];

  for (const section of sections) {
    lines.push(`# == ${section.title} ==`);
    if (section.description) {
      lines.push(`# ${section.description}`);
    }
    for (const key of section.keys) {
      lines.push(...formatEnvEntry(key));
    }
    lines.push("");
  }

  return lines;
}

function formatEnvEntry(key) {
  const classification = classifyEnv(key);
  const value = templateValue(key);
  const notes = entryNotes(key, classification);
  return [
    `# ${key} - ${classification}${notes ? ` - ${notes}` : ""}`,
    `${key}=${value}`
  ];
}

function templateValue(key) {
  if (SERVER_ONLY_ENV_KEYS.includes(key)) return "";
  if (FALLBACK_FLAG_DEFAULTS[key] !== undefined) return FALLBACK_FLAG_DEFAULTS[key];
  if (key === "CLERK_REQUIRE_AUTH") return "true";
  if (key === "PLACE_GEOCODER_REQUIRE_RESOLUTION") return "true";
  if (key === "RATE_LIMIT_REQUIRE_UPSTASH") return "true";
  if (key === "RAZORPAY_WEBHOOK_READY") return "false";
  if (key === "CLOUDFLARE_DNS_READY") return "false";

  const example = envExample.get(key) || "";
  if (isBlankOrPlaceholder(example)) return "";
  return example;
}

function entryNotes(key, classification) {
  if (classification === "server-only secret") return "leave blank in docs; set privately in Vercel or shell env";
  if (classification === "public Vite env") return "safe for browser/APK only if it is in the public allowlist";
  if (FALLBACK_FLAG_DEFAULTS[key] !== undefined) return "production-safe local fallback value";
  if (key === "CLERK_REQUIRE_AUTH") return "production target is fail-closed authenticated API access";
  if (key === "PLACE_GEOCODER_REQUIRE_RESOLUTION") return "production target is fail-closed accurate birth-place resolution";
  if (key === "RATE_LIMIT_REQUIRE_UPSTASH") return "production target is fail-closed rate limiting for protected routes";
  if (key === "RAZORPAY_WEBHOOK_READY") return "set true only after the production Razorpay dashboard webhook is live";
  if (key === "CLOUDFLARE_DNS_READY") return "set true only after the production domain resolves through Cloudflare";
  return "";
}

function classifyEnv(key) {
  if (SERVER_ONLY_ENV_KEYS.includes(key)) return "server-only secret";
  if (PUBLIC_ENV_ALLOWLIST.includes(key)) return "public Vite env";
  return "server env";
}

function parseEnvExample(text) {
  return new Map(String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const [key, ...valueParts] = line.split("=");
      return [key.trim(), valueParts.join("=").trim()];
    })
    .filter(([key]) => /^[A-Z0-9_]+$/.test(key)));
}

function isBlankOrPlaceholder(value) {
  const text = String(value || "").trim();
  return !text || /replace-with|your-|<|>|\$\{|placeholder/i.test(text);
}

function readFile(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}
