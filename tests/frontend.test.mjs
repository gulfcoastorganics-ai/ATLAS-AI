import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
assert.equal(scripts.length, 1, 'ATLAS should maintain one dependency-free inline client script');
new Script(scripts[0][1], { filename: 'atlas-studio-inline.js' });

const ids = [...html.matchAll(/\bid="([A-Za-z][\w-]*)"/g)].map((x) => x[1]);
assert.equal(new Set(ids).size, ids.length, 'DOM IDs must be unique');
for (const [, id] of scripts[0][1].matchAll(/\$\('([A-Za-z][\w-]*)'\)/g)) {
  assert.ok(ids.includes(id), `Client JS references missing element #${id}`);
}
for (const id of [
  'chatTab', 'codeTab', 'fileFilter', 'fileTree', 'codeWorkspace',
  'codeAssistantView', 'codeActivityView', 'codeQuestion', 'codeAskForm',
  'toggleCodeAssistant', 'refreshSource', 'wrapSource', 'jumpLine',
  'jumpButton', 'exportChat', 'settingsDialog', 'inspector', 'thread', 'developerToggle', 'developerModeSetting', 'developerSupportHint'
]) assert.ok(ids.includes(id), `Missing essential ATLAS Studio control: #${id}`);

assert.match(html, /aria-controls="codeWorkspace"/, 'Code tab controls workspace');
assert.match(html, /aria-controls="chatScroll"/, 'Chat tab controls conversation');
assert.match(html, /function submitAtlasMessage\(/, 'Chat and Code must share a request path');
assert.match(html, /codePaneIsDrawer/, 'Assistant panel must support narrow screens');
assert.match(html, /if\(filePath\).*codeQuestion/, 'Code assistant must use selected-file context');
assert.match(html, /ATLAS can make mistakes/, 'Include a model output reliability notice');
assert.ok(!/localStorage\.setItem\(\s*['"](?:atlas-access|access|ATLAS_ACCESS_KEY)/.test(html),
  'Do not persist access credentials');
console.log(`ATLAS Studio frontend checks passed (${ids.length} unique IDs)`);

assert.match(html, /developerMode\s*:\s*developerMode|messages:s\.history\.slice\(-12\),developerMode/, 'Dev mode must be sent to Worker on chat requests');
