import { handleCorsPreflight, sendJson } from "../src/backend/request.js";

export default function handler(req, res) {
  if (handleCorsPreflight(req, res)) return;

  sendJson(res, 200, {
    ok: true,
    service: "SoulGuru API",
    time: new Date().toISOString()
  });
}
