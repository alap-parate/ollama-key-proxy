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
    this.globalStats = {
      totalRequests: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      startTime: Date.now(),
    };
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
        this.globalStats.totalRequests++;
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

  recordSuccess() {
    this.globalStats.totalSuccesses++;
  }

  recordFailure() {
    this.globalStats.totalFailures++;
  }

  stats() {
    return this.keys;
  }

  globalStatsData() {
    const { startTime, ...rest } = this.globalStats;
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const uptime = this.formatUptime(uptimeSeconds);

    return {
      ...rest,
      uptime,
      uptimeSeconds,
      successRate: rest.totalRequests > 0
        ? ((rest.totalSuccesses / rest.totalRequests) * 100).toFixed(2)
        : 0,
    };
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }
}

export default new KeyManager();
