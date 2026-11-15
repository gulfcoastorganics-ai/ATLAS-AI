import assert from "node:assert/strict";
import agent from "../worker.js";

const ORIGIN = "https://gulfcoastorganics-ai.github.io";
const TEST_INDEX = {
  schema: 1,
  files: [{path:"ANTHROPIC/CLAUDE-CODE-FABLE-5.2.txt",bytes:200}],
  chunks: [{path:"ANTHROPIC/CLAUDE-CODE-FABLE-5.2.txt",offset:0,length:180,terms:["agent","tool","orchestration","claude"],snippet:"Sample agent tool orchestration excerpt"}]
};

const originalFetch = globalThis.fetch;
let modelCalls = 0;
globalThis.fetch = async (input) => {
  const url = String(input);
  if (url.includes("reference-index.json")) return Response.json(TEST_INDEX);
  if (url.startsWith("https://raw.githubusercontent.com/")) return new Response("Agent tool orchestration is discussed here as archival data.");
  if (url.startsWith("https://api.github.com/repos/")) return Response.json([
    {name:"README.md",path:"README.md",type:"file",size:20,html_url:"https://github.com/example/readme"}
  ]);
  throw new Error("Unexpected network destination " + url);
};

const env = {
  ALLOWED_ORIGIN: ORIGIN,
  ATLAS_ACCESS_KEY: "unit-test-private-key",
  AI: {run: async () => {
    modelCalls++;
    if (modelCalls === 1) return {tool_calls:[{name:"github_list",arguments:{path:""}}]};
    return {response:"I found the relevant reference and listed the repository."};
  }}
};
const post = (path, body, key = env.ATLAS_ACCESS_KEY) =>
  agent.fetch(new Request("https://worker.example"+path,{
    method:"POST",
    headers:{"Origin":ORIGIN,"Content-Type":"application/json","X-Atlas-Access-Key":key},
    body:JSON.stringify(body)
  }),env);
try {
  let response = await post("/search",{query:"claude agent tool orchestration"});
  assert.equal(response.status,200);
  let body = await response.json();
  assert.equal(body.totalFiles,1);
  assert.equal(body.matches[0].path,"ANTHROPIC/CLAUDE-CODE-FABLE-5.2.txt");

  response = await post("/chat",{messages:[{role:"user",content:"How does Claude agent tool orchestration work?"}]});
  assert.equal(response.status,200);
  body = await response.json();
  assert.match(body.reply,/listed the repository/);
  assert.ok(body.trace.some(t=>t.tool==="github_list"));
  assert.ok(body.trace.some(t=>t.tool==="auto_reference"));
  assert.equal(modelCalls,2);

  response = await post("/search",{query:"hello"},"bad-token");
  assert.equal(response.status,401);
  response = await agent.fetch(new Request("https://worker.example/health",{headers:{"Origin":ORIGIN}}),env);
  assert.equal(response.status,200);
  assert.equal((await response.json()).writesEnabled,false);
  console.log("All ATLAS agent tests passed.");
} finally {globalThis.fetch=originalFetch;}
