# ATLAS AI — Cloud-first agent starter

ATLAS is an original, browser-based AI assistant starter inspired by agent architecture concepts. It does **not** contain Claude's model, proprietary code, or copied system instructions.

## Features
- Responsive browser chat
- Demo mode without an API key
- Optional Cloudflare Worker backend using OpenRouter
- Server-side API secret (never commit it)
- Basic origin and input validation

## Deploy without installing anything
1. In GitHub, go to **Settings → Pages**, choose **Deploy from a branch**, and select **main / root**.
2. Open the published Pages URL. Demo mode works immediately.
3. To enable live AI, create a Cloudflare Worker in the browser dashboard and paste **worker.js** into it.
4. In Worker settings add encrypted secret **OPENROUTER_API_KEY**, variable **ALLOWED_ORIGIN=https://gulfcoastorganics-ai.github.io**, and optionally **MODEL_ID** (the OpenRouter model you can access).
5. Deploy the Worker. Paste its URL into the ATLAS interface and select Live mode.

## Important
This is a prototype, **not** an autonomous agent. It has no filesystem, shell, or GitHub execution tools. A CORS origin check is not authentication. Before publishing a paid API endpoint, add authentication, rate limiting, abuse controls and spending caps.

Research reference: https://github.com/elder-plinius/CL4R1T4S
