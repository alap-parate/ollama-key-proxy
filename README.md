# Ollama/OpenAI Key Proxy

- Round robin API key rotation
- Retries on 429/5xx
- Per-key cooldown
- /health
- /metrics

Run:
npm install
cp .env.example .env
npm start
