# ATLAS AI — Cloud-first AI starter

ATLAS is an independent browser-based AI assistant inspired by high-level agent design patterns. It does not incorporate Claude model weights, proprietary source code or copied system instructions.

## Current features
- Responsive browser chat deployed through GitHub Pages
- Demo mode
- Live AI via Cloudflare Workers AI binding, with no third-party AI API key
- Model: `@cf/google/gemma-4-26b-a4b-it` (currently supported on Cloudflare Workers Free)
- Basic request validation, CORS restriction and per-IP approximate rate limiting

## Deploy entirely in the browser
1. Frontend: GitHub repository **Settings → Pages → Deploy from a branch → main / root**.
2. Open [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages → Create application → Worker**.
3. Create a Worker named `atlas-agent-api`, then use **Edit code** to replace its starter code with this repository's `worker.js` and deploy.
4. In Worker **Settings → Bindings**, add a **Workers AI** binding with variable name `AI` and deploy.
5. In Worker **Settings → Variables and Secrets**, add plain-text variable:
   `ALLOWED_ORIGIN=https://gulfcoastorganics-ai.github.io`
6. For better abuse protection, add a Rate Limiting binding named `CHAT_RATE_LIMITER` (10 requests per 60 seconds per IP). If deploying through Wrangler, `wrangler.toml` already declares the AI and rate limit bindings. If setting up manually through dashboard, configure them there.
7. Copy the Worker URL (`https://atlas-agent-api.<subdomain>.workers.dev`). In the ATLAS web page enter it without a trailing slash, choose **Live AI**, and send a message.

## Cost and security
Cloudflare Workers AI has a free daily neuron allocation, which can change; verify its current terms. Free-plan traffic exceeding the daily allocation fails rather than generating usage fees. Some models require a paid plan; the chosen model is currently listed as free-plan supported.

**This is a public prototype, not an authenticated private assistant.** Origin validation alone is not authentication; a forged request can supply the same Origin header. Add Cloudflare Access or other authentication before enabling private data, paid usage, or GitHub-write tools. Rate limiting is best-effort and not a substitute for authentication or provider-level spend limits. Never put any API keys in browser code.

## Roadmap
Authenticated accounts, persistent memory, GitHub tool integration, sandboxed execution, task planning and approvals, and multi-agent coding workflows.

Reference research: https://github.com/elder-plinius/CL4R1T4S
