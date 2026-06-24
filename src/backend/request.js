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
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxBytes) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body || ""));
    req.on("error", reject);
  });
}

export async function parseJsonRequest(req, maxBytes = 50000) {
  if (typeof req.body === "string") {
    return JSON.parse(req.body || "{}");
  }
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const rawBody = await readRequestBody(req, maxBytes);
  return rawBody ? JSON.parse(rawBody) : {};
}

export function getClientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return String(value || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
}
