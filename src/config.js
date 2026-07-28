import "dotenv/config";
export default {
  port: Number(process.env.PORT || 4000),
  target: process.env.TARGET,
  cooldown: Number(process.env.COOLDOWN_MS || 60000),
  keys: (process.env.API_KEYS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};
