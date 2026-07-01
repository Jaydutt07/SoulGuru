import { applyVerifiedIdentity } from "../src/backend/auth.js";
import { createAstroSolve, getAstroSolveAllowanceStatus } from "../src/backend/astroSolveService.js";
import { buildRateLimitKey, checkRateLimit } from "../src/backend/rateLimit.js";
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
    const isAllowanceStatus = payload.action === "allowance";
    const rate = await checkRateLimit({
      env: process.env,
      key: buildRateLimitKey(req, payload.user),
      route: isAllowanceStatus ? "astro-solve-allowance" : "astro-solve",
      limit: Number(isAllowanceStatus ? process.env.ASTRO_SOLVE_ALLOWANCE_RATE_LIMIT || 120 : process.env.ASTRO_SOLVE_RATE_LIMIT || 20),
      windowSeconds: 24 * 60 * 60
    });

    if (!rate.allowed) {
      sendJson(res, 429, { error: "Astro Solves daily request limit reached. Please try again tomorrow.", rate });
      return;
    }

    if (isAllowanceStatus) {
      const result = await getAstroSolveAllowanceStatus(payload, process.env);
      sendJson(res, 200, { ...result, rate, auth });
      return;
    }

    const result = await createAstroSolve(payload, process.env);
    const statusCode = result.allowed === false ? 402 : 200;
    sendJson(res, statusCode, { ...result, rate, auth });
  } catch (error) {
    await sendErrorJson(req, res, error, { route: "astro-solve", fallbackMessage: "Unable to create Astro Solves answer" });
  }
}
