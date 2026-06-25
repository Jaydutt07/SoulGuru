import fs from "node:fs";
import { buildDeploymentReadiness } from "../src/backend/readinessService.js";
import {
  FALLBACK_FLAG_DEFAULTS,
  PUBLIC_ENV_ALLOWLIST,
  SERVER_ONLY_ENV_KEYS
} from "../src/backend/envManifest.js";

const outPath = getArgValue("--out");
const envExample = parseEnvExample(readFile(".env.example"));
const publicKeys = new Set(PUBLIC_ENV_ALLOWLIST);
const serverOnlyKeys = new Set(SERVER_ONLY_ENV_KEYS);
const readiness = buildDeploymentReadiness({});
const lines = buildChecklist(readiness);
const output = `${lines.join("\n")}\n`;

if (outPath) {
  fs.writeFileSync(outPath, output);
  console.log(`Production env checklist written to ${outPath}`);
} else {
  process.stdout.write(output);
}

function buildChecklist(report) {
  return [
    "# SoulGuru Production Env Checklist",
    "",
    "Generated from `src/backend/readinessService.js` and `.env.example`.",
    "This file is placeholder-only. Do not paste real secrets into git, docs, tickets, or chat.",
    "",
    "Use this checklist when configuring Vercel project environment variables and provider dashboards.",
    "Server-only values must stay in backend/Vercel env only. Only `VITE_` values are allowed in the browser or APK.",
    "",
    `Readiness source: ${report.summary.total} checks, ${report.summary.failing} critical/warning items missing in an empty environment.`,
    "",
    ...sectionForChecks("Critical Launch Blockers", report.checks.filter((check) => check.severity === "critical")),
    "",
    ...sectionForChecks("Production Quality Warnings", report.checks.filter((check) => check.severity === "warning")),
    "",
    "## Production-Safe Defaults",
    "",
    ...Object.entries(FALLBACK_FLAG_DEFAULTS)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, expected]) => `- [ ] \`${key}\` = \`${expected}\``),
    "",
    "## Final Verification",
    "",
    "- [ ] Apply Supabase migrations before enabling production traffic.",
    "- [ ] Point the Namecheap domain through Cloudflare DNS and set `CLOUDFLARE_DNS_READY=true` only after the HTTPS app URL resolves correctly.",
    "- [ ] Configure Razorpay webhook URL to `/api/razorpay-webhook` with the same webhook secret set in Vercel.",
    "- [ ] Run `npm run production:check` locally with production env loaded.",
    "- [ ] Run `npm run production:domain:smoke -- --expect-ready` after DNS and Vercel custom-domain setup are live.",
    "- [ ] Run `npm run release:check -- --url=https://your-production-domain.app --include-ai --include-android-signing` before release.",
    "- [ ] Build backend-connected mobile output only with `VITE_API_BASE_URL` pointing at the deployed HTTPS backend.",
    ""
  ];
}

function sectionForChecks(title, checks) {
  return [
    `## ${title}`,
    "",
    ...checks.flatMap((check) => [
      `### ${check.label}`,
      "",
      `Status when empty: \`${check.status}\``,
      check.advice ? `Advice: ${check.advice}` : "",
      "",
      ...check.requiredEnv.flatMap((entry) => envLinesForRequirement(entry)),
      ""
    ].filter((line) => line !== ""))
  ];
}

function envLinesForRequirement(entry) {
  const choices = splitRequirementChoices(entry);
  if (choices.length > 1) {
    return [
      `- [ ] One of: ${formatRequirementChoices(choices)}`,
      ...choices.map((choice, index) => {
        const formatted = choice.map((part) => formatRequirement(part)).join(" + ");
        return `  - Option ${index + 1}: ${formatted}`;
      })
    ];
  }

  return [`- [ ] ${formatRequirement(entry)}`];
}

function formatRequirement(entry) {
  const trimmed = String(entry || "").trim();
  const name = extractEnvName(trimmed);
  const example = envExample.get(name);
  const classification = classifyEnv(name);
  const hint = buildHint(trimmed, example);
  return `${formatEnvName(name)} ${classification}${hint}`;
}

function formatEnvName(name) {
  return `\`${name}\``;
}

function buildHint(requirement, example) {
  const hints = [];
  if (requirement.includes(">=")) {
    hints.push(requirement.replace(/^[A-Z0-9_]+/, "").trim());
  }
  if (requirement.includes("=true")) {
    hints.push("set to `true`");
  } else if (requirement.includes("=false")) {
    hints.push("set to `false`");
  } else if (requirement.includes("=positive integer")) {
    hints.push("positive integer");
  } else if (requirement.includes("=https URL")) {
    hints.push("HTTPS URL");
  } else if (requirement.includes("=valid email sender")) {
    hints.push("valid sender, e.g. `SoulGuru <hello@soulguru.app>`");
  } else if (requirement.includes("=valid Sentry DSN")) {
    hints.push("valid Sentry DSN");
  } else if (requirement.includes("=valid HTTPS URL or host")) {
    hints.push("Pinecone HTTPS URL or host");
  } else if (requirement.includes("=valid domain")) {
    hints.push("registered production domain, e.g. `soulguru.app`");
  } else if (requirement.includes("=Cloudflare zone id")) {
    hints.push("Cloudflare zone ID");
  } else if (requirement.includes("=production HTTPS URL")) {
    hints.push("HTTPS URL on the production domain");
  } else if (requirement.includes("=production domain or subdomain")) {
    hints.push("must use `PRODUCTION_DOMAIN` or one of its subdomains");
  }

  if (example && !isBlankOrPlaceholder(example)) {
    hints.push(`default/example \`${example}\``);
  }

  return hints.length ? ` (${hints.join("; ")})` : "";
}

function classifyEnv(name) {
  if (serverOnlyKeys.has(name)) return "- server-only secret";
  if (publicKeys.has(name)) return "- public Vite env";
  return "- server env";
}

function splitRequirementChoices(entry) {
  return String(entry || "")
    .split(/\s+or\s+/i)
    .map((choice) => choice
      .split(/\+/)
      .map((part) => extractEnvName(part))
      .filter(Boolean))
    .filter((choice) => choice.length);
}

function formatRequirementChoices(choices) {
  return choices
    .map((choice) => choice.map((part) => formatEnvName(part)).join(" + "))
    .join(" or ");
}

function extractEnvName(value) {
  return String(value || "").trim().match(/^([A-Z][A-Z0-9_]*)/)?.[1] || String(value || "").trim();
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
