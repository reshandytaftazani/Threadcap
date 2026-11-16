const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const files = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {cwd: root, encoding: 'utf8'}).split('\0').filter(Boolean))];
const included = new Set(files.map(name => name.replaceAll('\\', '/')));
const errors = [];
const report = (file, reason) => errors.push(`${file}: ${reason}`);
for (const required of ['LICENSE', 'README.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CHANGELOG.md', 'THIRD_PARTY_NOTICES.md', 'docs/guides/capabilities.md', 'docs/development/publishing.md', 'docs/development/repository-layout.md', '.github/workflows/windows.yml', 'crates/codex-bridge/tests/adapter.rs', 'crates/codex-bridge/tests/antigravity_process.rs', 'crates/codex-bridge/tests/client_process.rs']) {
  if (!included.has(required)) report(required, 'required publication file missing');
}
const sensitivePath = /(?:^|\/)(?:artifacts|dist|node_modules|target|__pycache__|\.venv)(?:\/|$)|(?:^|\/)\.env(?:\..*)?$|\.(?:sqlite3?(?:-(?:wal|shm))?|db|pem|pfx|p12|key|pyc|exe|log)$/i;
const privateContent = [
  ['personal Windows path', /[A-Z]:[\\/]+Users[\\/]+(?!Public(?:[\\/]|$)|<|\$|%)[^\s<>"']+/i],
  ['machine-specific workspace', /[A-Z]:[\\/]+vibe-island-windows/i],
  ['private conversation URI', /conversation:\/\/|chatgpt\.com\/c\//i],
  ['private key material', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['credential in URL', /https?:\/\/[^\s/@:]+:[^\s/@]+@/i],
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,})\b/],
  ['API key', /\b(?:sk-(?:proj-|svcacct-|ant-)?[A-Za-z0-9_-]{32,}|AIza[A-Za-z0-9_-]{30,}|AKIA[A-Z0-9]{16})\b/],
];
function sourceReference(file, target, base = path.dirname(path.join(root, file))) {
  const resolved = path.resolve(base, target);
  const relative = path.relative(root, resolved).replaceAll('\\', '/');
  if (relative.startsWith('../') || !included.has(relative)) report(file, `source reference missing from repository: ${target}`);
}
for (const file of files) {
  const relative = file.replaceAll('\\', '/');
  if (sensitivePath.test(relative) && relative !== '.env.example') report(relative, 'local/generated/sensitive file included');
  const full = path.join(root, file);
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {report(relative, 'missing source file');continue;}
  if (fs.statSync(full).size > 5 * 1024 * 1024) {report(relative, 'unexpected large source file; review before publication');continue;}
  if (!/\.(?:md|txt|json|toml|lock|ya?ml|js|cjs|css|html|rs|py|ps1|nsi|svg)$/.test(relative) && !['LICENSE', '.gitignore'].includes(relative)) continue;
  const text = fs.readFileSync(full, 'utf8');
  for (const [reason, expression] of privateContent) if (expression.test(text)) report(relative, reason);
  if (/\.(?:cjs|js)$/.test(relative)) {
    for (const match of text.matchAll(/require\(['"](\.\.?\/[^'"]+)['"]\)/g)) sourceReference(relative, match[1]);
  }
  if (relative.endsWith('.rs')) {
    for (const match of text.matchAll(/include_(?:str|bytes)!\(\s*"([^"]+)"\s*\)/g)) sourceReference(relative, match[1]);
  }
  if (relative.endsWith('.html')) {
    for (const match of text.matchAll(/(?:href|src)="([^"<>]+)"/g)) {
      const target = match[1].split(/[?#]/)[0];
      if (!target || /^(?:https?:|data:|javascript:|\$\{)/i.test(target) || target.includes('${')) continue;
      sourceReference(relative, target.startsWith('/') ? target.slice(1) : target, target.startsWith('/') ? path.join(root, 'src') : path.dirname(full));
    }
  }
  if (!relative.endsWith('.md')) continue;
  for (const match of text.matchAll(/!?\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, '').split(/\s+"/)[0];
    if (/^(?:https?:|mailto:|#)/i.test(target)) continue;
    const destination = decodeURIComponent(target.split('#')[0]);
    if (!destination) continue;
    const resolved = path.resolve(path.dirname(full), destination);
    const local = path.relative(root, resolved).replaceAll('\\', '/');
    if (local.startsWith('..') || path.isAbsolute(local)) {report(relative, 'link escapes repository');continue;}
    if (!fs.existsSync(resolved)) report(relative, `missing local link: ${destination}`);
    else if (fs.statSync(resolved).isFile() && !included.has(local)) report(relative, `link points to excluded file: ${destination}`);
  }
}
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const tauri = JSON.parse(fs.readFileSync(path.join(root, 'src-tauri/tauri.conf.json'), 'utf8'));
for (const command of Object.values(pkg.scripts)) {
  for (const match of command.matchAll(/\b(?:node|python)\s+([\w./-]+\.(?:cjs|js|py))|\s-File\s+([\w./-]+\.ps1)/g)) sourceReference('package.json', match[1] || match[2], root);
}
for (const command of [tauri.build.beforeDevCommand, tauri.build.beforeBuildCommand]) {
  const target = command.match(/^node ([\w./-]+)$/)?.[1];
  if (target) sourceReference('src-tauri/tauri.conf.json', target, root);
}
if (pkg.license !== 'MIT' || lock.packages[''].license !== 'MIT') report('package.json', 'license metadata does not match LICENSE');
if (pkg.version !== lock.version || pkg.version !== tauri.version) report('package.json', 'release versions disagree');
if (errors.length) {for (const error of errors) console.error(error);process.exitCode = 1;}
else console.log(`Checked ${files.length} publication files: local links, source references, metadata, excluded files, and selected sensitive-content patterns passed. This is not a comprehensive secret or security audit.`);
