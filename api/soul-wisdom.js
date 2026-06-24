import { createDailySoulWisdom } from "../src/backend/soulWisdomService.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const result = await createDailySoulWisdom(payload, process.env);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to create guidance" });
  }
}
