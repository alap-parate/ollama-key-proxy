import { Readable, pipeline } from "node:stream";
import config from "./config.js";
import km from "./key-manager.js";

const MAX_RETRIES = 3;

export async function proxy(req, res) {
  const controller = new AbortController();
  const ignored = new Set(["connection", "keep-alive", "transfer-encoding"]);

  const requestPath = req.path || req.originalUrl;

  req.on("close", () => {
    console.log(`[${req.id}] Client disconnected`);
    controller.abort();
  });

  let lastError = null;
  let lastResponse = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let k;
    try {
      k = km.next();
    } catch (err) {
      lastError = err;
      break;
    }

    console.log(`[${req.id}] Attempt ${attempt + 1}: Using key #${k.id}`);
    console.log(`[${req.id}] Forwarding to: ${config.target}${req.originalUrl}`);

    const headers = { ...req.headers };
    delete headers.host;
    delete headers.authorization;
    delete headers["content-length"];
    headers.authorization = `Bearer ${k.key}`;

    try {
      const r = await fetch(config.target + req.originalUrl, {
        method: req.method,
        headers,
        body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body,
        duplex: "half",
        signal: controller.signal,
      });

      console.log(`[${req.id}] Upstream responded ${r.status}`);

      if (r.ok) {
        k.successes++;
        km.recordSuccess();

        res.status(r.status);
        r.headers.forEach((v, h) => {
          if (!ignored.has(h.toLowerCase())) res.setHeader(h, v);
        });

        if (r.body) {
          pipeline(Readable.fromWeb(r.body), res, (err) => {
            if (err) {
              console.error(`[${req.id}] Stream failed`, err);
            }
          });
        } else {
          res.end();
        }
        return;
      }

      if (r.status === 429) {
        km.cooldown(k);
        console.log(`[${req.id}] Key #${k.id} rate limited, cooling down for ${config.cooldown}ms`);
        lastResponse = r;
        continue; 
      }

      if (r.status >= 500) {
        k.failures++;
        km.recordFailure();
        console.log(`[${req.id}] Key #${k.id} got server error ${r.status}, trying next key`);
        lastResponse = r;
        continue; 
      }

      // Client errors (4xx except 429) - don't retry, return as-is
      res.status(r.status);
      if (r.body) {
        const bodyText = await r.text();
        res.setHeader("Content-Type", "application/json");
        res.end(bodyText);
      } else {
        res.end();
      }
      return;

    } catch (err) {
      if (err.name === "AbortError") {
        console.log(`[${req.id}] Request aborted`);
        return;
      }
      console.error(`[${req.id}] Fetch failed:`, err.message);
      k.failures++;
      km.recordFailure();
      lastError = err;
    }
  }

  if (lastResponse) {
    res.status(lastResponse.status);
    if (lastResponse.body) {
      const bodyText = await lastResponse.text();
      res.setHeader("Content-Type", "application/json");
      res.end(bodyText);
    } else {
      res.end();
    }
  } else {
    res.status(503).json({
      error: "No available API key",
      message: lastError?.message || "All keys failed or are rate limited"
    });
  }
}
