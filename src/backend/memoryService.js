import crypto from "node:crypto";
import { fetchWithTimeout } from "./fetchWithTimeout.js";
import { createOpenAIClient, requestOpenAIEmbedding } from "./openaiClient.js";

const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_TOP_K = 4;
const MAX_MEMORY_TEXT_CHARS = 1400;

export function isGuidanceMemoryConfigured(env = process.env) {
  return Boolean(env.OPENAI_API_KEY && env.PINECONE_API_KEY && env.PINECONE_HOST);
}

export async function searchGuidanceMemory({ user = {}, query, topK = DEFAULT_TOP_K }, env = process.env, deps = {}) {
  if (!isGuidanceMemoryConfigured(env) || !query) {
    return { configured: false, matches: [] };
  }

  try {
    const makeEmbedding = deps.createEmbedding || createEmbedding;
    const fetchImpl = deps.fetch || globalThis.fetch;
    const vector = await makeEmbedding(query, env);
    const response = await fetchWithTimeout(`${normalizePineconeHost(env.PINECONE_HOST)}/query`, {
      method: "POST",
      headers: pineconeHeaders(env),
      body: JSON.stringify({
        namespace: buildUserNamespace(user),
        vector,
        topK,
        includeMetadata: true,
        includeValues: false
      })
    }, {
      env,
      fetchImpl,
      label: "Pinecone memory query"
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || `Pinecone query failed with ${response.status}`);
    }

    return {
      configured: true,
      matches: (data.matches || []).map((match) => ({
        id: match.id,
        score: match.score,
        text: match.metadata?.text || "",
        kind: match.metadata?.kind || "",
        createdAt: match.metadata?.createdAt || ""
      })).filter((match) => match.text)
    };
  } catch (error) {
    console.warn("Guidance memory search degraded", error.message);
    return { configured: true, degraded: true, matches: [] };
  }
}

export async function upsertGuidanceMemory({
  user = {},
  text,
  kind = "guidance",
  sourceId = "",
  metadata = {}
}, env = process.env, deps = {}) {
  if (!isGuidanceMemoryConfigured(env) || !text) {
    return { configured: false, upserted: false };
  }

  try {
    const makeEmbedding = deps.createEmbedding || createEmbedding;
    const fetchImpl = deps.fetch || globalThis.fetch;
    const cleanText = String(text || "").replace(/\s+/g, " ").trim().slice(0, MAX_MEMORY_TEXT_CHARS);
    const vector = await makeEmbedding(cleanText, env);
    const id = buildMemoryId({ user, kind, sourceId, text: cleanText });
    const response = await fetchWithTimeout(`${normalizePineconeHost(env.PINECONE_HOST)}/vectors/upsert`, {
      method: "POST",
      headers: pineconeHeaders(env),
      body: JSON.stringify({
        namespace: buildUserNamespace(user),
        vectors: [{
          id,
          values: vector,
          metadata: sanitizeMetadata({
            ...metadata,
            kind,
            sourceId,
            text: cleanText,
            createdAt: new Date().toISOString()
          })
        }]
      })
    }, {
      env,
      fetchImpl,
      label: "Pinecone memory upsert"
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || `Pinecone upsert failed with ${response.status}`);
    }

    return {
      configured: true,
      upserted: true,
      id,
      count: data.upsertedCount || 1
    };
  } catch (error) {
    console.warn("Guidance memory upsert degraded", error.message);
    return { configured: true, degraded: true, upserted: false };
  }
}

export function buildMemoryContext(memoryResult) {
  const matches = memoryResult?.matches || [];
  if (!matches.length) return "";

  return matches
    .slice(0, DEFAULT_TOP_K)
    .map((match, index) => `${index + 1}. ${sanitizeForSoulGuru(match.text)}`)
    .join("\n");
}

async function createEmbedding(input, env) {
  const client = createOpenAIClient(env.OPENAI_API_KEY, env);
  const response = await requestOpenAIEmbedding(client, {
    model: env.OPENAI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL,
    input
  }, env);
  return response.data[0].embedding;
}

function pineconeHeaders(env) {
  return {
    "Api-Key": env.PINECONE_API_KEY,
    "Content-Type": "application/json"
  };
}

function normalizePineconeHost(host) {
  const value = String(host || "").trim();
  if (!value) return "";
  return value.startsWith("http") ? value.replace(/\/$/, "") : `https://${value.replace(/\/$/, "")}`;
}

function buildUserNamespace(user) {
  return `user-${hashUser(user).slice(0, 18)}`;
}

function buildMemoryId({ user, kind, sourceId, text }) {
  const suffix = sourceId || crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
  return `${kind}-${hashUser(user).slice(0, 12)}-${String(suffix).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48)}`;
}

function hashUser(user) {
  const stableValue = user.authUserId || user.id || user.phone || user.email || `${user.name}-${user.birthDate}-${user.birthTime}`;
  return crypto.createHash("sha256").update(String(stableValue || "anonymous").toLowerCase().trim()).digest("hex");
}

function sanitizeMetadata(metadata) {
  return Object.fromEntries(Object.entries(metadata).flatMap(([key, value]) => {
    if (value === null || value === undefined) return [];
    if (["string", "number", "boolean"].includes(typeof value)) return [[key, value]];
    if (value instanceof Date) return [[key, value.toISOString()]];
    return [[key, String(value)]];
  }));
}

function sanitizeForSoulGuru(text) {
  const replacements = [
    ["saturn pressure", "discipline pressure"],
    ["moon transit", "emotional timing"],
    ["astrology", "timing pattern"],
    ["zodiac", "temperament"],
    ["moon sign", "emotional rhythm"],
    ["moon", "emotional rhythm"],
    ["sun", "core drive"],
    ["saturn", "discipline pressure"],
    ["planet", "timing signal"],
    ["transit", "timing shift"],
    ["chart", "inner map"],
    ["horoscope", "daily signal"],
    ["numerology", "life pattern"],
    ["karma", "repeated lesson"]
  ];

  return replacements.reduce((current, [from, to]) => {
    return current.replace(new RegExp(from, "gi"), to);
  }, String(text || "").replace(/\s+/g, " ").trim());
}
