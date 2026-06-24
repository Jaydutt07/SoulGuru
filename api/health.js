export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: "SoulGuru API",
    time: new Date().toISOString()
  });
}
