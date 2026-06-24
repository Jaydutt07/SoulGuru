import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { applyVerifiedIdentity } from "./src/backend/auth.js";
import { createAstroSolve } from "./src/backend/astroSolveService.js";
import { getMoreGuidanceDashboard, saveGuidance } from "./src/backend/guidanceService.js";
import { searchGuidanceMemory, upsertGuidanceMemory } from "./src/backend/memoryService.js";
import { requestOtp, verifyOtp } from "./src/backend/otpService.js";
import { createRazorpayOrder } from "./src/backend/payments.js";
import { handleUserProfile } from "./src/backend/profileService.js";
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

      server.middlewares.use("/api/more-guidance", async (req, res) => {
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
            route: "more-guidance",
            limit: Number(runtimeEnv.MORE_GUIDANCE_RATE_LIMIT || 80),
            windowSeconds: 24 * 60 * 60
          });

          if (!rate.allowed) {
            sendJson(res, 429, { error: "More Guidance request limit reached. Please try again tomorrow.", rate });
            return;
          }

          if (payload.action === "save-guidance") {
            const result = await saveGuidance(payload, runtimeEnv);
            sendJson(res, 200, { ...result, rate, auth });
            return;
          }

          const result = await getMoreGuidanceDashboard(payload, runtimeEnv);
          sendJson(res, 200, { ...result, rate, auth });
        } catch (error) {
          sendJson(res, error.statusCode || 500, { error: error.message || "Unable to load More Guidance" });
        }
      });

      server.middlewares.use("/api/user-profile", async (req, res) => {
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
            key: buildRateLimitKey(req, payload.user || { phone: payload.phone, email: payload.email }),
            route: "user-profile",
            limit: Number(runtimeEnv.USER_PROFILE_RATE_LIMIT || 60),
            windowSeconds: 60 * 60
          });

          if (!rate.allowed) {
            sendJson(res, 429, { error: "Too many profile requests. Try again later.", rate });
            return;
          }

          const result = await handleUserProfile(payload, runtimeEnv);
          sendJson(res, 200, { ...result, rate, auth });
        } catch (error) {
          sendJson(res, error.statusCode || 500, { error: error.message || "Unable to update profile" });
        }
      });

      server.middlewares.use("/api/auth-otp", async (req, res) => {
        if (req.method !== "POST") {
          sendJson(res, 405, { error: "Method not allowed" });
          return;
        }

        try {
          const runtimeEnv = {
            ...process.env,
            ...env
          };
          const payload = await parseJsonRequest(req);
          const rate = await checkRateLimit({
            env: runtimeEnv,
            key: buildRateLimitKey(req, payload.user || { phone: payload.phone, email: payload.email }),
            route: "auth-otp",
            limit: Number(runtimeEnv.OTP_RATE_LIMIT || 10),
            windowSeconds: 60 * 60
          });

          if (!rate.allowed) {
            sendJson(res, 429, { error: "Too many OTP requests. Try again later.", rate });
            return;
          }

          const result = payload.action === "verify"
            ? await verifyOtp(payload, runtimeEnv)
            : await requestOtp(payload, runtimeEnv);
          sendJson(res, 200, { ...result, rate });
        } catch (error) {
          sendJson(res, error.statusCode || 500, { error: error.message || "Unable to process OTP" });
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), soulGuruApiPlugin()]
});
