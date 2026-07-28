import { randomUUID } from "node:crypto";

export function logger(req, res, next) {
  const id = randomUUID().slice(0, 8);
  const start = process.hrtime.bigint();

  req.id = id;

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

  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - start) / 1_000_000;

    console.log(`[${id}] <-- ${res.statusCode} (${duration.toFixed(2)} ms)`);
    console.log("=".repeat(80));
    console.log();
  });

  next();
}
