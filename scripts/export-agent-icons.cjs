// Export standalone marks from the same geometry used by the island.
const fs = require('node:fs');
const path = require('node:path');
global.window = {};
require('../src/avatars.js');
for (const name of ['codex', 'antigravity', 'opencode', 'unknown']) {
  const markup = window.IslandAvatars.render(name, 'idle', true).match(/<svg[\s\S]*<\/svg>/)[0];
  const svg = markup.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  fs.writeFileSync(path.join(__dirname, '..', 'src', 'assets', 'agents', name + '.svg'), svg + '\n');
}
process.stdout.write('Exported four brand-based pixel marks.\n');
