import express from "express";
import config from "./config.js";
import km from "./key-manager.js";
import { proxy } from "./proxy.js";
import { logger } from "./logger.js";

const app = express();
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

app.all("/v1/*s", (req, res) =>
  proxy(req, res).catch((e) => {
    console.error(e);
    res.status(500).json({ error: e.message });
  }),
);

app.listen(config.port, () => console.log(`Proxy on ${config.port}`));
