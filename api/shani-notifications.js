import {
  dispatchDueShaniNotifications,
  isShaniNotificationRequestAuthorized
} from "../src/backend/shaniNotificationService.js";
import { getHttpMethod, handleCorsPreflight, parseJsonRequest, sendErrorJson, sendJson } from "../src/backend/request.js";

export default async function handler(req, res) {
  if (handleCorsPreflight(req, res)) return;

  const method = getHttpMethod(req);
  if (method !== "GET" && method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (!isShaniNotificationRequestAuthorized(req, process.env)) {
    sendJson(res, 401, { error: "Unauthorized Shani notification dispatch" });
    return;
  }

  try {
    const payload = method === "POST" ? await parseJsonRequest(req) : parseQueryPayload(req);
    const result = await dispatchDueShaniNotifications(payload, process.env);
    sendJson(res, 200, result);
  } catch (error) {
    await sendErrorJson(req, res, error, {
      route: "shani-notifications",
      fallbackMessage: "Unable to dispatch Shani notifications"
    });
  }
}

function parseQueryPayload(req) {
  const url = new URL(req.url || "/api/shani-notifications", "https://soulguru.local");
  return {
    forceType: url.searchParams.get("forceType") || "",
    remedyDate: url.searchParams.get("remedyDate") || "",
    dryRun: url.searchParams.get("dryRun") === "true",
    limit: url.searchParams.get("limit") || ""
  };
}
