const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME?.replace(/^v/, '') !== version) throw new Error('Git tag and package version do not match.');
const installers = fs.globSync('src-tauri/target/**/bundle/nsis/*_' + version + '_x64-setup.exe', { cwd: root });
if (installers.length !== 1) throw new Error('Expected exactly one x64 installer for version ' + version);
const output = path.join(root, 'dist');
fs.mkdirSync(output, { recursive: true });
const files = [
  [path.join(root, installers[0]), path.basename(installers[0])],
  [path.join(root, 'src-tauri/binaries/vibe-island-codex-x86_64-pc-windows-msvc.exe'), 'vibe-island-codex.exe'],
  [path.join(root, 'docs/codex-bridge.md'), 'codex-bridge.md'],
  [path.join(root, 'docs/antigravity-exit.md'), 'antigravity-exit.md'],
  [path.join(root, 'docs/antigravity-upgrade-recovery.md'), 'antigravity-upgrade-recovery.md'],
  [path.join(root, 'docs/provider-monitoring-repair.md'), 'provider-monitoring-repair.md'],
  [path.join(root, 'docs/client-closure.md'), 'client-closure.md'],
  [path.join(root, 'LICENSE'), 'LICENSE'],
  [path.join(root, 'THIRD_PARTY_NOTICES.md'), 'THIRD_PARTY_NOTICES.md'],
  [path.join(root, 'src-tauri/TAURI-TEMPLATE-LICENSE'), 'TAURI-TEMPLATE-LICENSE'],
  [path.join(root, 'src/assets/agents/sources/codex-reference-license.txt'), 'codex-reference-license.txt'],
];
const sums = [];
for (const [source, name] of files) {
  const destination = path.join(output, name);
  fs.copyFileSync(source, destination);
  sums.push(crypto.createHash('sha256').update(fs.readFileSync(destination)).digest('hex') + '  ' + name);
}
fs.writeFileSync(path.join(output, 'SHA256SUMS.txt'), sums.join('\n') + '\n');
console.log('Staged Windows installer, standalone adapter, setup guides, and checksums in dist/.');
