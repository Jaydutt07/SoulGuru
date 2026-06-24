import { createAstroSolve } from "../src/backend/astroSolveService.js";
import { buildRateLimitKey, checkRateLimit } from "../src/backend/rateLimit.js";
import { getHttpMethod, parseJsonRequest, sendJson } from "../src/backend/request.js";

export default async function handler(req, res) {
  if (getHttpMethod(req) !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const payload = await parseJsonRequest(req);
    const rate = await checkRateLimit({
      env: process.env,
      key: buildRateLimitKey(req, payload.user),
      route: "astro-solve",
      limit: Number(process.env.ASTRO_SOLVE_RATE_LIMIT || 20),
      windowSeconds: 24 * 60 * 60
    });

    if (!rate.allowed) {
      sendJson(res, 429, { error: "Astro Solves daily request limit reached. Please try again tomorrow.", rate });
      return;
    }

    const result = await createAstroSolve(payload, process.env);
    const statusCode = result.allowed === false ? 402 : 200;
    sendJson(res, statusCode, { ...result, rate });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Unable to create Astro Solves answer" });
  }
}
