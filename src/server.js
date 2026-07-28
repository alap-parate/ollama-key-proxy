import express from "express";
import path from "node:path";
import config from "./config.js";
import km from "./key-manager.js";
import { proxy } from "./proxy.js";
import { logger } from "./logger.js";

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));
app.use(express.json({ limit: "100mb" }));

app.use(logger);

app.get("/health", (req, res) => {
  const available = km
    .stats()
    .filter((k) => k.disabledUntil <= Date.now()).length;
  res
    .status(available ? 200 : 503)
    .json({
      healthy: available > 0,
      totalKeys: km.stats().length,
      availableKeys: available,
    });
});

app.get("/metrics", (req, res) =>
  res.json(km.stats().map(({ key, ...r }) => r)),
);

app.get("/dashboard", (req, res) => {
  res.render("dashboard", {
    stats: km.stats(),
    config: {
      target: config.target,
      cooldown: config.cooldown,
    },
  });
});

app.all("/v1/*s", (req, res) =>
  proxy(req, res).catch((e) => {
    if (e.message === "No keys available") {
      return res.status(503).json({ error: "Service Unavailable: No API keys available" });
    }
    console.error(`[${req.id}] Proxy Error:`, e);
    res.status(500).json({ error: "Internal Server Error", message: e.message });
  }),
);

app.listen(config.port, () => console.log(`Proxy on ${config.port}`));
