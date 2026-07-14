import { buildDeploymentReadiness } from "../src/backend/readinessService.js";
import { getHttpMethod, handleCorsPreflight, sendJson } from "../src/backend/request.js";

export default function handler(req, res) {
  if (handleCorsPreflight(req, res)) return;

  if (isHealthProbe(req)) {
    sendJson(res, 200, {
      ok: true,
      service: "SoulGuru API",
      time: new Date().toISOString()
    });
    return;
  }

  if (getHttpMethod(req) !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const readiness = buildDeploymentReadiness(process.env);
  sendJson(res, readiness.ok ? 200 : 503, readiness);
}

function isHealthProbe(req) {
  const queryAction = getQueryValue(req, "action");
  return queryAction === "health";
}

function getQueryValue(req, name) {
  const directValue = req.query?.[name];
  if (Array.isArray(directValue)) return String(directValue[0] || "");
  if (directValue) return String(directValue);

  const requestUrl = new URL(req.url || "/api/readiness", "http://localhost");
  return String(requestUrl.searchParams.get(name) || "");
}
