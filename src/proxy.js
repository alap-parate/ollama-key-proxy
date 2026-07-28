import { Readable } from "node:stream";
import config from "./config.js";
import km from "./key-manager.js";

export async function proxy(req, res) {
  let last;
  for (let a = 0; a < km.keys.length; a++) {
    console.log(`[${req.id}] Forwarding to:`);

    console.log(`${config.target}${req.originalUrl}`);

    const k = km.next();
    console.log(`[${req.id}] Selected key #${k.key}`);
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.authorization;
    delete headers["content-length"];
    headers.authorization = `Bearer ${k.key}`;
    const r = await fetch(config.target + req.originalUrl, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method)
        ? undefined
        : JSON.stringify(req.body),
      duplex: "half",
    });

    console.log(`[${req.id}] Upstream responded ${r.status}`);

    last = r;

    if (r.ok) {
      k.successes++;
      res.status(r.status);
      r.headers.forEach((v, h) => {
        if (h !== "transfer-encoding") res.setHeader(h, v);
      });
      if (r.body) Readable.fromWeb(r.body).pipe(res);
      else res.end();
      return;
    }

    if (r.status === 429) {
      km.cooldown(k);
      console.log(
        `[${req.id}] Key #${key.id} cooling down for ${config.cooldown} ms`,
      );
      continue;
    }

    if (r.status >= 500) {
      k.failures++;
      continue;
    }

    res.status(r.status);

    if (r.body) Readable.fromWeb(r.body).pipe(res);
    else res.end();

    return;
  }
  res.status(last ? last.status : 503).json({ error: "No available API key" });
}
