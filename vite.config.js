import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { applyVerifiedIdentity } from "./src/backend/auth.js";
import { createAstroSolve } from "./src/backend/astroSolveService.js";
import { searchGuidanceMemory, upsertGuidanceMemory } from "./src/backend/memoryService.js";
import { createRazorpayOrder } from "./src/backend/payments.js";
import { createDailySoulWisdom } from "./src/backend/soulWisdomService.js";
import { buildRateLimitKey, checkRateLimit } from "./src/backend/rateLimit.js";
import { parseJsonRequest, sendJson } from "./src/backend/request.js";

function soulGuruApiPlugin() {
  return {
    name: "soulguru-api",
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), "");

      server.middlewares.use("/api/health", (_req, res) => {
        sendJson(res, 200, {
          ok: true,
          service: "SoulGuru API",
          time: new Date().toISOString()
        });
      });

      server.middlewares.use("/api/soul-wisdom", async (req, res) => {
        if (req.method !== "POST") {
          sendJson(res, 405, { error: "Method not allowed" });
          return;
        }

        try {
          const runtimeEnv = {
            ...process.env,
            ...env
          };
          const parsedPayload = await parseJsonRequest(req);
          const { payload, auth } = await applyVerifiedIdentity(req, parsedPayload, runtimeEnv);
          const rate = await checkRateLimit({
            env: runtimeEnv,
            key: buildRateLimitKey(req, payload.user),
            route: "soul-wisdom",
            limit: Number(runtimeEnv.SOUL_WISDOM_RATE_LIMIT || 20),
            windowSeconds: 24 * 60 * 60
          });

          if (!rate.allowed) {
            sendJson(res, 429, { error: "Daily guidance limit reached. Please try again tomorrow.", rate });
            return;
          }

          const result = await createDailySoulWisdom(payload, runtimeEnv);
          sendJson(res, 200, { ...result, rate, auth });
        } catch (error) {
          sendJson(res, error.statusCode || 500, { error: error.message || "Unable to create guidance" });
        }
      });

      server.middlewares.use("/api/create-razorpay-order", async (req, res) => {
        if (req.method !== "POST") {
          sendJson(res, 405, { error: "Method not allowed" });
          return;
        }

        try {
          const runtimeEnv = {
            ...process.env,
            ...env
          };
          const parsedPayload = await parseJsonRequest(req);
          const { payload, auth } = await applyVerifiedIdentity(req, parsedPayload, runtimeEnv);
          const rate = await checkRateLimit({
            env: runtimeEnv,
            key: buildRateLimitKey(req, payload.user),
            route: "razorpay-order",
            limit: Number(runtimeEnv.RAZORPAY_ORDER_RATE_LIMIT || 10),
            windowSeconds: 60 * 60
          });

          if (!rate.allowed) {
            sendJson(res, 429, { error: "Too many payment attempts. Try again later.", rate });
            return;
          }

          const order = await createRazorpayOrder(payload, runtimeEnv);
          sendJson(res, 200, { ...order, auth });
        } catch (error) {
          sendJson(res, error.statusCode || 500, { error: error.message || "Unable to create order" });
        }
      });

      server.middlewares.use("/api/astro-solve", async (req, res) => {
        if (req.method !== "POST") {
          sendJson(res, 405, { error: "Method not allowed" });
          return;
        }

        try {
          const runtimeEnv = {
            ...process.env,
            ...env
          };
          const parsedPayload = await parseJsonRequest(req);
          const { payload, auth } = await applyVerifiedIdentity(req, parsedPayload, runtimeEnv);
          const rate = await checkRateLimit({
            env: runtimeEnv,
            key: buildRateLimitKey(req, payload.user),
            route: "astro-solve",
            limit: Number(runtimeEnv.ASTRO_SOLVE_RATE_LIMIT || 20),
            windowSeconds: 24 * 60 * 60
          });

          if (!rate.allowed) {
            sendJson(res, 429, { error: "Astro Solves daily request limit reached. Please try again tomorrow.", rate });
            return;
          }

          const result = await createAstroSolve(payload, runtimeEnv);
          sendJson(res, result.allowed === false ? 402 : 200, { ...result, rate, auth });
        } catch (error) {
          sendJson(res, error.statusCode || 500, { error: error.message || "Unable to create Astro Solves answer" });
        }
      });

      server.middlewares.use("/api/guidance-memory", async (req, res) => {
        if (req.method !== "POST") {
          sendJson(res, 405, { error: "Method not allowed" });
          return;
        }

        try {
          const runtimeEnv = {
            ...process.env,
            ...env
          };
          const parsedPayload = await parseJsonRequest(req);
          const { payload, auth } = await applyVerifiedIdentity(req, parsedPayload, runtimeEnv);
          const rate = await checkRateLimit({
            env: runtimeEnv,
            key: buildRateLimitKey(req, payload.user),
            route: "guidance-memory",
            limit: Number(runtimeEnv.GUIDANCE_MEMORY_RATE_LIMIT || 60),
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
            }, runtimeEnv);
            sendJson(res, 200, { ...result, rate, auth });
            return;
          }

          const result = await upsertGuidanceMemory({
            user: payload.user,
            text: payload.text,
            kind: payload.kind,
            sourceId: payload.sourceId,
            metadata: payload.metadata
          }, runtimeEnv);
          sendJson(res, 200, { ...result, rate, auth });
        } catch (error) {
          sendJson(res, error.statusCode || 500, { error: error.message || "Unable to update guidance memory" });
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), soulGuruApiPlugin()]
});
