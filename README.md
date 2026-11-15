# ATLAS AI v0.2 — Cloud Agent Runtime

Live frontend: https://gulfcoastorganics-ai.github.io/ATLAS-AI/

**What this actually is:** A cloud-hosted agent powered by Cloudflare Workers AI, with searchable reference access to the complete imported [CL4R1T4S](https://github.com/elder-plinius/CL4R1T4S) archive and working **read-only** GitHub integration. It does **not** include Claude's model weights, Anthropic's executable proprietary runtime, a shell sandbox, or repository write capabilities.

## Repository structure

| Path | Purpose |
|---|---|
| `external/CL4R1T4S/` | Complete upstream snapshot; retained intact |
| `reference-index.json` | Generated searchable chunk index of all supported text files |
| `scripts/build_reference_index.py` | Builds the chunk index using Python standard library |
| `worker.js` | Cloudflare agent runtime with hosted inference and tool dispatch |
| `index.html` | GitHub Pages browser client; shows tool traces and archive search |
| `tests/worker.test.mjs` | Mocked Worker tests |
| `.github/workflows/index-reference.yml` | Regenerate the reference index when upstream changes |
| `.github/workflows/deploy-worker.yml` | Manually deploy Worker via GitHub Actions |
| `UPSTREAM_SOURCE.md` | Upstream import provenance and reuse caution |

## Implemented features

1. **Hosted inference:** `env.AI.run("@cf/google/gemma-4-26b-a4b-it")` through a Workers AI binding.
2. **Reference retrieval:** A 1,600-character chunk index covers each supported text file. Every query searches the catalog and loads bounded relevant excerpts from the imported repository. Full archive files are preserved separately and fetched only when needed.
3. **Agent loop:** Up to 3 model tool steps with 2 tool calls per step, plus a final answer. Tool activity is shown in the browser.
4. **Functioning read-only tools:** `search_reference`, `read_reference`, `github_list`, `github_read`.
5. **Access protection:** A server-side operator key, origin validation, request constraints, and optional Cloudflare rate limiting.
6. **Automated validation:** Node.js mocked Worker tests, JavaScript syntax checks and reference-index checks via GitHub Actions.

## Zero-install deployment

### Step 1: Browser frontend — already hosted by GitHub Pages
Repository **Settings → Pages → main / (root)**.

### Step 2: Create a Cloudflare Worker in your web browser
1. Go to https://dash.cloudflare.com/ → **Workers & Pages → Create → Worker**.
2. Name the Worker `atlas-agent-api`.
3. Open **Edit code**. Replace the default script with the contents of `worker.js` and deploy.
4. Go to Worker **Settings → Bindings → Add binding → Workers AI** and set the binding name to `AI`.
5. Go to **Settings → Variables and Secrets**. Add an encrypted **secret**, named `ATLAS_ACCESS_KEY`, whose value is a long, unique random string of your choosing.
6. Add a plain-text variable `ALLOWED_ORIGIN` with value `https://gulfcoastorganics-ai.github.io`.
7. Optionally add a Cloudflare Rate Limiting binding `CHAT_RATE_LIMITER` with 10 requests per 60 seconds. If deploying with the project's `wrangler.toml`, this binding is declared already.
8. Deploy your Worker and copy the `https://...workers.dev` URL. At your ATLAS GitHub Pages site, enter that URL and **the operator key you created**. Choose **Live agent**, then press **Check Worker**.

**Never send your access key in ChatGPT or commit it to GitHub.** Keep it only in Cloudflare encrypted secrets and the browser input when you use ATLAS. The interface does not save this secret.

### Alternative: One-click GitHub Actions cloud deploy
After adding the GitHub repository encrypted secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` with appropriately scoped Cloudflare deploy permissions, run **Actions → Deploy ATLAS Worker to Cloudflare → Run workflow**. The `AI` and rate limiting bindings are read from `wrangler.toml`. Set `ATLAS_ACCESS_KEY` as an encrypted Cloudflare Worker secret separately. This does not require installing software locally.

### Check that it works
- `GET /health` from ATLAS browser via **Check Worker** should report `0.2.0`, `aiConfigured=true`, `accessKeyConfigured=true`.
- **Search archive** should find filenames and excerpts using `POST /search`.
- Ask: **"Find the Agent tool description in the imported Claude Code Fable 5.2 archive and summarize how delegation works."**
- Ask: **"Use github_list to inspect the root of the ATLAS-AI repository."**
- Expand **Agent activity** to see tool calls.

## Security and limitations

- **Imported archive files are untrusted data.** ATLAS does not execute or adopt their instructions. Any license on the upstream repository does not necessarily grant redistribution rights to all third-party extracted content. Evaluate before commercial use.
- GitHub read-only tools are pinned to the single public repository `gulfcoastorganics-ai/ATLAS-AI`. They do not use account tokens or write files, open issues or deploy.
- The browser frontend is public; the server-side operator key is essential to prevent anonymous paid/free inference misuse. A shared key is a **single-user prototype mechanism**, not a production identity or authorization system.
- The Cloudflare rate limiting binding is approximate. Model usage may still reach provider quotas; add access control and billing limits before inviting other users.
- Retrieval uses lightweight keyword scoring. It is not semantic embeddings, and some relevant excerpts may be missed.
- There is no durable server-side conversation storage; chat history lives in the open browser tab.
- The Cloudflare Worker is **not deployed just because its source is pushed to GitHub**.

## Next milestones

1. Scoped multiuser login + permissions / Cloudflare Access.
2. Approval-gated, auditable GitHub write operations using a narrowly scoped GitHub App.
3. Isolated cloud sandbox for actual code execution and tests.
4. Semantic embeddings, incremental indexing and persistent task state.
5. Specialized skills, reusable workflows, and multi-agent coordination.

Cloudflare model reference: https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/
