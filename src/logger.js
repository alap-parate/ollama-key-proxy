import { randomUUID } from "node:crypto";
import config from "./config.js";

const LOGGED_ROUTES = ["/health", "/metrics", "/dashboard", "/"];

export function logger(req, res, next) {
  const excludedPaths = ["/health", "/metrics", "/dashboard"];
  if (excludedPaths.includes(req.originalUrl)) {
    return next();
  }

  const id = randomUUID().slice(0, 8);
  const start = process.hrtime.bigint();
  const debug = process.env.DEBUG === "true";

  req.id = id;

  if (debug) {
    console.log("=".repeat(80));
    console.log(`[${id}] --> ${req.method} ${req.originalUrl}`);
    console.log(`[${id}] IP          : ${req.ip}`);
    console.log(`[${id}] User-Agent  : ${req.get("user-agent") ?? "-"}`);
    console.log(`[${id}] Content-Type: ${req.get("content-type") ?? "-"}`);
    console.log(`[${id}] Headers:`);
    console.dir(req.headers, { depth: null, colors: true });

    if (req.body && Object.keys(req.body).length > 0) {
      console.log(`[${id}] Body:`);
      console.dir(req.body, {
        depth: null,
        colors: true,
        maxArrayLength: null,
      });
    }
  } else {
    console.log(`[${id}] ${req.method} ${req.originalUrl}`);
  }

  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - start) / 1_000_000;
    const msg = `[${id}] <-- ${res.statusCode} (${duration.toFixed(2)} ms)`;

    if (debug) {
      console.log(msg);
      console.log("=".repeat(80));
      console.log();
    } else {
      console.log(`${msg} ${req.method} ${req.originalUrl}`);
    }
  });

  next();
}
