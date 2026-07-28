# Ollama/OpenAI Key Proxy

A lightweight reverse proxy that automatically manages multiple API keys for Ollama-compatible or OpenAI-compatible endpoints. It provides automatic failover, retries, and key rotation so clients can continue making requests even when individual keys are rate limited.

## Features

- 🔄 Round-robin API key rotation
- ♻️ Automatic retries on `429` and `5xx` responses
- ❄️ Per-key cooldown after rate limits
- ❤️ Health endpoint (`/health`)
- 📊 Metrics endpoint (`/metrics`)
- 🚀 Drop-in replacement for OpenAI/Ollama-compatible APIs
- 🤖 Works with Claude Code, OpenAI SDKs, and any compatible client

## Installation

```bash
git clone https://github.com/alap-parate/ollama-key-proxy.git
cd ollama-key-proxy

npm install
cp .env.example .env
npm start
```

The proxy runs on:

```
http://localhost:4000
```

---

## Claude Code Configuration

Configure Claude Code to use the proxy by creating:

`.claude/settings.json`

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "env": {
    "ANTHROPIC_BASE_URL": "http://localhost:4000",
    "ANTHROPIC_AUTH_TOKEN": "ollama",

    "ANTHROPIC_MODEL": "minimax-m2.5:cloud",
    "ANTHROPIC_SMALL_FAST_MODEL": "minimax-m2.5:cloud",

    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    "CLAUDE_CODE_ENABLE_TELEMETRY": "0",

    "ENABLE_LSP_TOOL": "1"
  },
  "enabledPlugins": {
    "typescript-lsp@claude-plugins-official": true
  }
}
```

---

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `/health` | Proxy health status and API key availability |
| `/metrics` | Request statistics, retries, and key usage |

---

## How It Works

1. Incoming requests are assigned an API key using round-robin scheduling.
2. If a request receives a `429` or `5xx` response:
   - The key enters a cooldown period.
   - The request is retried with the next available key.
3. Requests continue until:
   - One succeeds, or
   - All keys have been exhausted.

This minimizes downtime caused by rate limits or temporary upstream failures.

---

## Use Cases

- Claude Code
- OpenAI-compatible SDKs
- Ollama Cloud
- Minimax Cloud
- AI applications requiring multiple API keys
- High-throughput workloads

---

## License

MIT
