import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_OPENAI_MAX_RETRIES,
  DEFAULT_OPENAI_TIMEOUT_MS,
  buildOpenAIClientOptions,
  buildOpenAIRequestOptions,
  createOpenAIClient,
  requestOpenAIEmbedding,
  requestOpenAIResponse
} from "../src/backend/openaiClient.js";
import { ASTRO_SOLVE_PROMPT_VERSION } from "../src/backend/astroSolveService.js";
import { DEEP_GUIDANCE_PROMPT_VERSION } from "../src/backend/guidanceService.js";
import { SHANI_PANDIT_PROMPT_VERSION } from "../src/backend/shaniService.js";
import {
  SOUL_WISDOM_MAX_WORDS,
  SOUL_WISDOM_MIN_WORDS,
  SOUL_WISDOM_PROMPT_VERSION
} from "../src/soulWisdomVersion.js";

const checks = [];

checkDefaultOptions();
checkEnvOverridesAndBounds();
await checkResponsesUseBoundedRequestOptions();
await checkEmbeddingsUseBoundedRequestOptions();
checkClientReceivesBoundedDefaults();
checkBackendServicesUseSharedHelper();
checkPromptVersionsAreDocumented();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkDefaultOptions() {
  const options = buildOpenAIRequestOptions({});
  pushCheck("OpenAI request options use production-safe defaults", [
    options.timeout === DEFAULT_OPENAI_TIMEOUT_MS,
    options.maxRetries === DEFAULT_OPENAI_MAX_RETRIES,
    options.timeout === 45000,
    options.maxRetries === 1
  ].every(Boolean));
}

function checkEnvOverridesAndBounds() {
  const overridden = buildOpenAIRequestOptions({
    OPENAI_TIMEOUT_MS: "12000",
    OPENAI_MAX_RETRIES: "0"
  });
  const clamped = buildOpenAIRequestOptions({
    OPENAI_TIMEOUT_MS: "999999",
    OPENAI_MAX_RETRIES: "99"
  });
  const fallback = buildOpenAIRequestOptions({
    OPENAI_TIMEOUT_MS: "not-a-number",
    OPENAI_MAX_RETRIES: "-2"
  });

  pushCheck("OpenAI timeout and retry env values are parsed and bounded", [
    overridden.timeout === 12000,
    overridden.maxRetries === 0,
    clamped.timeout === 120000,
    clamped.maxRetries === 3,
    fallback.timeout === DEFAULT_OPENAI_TIMEOUT_MS,
    fallback.maxRetries === 0
  ].every(Boolean));
}

async function checkResponsesUseBoundedRequestOptions() {
  const seen = [];
  const client = {
    responses: {
      create: async (body, options) => {
        seen.push({ body, options });
        return { output_text: "{}" };
      }
    }
  };

  await requestOpenAIResponse(
    client,
    { model: "gpt-contract", input: "hello" },
    { OPENAI_TIMEOUT_MS: "15000", OPENAI_MAX_RETRIES: "2" }
  );

  pushCheck("OpenAI Responses calls pass bounded timeout and retry options", [
    seen.length === 1,
    seen[0].body.model === "gpt-contract",
    seen[0].options.timeout === 15000,
    seen[0].options.maxRetries === 2
  ].every(Boolean));
}

async function checkEmbeddingsUseBoundedRequestOptions() {
  const seen = [];
  const client = {
    embeddings: {
      create: async (body, options) => {
        seen.push({ body, options });
        return { data: [{ embedding: [0.1, 0.2] }] };
      }
    }
  };

  await requestOpenAIEmbedding(
    client,
    { model: "text-embedding-contract", input: "remember this" },
    { OPENAI_TIMEOUT_MS: "8000", OPENAI_MAX_RETRIES: "0" }
  );

  pushCheck("OpenAI Embeddings calls pass bounded timeout and retry options", [
    seen.length === 1,
    seen[0].body.model === "text-embedding-contract",
    seen[0].options.timeout === 8000,
    seen[0].options.maxRetries === 0
  ].every(Boolean));
}

function checkClientReceivesBoundedDefaults() {
  const constructed = [];
  class FakeOpenAI {
    constructor(options) {
      constructed.push(options);
    }
  }

  createOpenAIClient("sk-contract", {
    OPENAI_TIMEOUT_MS: "30000",
    OPENAI_MAX_RETRIES: "2"
  }, FakeOpenAI);

  const clientOptions = buildOpenAIClientOptions({
    OPENAI_TIMEOUT_MS: "30000",
    OPENAI_MAX_RETRIES: "2"
  });

  pushCheck("OpenAI clients are constructed with the same bounded policy", [
    constructed.length === 1,
    constructed[0].apiKey === "sk-contract",
    constructed[0].timeout === 30000,
    constructed[0].maxRetries === 2,
    clientOptions.timeout === 30000,
    clientOptions.maxRetries === 2
  ].every(Boolean));
}

function checkBackendServicesUseSharedHelper() {
  const backendDir = path.join(process.cwd(), "src", "backend");
  const serviceFiles = fs.readdirSync(backendDir)
    .filter((file) => file.endsWith(".js"))
    .map((file) => path.join(backendDir, file));
  const violations = [];

  for (const file of serviceFiles) {
    const source = fs.readFileSync(file, "utf8");
    const relative = path.relative(process.cwd(), file);
    if (relative !== "src/backend/openaiClient.js" && /from\s+["']openai["']/.test(source)) {
      violations.push(`${relative} imports OpenAI directly`);
    }
    if (relative !== "src/backend/openaiClient.js" && /\.responses\.create\s*\(/.test(source)) {
      violations.push(`${relative} calls responses.create directly`);
    }
    if (relative !== "src/backend/openaiClient.js" && /\.embeddings\.create\s*\(/.test(source)) {
      violations.push(`${relative} calls embeddings.create directly`);
    }
  }

  pushCheck("Backend OpenAI calls are centralized through the timeout helper", violations.length === 0);
}

function checkPromptVersionsAreDocumented() {
  const roadmap = fs.readFileSync(path.join(process.cwd(), "docs", "production-roadmap.md"), "utf8");
  const expected = [
    SOUL_WISDOM_PROMPT_VERSION.replace("soul-wisdom-", "Soul Guru "),
    DEEP_GUIDANCE_PROMPT_VERSION.replace("more-guidance-", "More Guidance "),
    ASTRO_SOLVE_PROMPT_VERSION.replace("astro-solve-", "Astro Solves "),
    SHANI_PANDIT_PROMPT_VERSION.replace("shani-pandit-", "Shani Pandit ")
  ];
  const missing = expected.filter((label) => !roadmap.includes(label));

  pushCheck("OpenAI prompt versions stay documented in the production roadmap", [
    missing.length === 0,
    roadmap.includes(`${SOUL_WISDOM_MIN_WORDS}-${SOUL_WISDOM_MAX_WORDS}`),
    !roadmap.includes("More Guidance v3")
  ].every(Boolean));
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function printReport() {
  console.log(`OpenAI backend contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}
