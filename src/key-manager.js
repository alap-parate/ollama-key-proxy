import config from "./config.js";
export class KeyManager {
  constructor() {
    this.keys = config.keys.map((k, i) => ({
      id: i + 1,
      key: k,
      requests: 0,
      successes: 0,
      failures: 0,
      rateLimits: 0,
      lastUsed: null,
      disabledUntil: 0,
    }));
    this.idx = 0;
  }
  next() {
    const now = Date.now();
    for (let i = 0; i < this.keys.length; i++) {
      const n = (this.idx + i) % this.keys.length;
      const k = this.keys[n];
      if (k.disabledUntil <= now) {
        this.idx = (n + 1) % this.keys.length;
        k.requests++;
        k.lastUsed = new Date().toISOString();
        return k;
      }
    }
    throw new Error("No keys available");
  }
  cooldown(k) {
    k.rateLimits++;
    k.failures++;
    k.disabledUntil = Date.now() + config.cooldown;
  }
  stats() {
    return this.keys;
  }
}
export default new KeyManager();
