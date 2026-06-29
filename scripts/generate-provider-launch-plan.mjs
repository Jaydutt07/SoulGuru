import { loadEnv } from "vite";
import { buildDeploymentReadiness } from "../src/backend/readinessService.js";
import {
  PROVIDER_STACK,
  buildProviderReadinessMatrix,
  summarizeProviderReadiness
} from "../src/backend/providerStack.js";
import {
  PUBLIC_ENV_ALLOWLIST,
  SERVER_ONLY_ENV_KEYS
} from "../src/backend/envManifest.js";

const args = new Set(process.argv.slice(2));
const mode = getArgValue("--mode") || process.env.NODE_ENV || "production";
const outputJson = args.has("--json");
const env = {
  ...loadEnv(mode, process.cwd(), ""),
  ...process.env
};

const readiness = buildDeploymentReadiness(env);
const providers = readiness.providers || buildProviderReadinessMatrix(readiness);
const summary = readiness.providerSummary || summarizeProviderReadiness(providers);
const plan = buildLaunchPlan({ summary, providers });

if (outputJson) {
  console.log(JSON.stringify(plan, null, 2));
} else {
  printMarkdown(plan);
}

function buildLaunchPlan({ summary, providers }) {
  const byId = new Map(providers.map((provider) => [provider.id, provider]));
  const phases = [
    {
      title: "Source, AI, And CI Baseline",
      objective: "Verify the app code, remote history, and server-side AI path before connecting production user data.",
      providerIds: ["codingWorkspace", "github", "openai"]
    },
    {
      title: "Data, Auth, OTP, And Email",
      objective: "Connect persistent identity, profile storage, OTP login, and transactional membership email.",
      providerIds: ["supabase", "msg91", "clerk", "resend"]
    },
    {
      title: "Deployment, Domain, And DNS",
      objective: "Put the web/API app on a production HTTPS domain that mobile builds can safely call.",
      providerIds: ["vercel", "namecheap", "cloudflare"]
    },
    {
      title: "Payments And Paid Access",
      objective: "Make More Guidance and Shani memberships server-priced, webhook-backed, and persisted before unlock.",
      providerIds: ["razorpay"]
    },
    {
      title: "Reliability, Analytics, And Memory",
      objective: "Add abuse protection, production monitoring, privacy-safe analytics, and long-term guidance memory.",
      providerIds: ["upstash", "sentry", "posthog", "pinecone"]
    }
  ];

  return {
    title: "SoulGuru Production Provider Launch Plan",
    generatedFrom: [
      "src/backend/providerStack.js",
      "src/backend/readinessService.js",
      "src/backend/envManifest.js"
    ],
    summary,
    phases: phases.map((phase) => ({
      ...phase,
      providers: phase.providerIds.map((id) => formatProvider(byId.get(id))).filter(Boolean)
    })),
    finalVerification: [
      "npm run providers:check",
      "npm run production:providers",
      "npm run production:check -- --strict",
      "npm run production:domain:smoke -- --expect-ready",
      "npm run release:check -- --url=https://your-production-domain.app --include-ai --include-android-signing",
      "npm run android:apk:backend",
      "npm run android:artifact:check -- --expect-url=https://your-production-domain.app"
    ]
  };
}

function formatProvider(provider) {
  if (!provider) return null;
  const stackProvider = PROVIDER_STACK.find((item) => item.id === provider.id) || {};
  return {
    id: provider.id,
    name: provider.name,
    planningImageLabel: provider.planningImageLabel,
    planningImageCost: provider.planningImageCost,
    purpose: provider.purpose,
    status: provider.status,
    dashboardSetup: stackProvider.notes || provider.notes || "",
    missingEnv: [...provider.missingEnv],
    envScope: [...(stackProvider.envScope || [])].map((name) => ({
      name,
      visibility: classifyEnv(name),
      currentlyMissing: provider.missingEnv.some((entry) => extractEnvNames(entry).includes(name))
    })),
    artifacts: [...provider.artifacts],
    commands: [...provider.commands]
  };
}

function printMarkdown(plan) {
  console.log(`# ${plan.title}`);
  console.log("");
  console.log("Generated from `src/backend/providerStack.js`, `src/backend/readinessService.js`, and `src/backend/envManifest.js`.");
  console.log("This plan is placeholder-only. It prints env names and verification commands, never secret values.");
  console.log("");
  console.log(`Providers: ${plan.summary.ready}/${plan.summary.total} ready, ${plan.summary.needsConfiguration} need configuration, ${plan.summary.unmapped} unmapped.`);
  console.log("");
  console.log("## Launch Order");
  console.log("");

  plan.phases.forEach((phase, index) => {
    console.log(`### ${index + 1}. ${phase.title}`);
    console.log("");
    console.log(phase.objective);
    console.log("");

    for (const provider of phase.providers) {
      console.log(`#### ${provider.name}`);
      console.log("");
      console.log(`- Planning image label: ${provider.planningImageLabel}`);
      console.log(`- Planning image cost: ${provider.planningImageCost || "not specified"}`);
      console.log(`- Purpose: ${provider.purpose}`);
      console.log(`- Current status: \`${provider.status}\``);
      if (provider.dashboardSetup) {
        console.log(`- Dashboard setup: ${provider.dashboardSetup}`);
      }
      console.log(`- Required env: ${formatEnvScope(provider.envScope)}`);
      console.log(`- Missing now: ${provider.missingEnv.length ? provider.missingEnv.map((name) => `\`${name}\``).join(", ") : "none"}`);
      console.log(`- Evidence artifacts: ${provider.artifacts.map((artifact) => `\`${artifact}\``).join(", ")}`);
      console.log(`- Verify with: ${provider.commands.map((command) => `\`${command}\``).join(", ")}`);
      console.log("");
    }
  });

  console.log("## Final Verification");
  console.log("");
  for (const command of plan.finalVerification) {
    console.log(`- [ ] \`${command}\``);
  }
  console.log("");
}

function formatEnvScope(envScope) {
  if (!envScope.length) return "none";
  return envScope
    .map((entry) => {
      const missing = entry.currentlyMissing ? ", missing now" : "";
      return `\`${entry.name}\` (${entry.visibility}${missing})`;
    })
    .join(", ");
}

function classifyEnv(name) {
  if (SERVER_ONLY_ENV_KEYS.includes(name)) return "server-only secret";
  if (PUBLIC_ENV_ALLOWLIST.includes(name)) return "public Vite env";
  return "server env";
}

function extractEnvNames(value) {
  return String(value || "").match(/[A-Z][A-Z0-9_]+/g) || [];
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}
