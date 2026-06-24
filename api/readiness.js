import { buildDeploymentReadiness } from "../src/backend/readinessService.js";
import { getHttpMethod, sendJson } from "../src/backend/request.js";

export default function handler(req, res) {
  if (getHttpMethod(req) !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const readiness = buildDeploymentReadiness(process.env);
  sendJson(res, readiness.ok ? 200 : 503, readiness);
}
