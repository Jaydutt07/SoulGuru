import { captureApiError } from "./observabilityService.js";

export function sendJson(res, statusCode, payload, headers = {}) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  for (const [name, value] of Object.entries(headers)) {
    res.setHeader(name, value);
  }
  res.end(JSON.stringify(payload));
}

export async function sendErrorJson(req, res, error, options = {}) {
  const statusCode = Number(error?.statusCode || options.statusCode || 500);
  const fallbackMessage = options.fallbackMessage || "Unable to process request";
  await captureApiError(error, {
    req,
    route: options.route,
    statusCode,
    extra: options.extra
  }, process.env);
  sendJson(res, statusCode, { error: error?.message || fallbackMessage });
}

export function getHttpMethod(req) {
  return String(req.method || "GET").toUpperCase();
}

export async function readRequestBody(req, maxBytes = 50000) {
  return new Promise((resolve, reject) => {
    let body = "";
    let bytes = 0;
    let rejected = false;
    req.on("data", (chunk) => {
      bytes += Buffer.byteLength(chunk);
      body += chunk;
      if (!rejected && bytes > maxBytes) {
        rejected = true;
        reject(createHttpError("Request body is too large", 413, "PAYLOAD_TOO_LARGE"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!rejected) resolve(body || "");
    });
    req.on("error", (error) => {
      if (!rejected) reject(error);
    });
  });
}

export async function parseJsonRequest(req, maxBytes = 50000) {
  if (typeof req.body === "string") {
    return parseJsonBody(req.body);
  }
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const rawBody = await readRequestBody(req, maxBytes);
  return parseJsonBody(rawBody);
}

export function getClientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return String(value || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
}

function parseJsonBody(rawBody) {
  const text = String(rawBody || "");
  if (!text.trim()) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw createHttpError("Invalid JSON request body", 400, "INVALID_JSON");
  }
}

function createHttpError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
