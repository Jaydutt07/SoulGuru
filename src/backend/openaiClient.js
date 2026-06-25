import OpenAI from "openai";

export const DEFAULT_OPENAI_TIMEOUT_MS = 45000;
export const DEFAULT_OPENAI_MAX_RETRIES = 1;
const MAX_OPENAI_TIMEOUT_MS = 120000;
const MAX_OPENAI_RETRIES = 3;

export function createOpenAIClient(apiKey, env = process.env, Client = OpenAI) {
  return new Client({
    apiKey,
    ...buildOpenAIClientOptions(env)
  });
}

export function buildOpenAIClientOptions(env = process.env) {
  return buildOpenAIRequestOptions(env);
}

export function buildOpenAIRequestOptions(env = process.env, overrides = {}) {
  return {
    timeout: parseBoundedInteger(
      overrides.timeout ?? env.OPENAI_TIMEOUT_MS,
      DEFAULT_OPENAI_TIMEOUT_MS,
      1000,
      MAX_OPENAI_TIMEOUT_MS
    ),
    maxRetries: parseBoundedInteger(
      overrides.maxRetries ?? env.OPENAI_MAX_RETRIES,
      DEFAULT_OPENAI_MAX_RETRIES,
      0,
      MAX_OPENAI_RETRIES
    )
  };
}

export async function requestOpenAIResponse(client, body, env = process.env, options = {}) {
  return client.responses.create(body, buildOpenAIRequestOptions(env, options));
}

export async function requestOpenAIEmbedding(client, body, env = process.env, options = {}) {
  return client.embeddings.create(body, buildOpenAIRequestOptions(env, options));
}

function parseBoundedInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
