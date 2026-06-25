import { loadEnv } from "vite";
import { buildDeploymentReadiness } from "../src/backend/readinessService.js";
import {
  buildProviderReadinessMatrix,
  summarizeProviderReadiness
} from "../src/backend/providerStack.js";

const args = new Set(process.argv.slice(2));
const mode = getArgValue("--mode") || process.env.NODE_ENV || "production";
const outputJson = args.has("--json");
const env = {
  ...loadEnv(mode, process.cwd(), ""),
  ...process.env
};

const readiness = buildDeploymentReadiness(env);
const matrix = buildProviderReadinessMatrix(readiness);
const summary = summarizeProviderReadiness(matrix);

if (outputJson) {
  console.log(JSON.stringify({ summary, providers: matrix }, null, 2));
} else {
  printMarkdown({ summary, providers: matrix });
}

function printMarkdown({ summary, providers }) {
  console.log("# SoulGuru Provider Readiness Matrix");
  console.log("");
  console.log(`Providers: ${summary.ready}/${summary.total} ready, ${summary.needsConfiguration} need configuration, ${summary.unmapped} unmapped.`);
  console.log("");
  console.log("| Provider | Purpose | Status | Missing / Evidence |");
  console.log("| --- | --- | --- | --- |");

  for (const provider of providers) {
    const status = provider.status === "ready" ? "ready" : provider.status;
    const missing = provider.missingEnv.length
      ? provider.missingEnv.map((name) => `\`${name}\``).join(", ")
      : provider.missingCheckIds.length
        ? `Unmapped readiness checks: ${provider.missingCheckIds.map((id) => `\`${id}\``).join(", ")}`
        : provider.artifacts.map((artifact) => `\`${artifact}\``).join(", ");
    console.log(`| ${provider.name} | ${provider.purpose} | ${status} | ${missing} |`);
  }

  console.log("");
  console.log("No secret values are printed here. Use this output with `npm run production:check` before launch.");
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}
