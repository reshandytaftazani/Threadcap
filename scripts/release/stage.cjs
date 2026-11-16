const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const metadata = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = metadata.version;
if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME?.replace(/^v/, '') !== version) throw new Error('Git tag and package version do not match.');
const installers = fs.globSync('src-tauri/target/**/bundle/nsis/*_' + version + '_x64-setup.exe', { cwd: root });
if (installers.length !== 1) throw new Error('Expected exactly one x64 installer for version ' + version);
const output = path.join(root, 'dist');
fs.mkdirSync(output, { recursive: true });
const files = [
  [path.join(root, installers[0]), path.basename(installers[0])],
  [path.join(root, 'src-tauri/binaries/vibe-island-codex-x86_64-pc-windows-msvc.exe'), 'vibe-island-codex.exe'],
  [path.join(root, 'docs/integrations/codex.md'), 'codex-bridge.md'],
  [path.join(root, 'docs/verification/releases/v0.8.1-antigravity-exit.md'), 'antigravity-exit.md'],
  [path.join(root, 'docs/verification/releases/v0.8.2-observer-upgrade.md'), 'antigravity-upgrade-recovery.md'],
  [path.join(root, 'docs/verification/releases/v0.8.3-provider-monitoring.md'), 'provider-monitoring-repair.md'],
  [path.join(root, 'docs/verification/releases/v0.8.4-client-closure.md'), 'client-closure.md'],
  [path.join(root, 'LICENSE'), 'LICENSE'],
  [path.join(root, 'THIRD_PARTY_NOTICES.md'), 'THIRD_PARTY_NOTICES.md'],
  [path.join(root, 'src-tauri/TAURI-TEMPLATE-LICENSE'), 'TAURI-TEMPLATE-LICENSE'],
  [path.join(root, 'src/assets/agents/sources/codex-reference-license.txt'), 'codex-reference-license.txt'],
];
const stagedPaths = new Map(files.map(([source, name]) => [path.resolve(source), name]));
const repository = process.env.GITHUB_REPOSITORY
  ? `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${process.env.GITHUB_REPOSITORY}`
  : metadata.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
let revision = process.env.GITHUB_SHA;
if (!revision) {
  try {revision = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();}
  catch {revision = 'main';}
}
function releaseMarkdown(source) {
  return fs.readFileSync(source, 'utf8').replace(/(!?\[[^\]\n]*\]\()([^\s)]+)(\))/g, (link, prefix, target, suffix) => {
    if (/^(?:https?:|mailto:|#)/i.test(target)) return link;
    const split = target.indexOf('#');
    const fragment = split < 0 ? '' : target.slice(split);
    const local = split < 0 ? target : target.slice(0, split);
    const resolved = path.resolve(path.dirname(source), decodeURIComponent(local));
    const staged = stagedPaths.get(resolved);
    if (staged) return `${prefix}${staged}${fragment}${suffix}`;
    const relative = path.relative(root, resolved).replaceAll('\\', '/');
    if (relative.startsWith('../') || path.isAbsolute(relative)) throw new Error('Release documentation link escapes the repository.');
    const kind = fs.statSync(resolved).isDirectory() ? 'tree' : 'blob';
    const encoded = relative.split('/').map(encodeURIComponent).join('/');
    return `${prefix}${repository}/${kind}/${revision}/${encoded}${fragment}${suffix}`;
  });
}
const sums = [];
for (const [source, name] of files) {
  const destination = path.join(output, name);
  if (source.endsWith('.md')) fs.writeFileSync(destination, releaseMarkdown(source));
  else fs.copyFileSync(source, destination);
  sums.push(crypto.createHash('sha256').update(fs.readFileSync(destination)).digest('hex') + '  ' + name);
}
fs.writeFileSync(path.join(output, 'SHA256SUMS.txt'), sums.join('\n') + '\n');
console.log('Staged Windows installer, standalone adapter, setup guides, and checksums in dist/.');
