import { Readable, pipeline } from "node:stream";
import config from "./config.js";
import km from "./key-manager.js";

const MAX_RETRIES = 3;

export async function proxy(req, res) {
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) {
      console.log(`[${req.id}] Client disconnected; aborting upstream fetch`);
      controller.abort();
    }
  });

  let last;
  for (let a = 0; a < km.keys.length; a++) {
    console.log(`[${req.id}] Forwarding to:`);

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
        body: ["GET", "HEAD"].includes(req.method)
          ? undefined
          : JSON.stringify(req.body),
        duplex: "half",
        signal: controller.signal,
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
          `[${req.id}] Key #${k.id} cooling down for ${config.cooldown} ms`,
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
    } catch (e) {
      if (e.name === "AbortError") {
        console.log(`[${req.id}] Request aborted by client`);
        return;
      }
      console.error(`[${req.id}] Fetch error:`, e);
      k.failures++;
      km.recordFailure();
      lastError = err;
    }
  }
}
