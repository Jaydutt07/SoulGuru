import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const outDir = path.resolve(process.cwd(), getArgValue("--out") || path.join("tmp", "soulguru-production-launch-pack"));
const generatedAt = buildGeneratedAt();
const files = [
  {
    path: "README.md",
    contents: buildReadme()
  },
  {
    path: "env.production.template",
    contents: runGenerator("scripts/generate-production-env-template.mjs")
  },
  {
    path: "production-env-checklist.md",
    contents: runGenerator("scripts/generate-production-env-checklist.mjs")
  },
  {
    path: "provider-launch-plan.md",
    contents: runGenerator("scripts/generate-provider-launch-plan.mjs")
  },
  {
    path: "soulguru-supabase-schema.sql",
    contents: runGenerator("scripts/generate-supabase-schema-bundle.mjs")
  },
  {
    path: "manifest.json",
    contents: `${JSON.stringify({
      name: "SoulGuru Production Launch Pack",
      generatedAt,
      source: [
        "src/backend/envManifest.js",
        "src/backend/providerStack.js",
        "src/backend/readinessService.js",
        "supabase/migrations/*.sql"
      ],
      files: [
        "README.md",
        "env.production.template",
        "production-env-checklist.md",
        "provider-launch-plan.md",
        "soulguru-supabase-schema.sql",
        "manifest.json"
      ],
      verification: [
        "npm run providers:check",
        "npm run env:check",
        "npm run supabase:migrations:check",
        "npm run android:security:check",
        "npm run production:check -- --strict",
        "npm run release:check -- --url=https://your-production-domain.app --include-ai --include-android-signing"
      ]
    }, null, 2)}\n`
  }
];

fs.mkdirSync(outDir, { recursive: true });
for (const file of files) {
  const absolutePath = path.join(outDir, file.path);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, file.contents);
}

console.log(`Production launch pack written: ${outDir}`);
for (const file of files) {
  console.log(`- ${file.path}`);
}

function runGenerator(script) {
  const result = spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env
  });

  if (result.status !== 0) {
    throw new Error(`${script} failed: ${result.stderr || result.stdout}`);
  }

  return result.stdout;
}

function buildReadme() {
  return [
    "# SoulGuru Production Launch Pack",
    "",
    `Generated: ${generatedAt}`,
    "",
    "This folder is an operator handoff for production setup. It is placeholder-only and secret-safe. Do not paste filled secrets back into git, docs, tickets, or chat.",
    "",
    "## Files",
    "",
    "- `env.production.template`: private Vercel/backend env template with server-only secrets left blank and public `VITE_` values labeled.",
    "- `production-env-checklist.md`: readiness-derived checklist for every critical and warning env item.",
    "- `provider-launch-plan.md`: provider-by-provider setup order for the planning-image stack.",
    "- `soulguru-supabase-schema.sql`: ordered Supabase migration bundle for a new production project.",
    "- `manifest.json`: generated file list and final verification commands.",
    "",
    "## Operator Order",
    "",
    "1. Create the Supabase project and apply `soulguru-supabase-schema.sql` in order.",
    "2. Fill private production values from `env.production.template` in Vercel/provider dashboards, never in committed files.",
    "3. Use `production-env-checklist.md` and `provider-launch-plan.md` to configure Supabase, OTP/SMS, Razorpay, Clerk, Cloudflare/domain, Resend, Upstash, Pinecone, Sentry, and PostHog.",
    "4. Run `npm run production:check` with production env loaded.",
    "5. Run `npm run android:security:check` before mobile release output.",
    "6. Run `npm run production:domain:smoke -- --expect-ready` after DNS and Vercel custom-domain setup are live.",
    "7. Run `npm run release:check -- --url=https://your-production-domain.app --include-ai --include-android-signing` before release.",
    "",
    "## Safety",
    "",
    "- The generated files contain placeholders and env names only.",
    "- Server-only secrets must stay in Vercel/backend env, not browser/APK env.",
    "- Keep local fallback flags set to production-safe defaults unless running isolated local tests.",
    ""
  ].join("\n");
}

function buildGeneratedAt() {
  if (process.env.SOURCE_DATE_EPOCH) {
    return new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString();
  }
  return new Date().toISOString();
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}
