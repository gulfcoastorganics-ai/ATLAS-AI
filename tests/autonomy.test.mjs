import assert from "node:assert/strict";
import agent from "../worker.js";
import { applyEdits, AutonomyError } from "../autonomy.js";

const ORIGIN = "https://gulfcoastorganics-ai.github.io";
const ORIGINAL = "# ATLAS\n\nReplace this sentence.\n";
const UPDATED = "# ATLAS\n\nUpdated through a reviewed draft.\n";
const BLOB_SHA = "a".repeat(40);
const COMMIT_SHA = "b".repeat(40);
const KEY = "operator-test-key";
const WRITER = "writer-test-key";
const SIGNER = "use-a-long-unique-signing-secret-for-tests-only";
const savedFetch = globalThis.fetch;
let writes = [];
let lastModelMessages;
let mainFileSha = BLOB_SHA;
let branchCreated = false;

const respond = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status, headers: { "Content-Type": "application/json" }
});

globalThis.fetch = async (request, init = {}) => {
  const url = typeof request === "string" ? request : request.url;
  const method = init.method || "GET";
  if (url.startsWith("https://api.github.com/repos/gulfcoastorganics-ai/ATLAS-AI/contents/README.md?ref=")) {
    return respond({ type: "file", encoding: "base64", content: btoa(ORIGINAL), sha: mainFileSha, size: ORIGINAL.length, path: "README.md" });
  }
  if (url.endsWith("/git/ref/heads/main")) return respond({ object: { sha: COMMIT_SHA } });
  if (url.endsWith("/git/refs") && method === "POST") {
    writes.push({ op: "branch", payload: JSON.parse(init.body), token: init.headers.Authorization });
    if (branchCreated) return respond({ message: "Reference already exists" }, 422);
    branchCreated = true; return respond({ ref: "refs/heads/atlas/approved-demo" }, 201);
  }
  if (url.endsWith("/contents/README.md") && method === "PUT") {
    const payload = JSON.parse(init.body);
    writes.push({ op: "file", payload, token: init.headers.Authorization });
    return respond({ commit: { sha: "c".repeat(40) } });
  }
  if (url.endsWith("/pulls") && method === "POST") {
    const payload = JSON.parse(init.body);
    writes.push({ op: "pull", payload, token: init.headers.Authorization });
    return respond({ number: 77, html_url: "https://github.com/gulfcoastorganics-ai/ATLAS-AI/pull/77", draft: true }, 201);
  }
  if (url.includes("reference-index.json")) return respond({schema:1,files:[],chunks:[]});
  throw Error("Unmocked request: " + method + " " + url);
};

const env = {
  ALLOWED_ORIGIN: ORIGIN,
  ATLAS_ACCESS_KEY: KEY,
  GITHUB_TOKEN: "read-token",
  ATLAS_GITHUB_WRITE_TOKEN: WRITER,
  ATLAS_AUTONOMY_SIGNING_KEY: SIGNER,
  AI: { run: async (_model, input) => {
    lastModelMessages = input.messages;
    return { response: JSON.stringify({
      title: "Clarify the introduction",
      summary: "Improve the README introductory sentence.",
      edits: [{ search: "Replace this sentence.", replace: "Updated through a reviewed draft." }]
    })};
  }}
};
const post = async (path, value, key = KEY, origin = ORIGIN) =>
  agent.fetch(new Request("https://atlas.example" + path, {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "X-Atlas-Access-Key": key },
    body: JSON.stringify(value)
  }), env);

