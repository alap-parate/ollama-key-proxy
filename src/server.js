import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import config from "./config.js";
import km from "./key-manager.js";
import { proxy } from "./proxy.js";
import { logger } from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.raw({ type: "*/*", limit: "100mb" }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

app.use(logger);

function maskKey(key) {
  if (!key || key.length < 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

app.get("/health", (req, res) => {
  const stats = km.stats();
  const available = stats.filter((k) => k.disabledUntil <= Date.now()).length;
  res
    .status(available ? 200 : 503)
    .json({
      healthy: available > 0,
      totalKeys: stats.length,
      availableKeys: available,
    });
});

app.get("/metrics", (req, res) => {
  const keys = km.stats().map(({ key, ...r }) => ({
    ...r,
    keyMask: maskKey(key),
  }));
  res.json({
    keys,
    global: km.globalStatsData(),
  });
});

app.get("/", (req, res) => {
  const keys = km.stats().map((k) => ({
    ...k,
    key: maskKey(k.key),
    status: k.disabledUntil > Date.now() ? "cooling" : "active",
    statusColor: k.disabledUntil > Date.now() ? "#ef4444" : "#22c55e",
  }));
  const global = km.globalStatsData();

  res.render("dashboard", {
    keys,
    global,
    config: {
      port: config.port,
      target: config.target,
      cooldown: config.cooldown,
    },
  });
});

app.get("/dashboard", (req, res) => {
  res.redirect("/");
});

app.all("/v1/{*path}", (req, res) =>
  proxy(req, res).catch((e) => {
    console.error(e);
    res.status(500).json({ error: e.message });
  }),
);

app.listen(config.port, () => console.log(`Proxy on ${config.port}`));
