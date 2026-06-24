import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { createDailySoulWisdom } from "./src/backend/soulWisdomService.js";

function soulGuruApiPlugin() {
  return {
    name: "soulguru-api",
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), "");

      server.middlewares.use("/api/health", (_req, res) => {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
          ok: true,
          service: "SoulGuru API",
          time: new Date().toISOString()
        }));
      });

      server.middlewares.use("/api/soul-wisdom", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        try {
          const payload = JSON.parse(await readRequestBody(req));
          const result = await createDailySoulWisdom(payload, {
            ...process.env,
            ...env
          });

          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(result));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: error.message || "Unable to create guidance" }));
        }
      });
    }
  };
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 20000) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body || "{}"));
    req.on("error", reject);
  });
}

export default defineConfig({
  plugins: [react(), soulGuruApiPlugin()]
});
