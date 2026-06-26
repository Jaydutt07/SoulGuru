import crypto from "node:crypto";
import { fetchWithTimeout } from "./fetchWithTimeout.js";
import { createOpenAIClient, requestOpenAIEmbedding } from "./openaiClient.js";

const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_TOP_K = 4;
const MAX_MEMORY_TEXT_CHARS = 1400;
const MAX_MEMORY_MATCHES = 10;
const MAX_METADATA_VALUE_CHARS = 512;
const MAX_METADATA_KEY_CHARS = 48;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_CANDIDATE_PATTERN = /\+?\d[\d\s().-]{7,}\d/g;

export function isGuidanceMemoryConfigured(env = process.env) {
  return Boolean(
    hasConfiguredValue(env.OPENAI_API_KEY) &&
    hasConfiguredValue(env.PINECONE_API_KEY) &&
    hasConfiguredValue(env.PINECONE_INDEX) &&
    getConfiguredPineconeHost(env.PINECONE_HOST)
  );
}

export async function searchGuidanceMemory({ user = {}, query, topK = DEFAULT_TOP_K }, env = process.env, deps = {}) {
  const cleanQuery = normalizeMemoryText(query);
  const configured = isGuidanceMemoryConfigured(env);
  if (!configured) {
    if (isGuidanceMemoryRequired(env)) {
      throwHttpError(
        "Guidance memory is not configured. Set Pinecone and embedding environment variables before serving personalized guidance.",
        503
      );
    }
    return { configured: false, matches: [] };
  }
  if (!cleanQuery) return { configured: true, matches: [] };

  try {
    const makeEmbedding = deps.createEmbedding || createEmbedding;
    const fetchImpl = deps.fetch || globalThis.fetch;
    const vector = await makeEmbedding(cleanQuery, env);
    const response = await fetchWithTimeout(`${normalizePineconeHost(env.PINECONE_HOST)}/query`, {
      method: "POST",
      headers: pineconeHeaders(env),
      body: JSON.stringify({
        namespace: buildUserNamespace(user),
        vector,
        topK: normalizeTopK(topK),
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
        id: sanitizeIdentifierPart(match.id, 96),
        score: Number(match.score) || 0,
        text: normalizeMemoryText(match.metadata?.text),
        kind: sanitizeIdentifierPart(match.metadata?.kind, 48),
        createdAt: normalizeMemoryText(match.metadata?.createdAt, 64)
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
  const cleanText = normalizeMemoryText(text);
  const configured = isGuidanceMemoryConfigured(env);
  if (!configured) {
    if (isGuidanceMemoryRequired(env)) {
      throwHttpError(
        "Guidance memory is not configured. Set Pinecone and embedding environment variables before serving personalized guidance.",
        503
      );
    }
    return { configured: false, upserted: false };
  }
  if (!cleanText) return { configured: true, upserted: false };

  try {
    const makeEmbedding = deps.createEmbedding || createEmbedding;
    const fetchImpl = deps.fetch || globalThis.fetch;
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

export function isGuidanceMemoryRequired(env = process.env) {
  return String(env.GUIDANCE_MEMORY_REQUIRE_PINECONE || "false").toLowerCase() === "true";
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
    "Api-Key": String(env.PINECONE_API_KEY || "").trim(),
    "Content-Type": "application/json"
  };
}

function normalizePineconeHost(host) {
  return getConfiguredPineconeHost(host);
}

function buildUserNamespace(user) {
  return `user-${hashUser(user).slice(0, 18)}`;
}

function buildMemoryId({ user, kind, sourceId, text }) {
  const suffix = sourceId || crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
  const safeKind = sanitizeIdentifierPart(kind || "guidance", 48) || "guidance";
  const safeSuffix = sanitizeIdentifierPart(suffix, 48) || crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
  return `${safeKind}-${hashUser(user).slice(0, 12)}-${safeSuffix}`;
}

function hashUser(user) {
  const stableValue = user.authUserId || user.id || user.phone || user.email || `${user.name}-${user.birthDate}-${user.birthTime}`;
  return crypto.createHash("sha256").update(String(stableValue || "anonymous").toLowerCase().trim()).digest("hex");
}

function sanitizeMetadata(metadata) {
  return Object.fromEntries(Object.entries(metadata).flatMap(([key, value]) => {
    if (value === null || value === undefined) return [];
    const safeKey = sanitizeMetadataKey(key);
    if (!safeKey) return [];
    if (value instanceof Date) return [[safeKey, value.toISOString()]];
    if (typeof value === "string") {
      return [[safeKey, sanitizeMetadataString(value, safeKey === "text" ? MAX_MEMORY_TEXT_CHARS : MAX_METADATA_VALUE_CHARS)]];
    }
    if (typeof value === "number") return Number.isFinite(value) ? [[safeKey, value]] : [];
    if (typeof value === "boolean") return [[safeKey, value]];
    return [];
  }));
}

function getConfiguredPineconeHost(host) {
  const value = String(host || "").trim();
  if (!hasConfiguredValue(value)) return "";

  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (url.protocol !== "https:" || !url.hostname) return "";
    if (url.username || url.password || url.search || url.hash) return "";
    if (isLocalOrPrivateHost(url.hostname)) return "";
    const pathname = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
    if (pathname) return "";
    return `https://${url.hostname}`;
  } catch {
    return "";
  }
}

function normalizeTopK(value) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return DEFAULT_TOP_K;
  return Math.min(MAX_MEMORY_MATCHES, Math.max(1, number));
}

function normalizeMemoryText(value, maxChars = MAX_MEMORY_TEXT_CHARS) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}

function sanitizeMetadataKey(key) {
  return sanitizeIdentifierPart(key, MAX_METADATA_KEY_CHARS);
}

function sanitizeMetadataString(value, maxChars = MAX_METADATA_VALUE_CHARS) {
  return normalizeMemoryText(value, maxChars)
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(PHONE_CANDIDATE_PATTERN, (candidate) => {
      const digits = candidate.replace(/\D/g, "");
      return digits.length >= 10 ? "[redacted-phone]" : candidate;
    });
}

function sanitizeIdentifierPart(value, maxChars = 64) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9_-]+/g, "")
    .slice(0, maxChars);
}

function hasConfiguredValue(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");

  if (!normalized) return false;
  if (normalized.startsWith("${{") || normalized.startsWith("$")) return false;
  if (/^(true|false|null|undefined)$/i.test(normalized)) return false;
  if (/^(your|replace|change|changeme|placeholder|example|dummy|fake|todo|xxx|xxxx|redacted)(?:[-_\s].*)?$/i.test(normalized)) {
    return false;
  }
  if (/^<[^>]+>$/.test(normalized)) return false;
  if (/^\*+$/.test(normalized)) return false;

  return true;
}

function isLocalOrPrivateHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  return parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168);
}

function throwHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
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