try {
  assert.equal(applyEdits(ORIGINAL, [{ search: "Replace this sentence.", replace: "Updated through a reviewed draft." }]), UPDATED);
  assert.throws(() => applyEdits("duplicate duplicate", [{ search: "duplicate", replace: "okay" }]), AutonomyError);

  const health = await agent.fetch(new Request("https://atlas.example/health", { headers: { Origin: ORIGIN } }), env);
  const healthBody = await health.json();
  assert.equal(health.status, 200);
  assert.equal(healthBody.writesEnabled, false);
  assert.equal(healthBody.autonomy.supported, true);
  assert.equal(healthBody.autonomy.approvalRequired, true);

  const task = "Clarify the README introduction with a better first sentence.";
  let response = await post("/autonomy/propose", { path: "README.md", task, policy: "plan" });
  assert.equal(response.status, 200);
  let body = await response.json();
  assert.equal(body.canApprove, false);
  assert.equal(body.after, UPDATED);
  assert.equal(body.proposal.policy, "plan");
  assert.equal(writes.length, 0, "Plan-only mode must not write anything");
  assert.match(lastModelMessages[0].content, /UNTRUSTED DATA/);

  response = await post("/autonomy/apply", { proposal: body.proposal, signature: body.signature });
  assert.equal(response.status, 400, "Plan-only proposal cannot be approved");

  response = await post("/autonomy/propose", { path: ".github/workflows/deploy-worker.yml", task, policy: "review" });
  assert.equal(response.status, 400, "Protected paths must be rejected");

  response = await post("/autonomy/propose", { path: "README.md", task, policy: "review" }, "wrong-key");
  assert.equal(response.status, 401, "Incorrect operator key denied");
  response = await post("/autonomy/propose", { path: "README.md", task, policy: "review" }, KEY, "https://attacker.example");
  assert.equal(response.status, 403, "Incorrect origin denied");

  response = await post("/autonomy/propose", { path: "README.md", task, policy: "review" });
  assert.equal(response.status, 200);
  body = await response.json();
  assert.equal(body.canApprove, true);
  assert.equal(body.before, ORIGINAL);
  assert.equal(body.after, UPDATED);
  assert.equal(writes.length, 0, "Preview must not modify GitHub");
  const approved = body;

  response = await post("/autonomy/apply", {
    proposal: { ...approved.proposal, title: "Forged approval" },
    signature: approved.signature
  });
  assert.equal(response.status, 403, "Tampered proposals must fail signature verification");
  assert.equal(writes.length, 0);

  mainFileSha = "d".repeat(40);
  response = await post("/autonomy/apply", { proposal: approved.proposal, signature: approved.signature });
  assert.equal(response.status, 409, "Source SHA drift must invalidate approval");
  assert.equal(writes.length, 0);
  mainFileSha = BLOB_SHA;

  response = await post("/autonomy/apply", { proposal: approved.proposal, signature: approved.signature });
  assert.equal(response.status, 200);
  const outcome = await response.json();
  assert.equal(outcome.status, "draft_pr_created");
  assert.equal(outcome.draft, true);
  assert.equal(writes.length, 3);
  assert.deepEqual(writes.map(x => x.op), ["branch", "file", "pull"]);
  assert.equal(writes[0].payload.sha, COMMIT_SHA);
  assert.equal(writes[1].payload.branch, outcome.branch);
  assert.notEqual(writes[1].payload.branch, "main");
  assert.equal(writes[1].token, "Bearer " + WRITER);
  assert.equal(atob(writes[1].payload.content), UPDATED);
  assert.equal(writes[2].payload.draft, true);
  assert.equal(writes[2].payload.base, "main");
  assert.equal(writes[2].payload.head, outcome.branch);

  response = await post("/autonomy/apply", { proposal: approved.proposal, signature: approved.signature });
  assert.notEqual(response.status, 200, "Branch creation guards against replay");

  const oldWrite = env.ATLAS_GITHUB_WRITE_TOKEN;
  delete env.ATLAS_GITHUB_WRITE_TOKEN;
  response = await post("/autonomy/apply", { proposal: approved.proposal, signature: approved.signature });
  assert.equal(response.status, 503, "Write access must remain disabled without the dedicated secret");
  env.ATLAS_GITHUB_WRITE_TOKEN = oldWrite;

  console.log("ATLAS autonomous approval tests passed (no direct main writes).");
} finally {
  globalThis.fetch = savedFetch;
}
