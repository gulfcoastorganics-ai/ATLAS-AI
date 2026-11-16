import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";

const html = readFileSync(new URL("../autonomy.html", import.meta.url), "utf8");
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(script.length, 1, "Keep one self-contained autonomy client script");
new Script(script[0][1], { filename: "atlas-autonomy-inline.js" });

const ids = [...html.matchAll(/\bid="([A-Za-z][\w-]*)"/g)].map(m => m[1]);
assert.equal(ids.length, new Set(ids).size, "Autonomy DOM IDs must be unique");
for(const [, id] of script[0][1].matchAll(/\$\('([A-Za-z][\w-]*)'\)/g)){
  assert.ok(ids.includes(id), "Client references a missing element: #" + id);
}
for(const id of ["autonomyToggle","endpoint","access","policy","targetPath","task",
  "generate","review","before","after","approved","apply","result","availability"]){
  assert.ok(ids.includes(id), "Missing autonomy control #" + id);
}
assert.match(html, /aria-checked="false"/, "Mode must default to disabled");
assert.match(html, /value="plan"/, "Plan-only approval policy required");
assert.match(html, /value="review"/, "Review-every-change policy required");
assert.match(script[0][1], /\/autonomy\/propose/, "Proposals must use protected Worker endpoint");
assert.match(script[0][1], /\/autonomy\/apply/, "Approved changes must use protected Worker endpoint");
assert.match(script[0][1], /confirm\(/, "A separate explicit apply confirmation is required");
assert.ok(!/localStorage\.setItem\(\s*['"](?:access|ATLAS_ACCESS_KEY|GITHUB_TOKEN)/.test(html),
  "Credentials must never be persisted in localStorage");
assert.match(html, /draft pull request/i);
assert.match(html, /No direct push to main|no direct writes to main|There is no direct push to main/i);
console.log("ATLAS autonomous workspace frontend checks passed.");
