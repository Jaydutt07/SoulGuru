import { applyVerifiedIdentity } from "../src/backend/auth.js";
import { buildRateLimitKey, checkRateLimit } from "../src/backend/rateLimit.js";
import { searchGuidanceMemory, upsertGuidanceMemory } from "../src/backend/memoryService.js";
import { getHttpMethod, handleCorsPreflight, parseJsonRequest, sendErrorJson, sendJson } from "../src/backend/request.js";

export default async function handler(req, res) {
  if (handleCorsPreflight(req, res)) return;

  if (getHttpMethod(req) !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const parsedPayload = await parseJsonRequest(req);
    const { payload, auth } = await applyVerifiedIdentity(req, parsedPayload, process.env);
    const rate = await checkRateLimit({
      env: process.env,
      key: buildRateLimitKey(req, payload.user),
      route: "guidance-memory",
      limit: Number(process.env.GUIDANCE_MEMORY_RATE_LIMIT || 60),
      windowSeconds: 24 * 60 * 60
    });

    if (!rate.allowed) {
      sendJson(res, 429, { error: "Guidance memory limit reached. Please try again tomorrow.", rate });
      return;
    }

    if (payload.action === "search") {
      const result = await searchGuidanceMemory({
        user: payload.user,
        query: payload.query,
        topK: payload.topK
      }, process.env);
      sendJson(res, 200, { ...result, rate, auth });
      return;
    }

    const result = await upsertGuidanceMemory({
      user: payload.user,
      text: payload.text,
      kind: payload.kind,
      sourceId: payload.sourceId,
      metadata: payload.metadata
    }, process.env);
    sendJson(res, 200, { ...result, rate, auth });
  } catch (error) {
    await sendErrorJson(req, res, error, { route: "guidance-memory", fallbackMessage: "Unable to update guidance memory" });
  }
}
