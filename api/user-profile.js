import { applyVerifiedIdentity } from "../src/backend/auth.js";
import { suggestBirthPlaces } from "../src/backend/placeResolutionService.js";
import { handleUserProfile } from "../src/backend/profileService.js";
import { buildRateLimitKey, checkRateLimit } from "../src/backend/rateLimit.js";
import { getHttpMethod, handleCorsPreflight, parseJsonRequest, sendErrorJson, sendJson } from "../src/backend/request.js";

export default async function handler(req, res) {
  if (handleCorsPreflight(req, res)) return;

  const method = getHttpMethod(req);
  try {
    if (method === "GET") {
      const url = new URL(req.url || "/api/user-profile", `https://${req.headers?.host || "soulguru.local"}`);
      if (url.searchParams.get("action") === "place-suggestions") {
        await handlePlaceSuggestions(req, res, url.searchParams.get("q") || url.searchParams.get("query"));
        return;
      }
    }

    if (method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    const parsedPayload = await parseJsonRequest(req);
    if (parsedPayload.action === "place-suggestions") {
      await handlePlaceSuggestions(req, res, parsedPayload.q || parsedPayload.query || parsedPayload.birthPlace);
      return;
    }

    const { payload, auth } = await applyVerifiedIdentity(req, parsedPayload, process.env);
    const rate = await checkRateLimit({
      env: process.env,
      key: buildRateLimitKey(req, payload.user || { phone: payload.phone, email: payload.email }),
      route: "user-profile",
      limit: Number(process.env.USER_PROFILE_RATE_LIMIT || 60),
      windowSeconds: 60 * 60
    });

    if (!rate.allowed) {
      sendJson(res, 429, { error: "Too many profile requests. Try again later.", rate });
      return;
    }

    const result = await handleUserProfile(payload, process.env);
    sendJson(res, 200, { ...result, rate, auth });
  } catch (error) {
    await sendErrorJson(req, res, error, { route: "user-profile", fallbackMessage: "Unable to update profile" });
  }
}

async function handlePlaceSuggestions(req, res, query) {
  const rate = await checkRateLimit({
    env: process.env,
    key: buildRateLimitKey(req),
    route: "place-suggestions",
    limit: Number(process.env.PLACE_SUGGESTIONS_RATE_LIMIT || 120),
    windowSeconds: 60 * 60
  });

  if (!rate.allowed) {
    sendJson(res, 429, { error: "Too many place searches. Try again later.", rate });
    return;
  }

  const suggestions = await suggestBirthPlaces(query, process.env);
  sendJson(res, 200, { suggestions, rate });
}
