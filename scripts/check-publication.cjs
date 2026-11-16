const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const files = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {cwd: root, encoding: 'utf8'}).split('\0').filter(Boolean))];
const included = new Set(files.map(name => name.replaceAll('\\', '/')));
const errors = [];
const report = (file, reason) => errors.push(`${file}: ${reason}`);
for (const required of ['LICENSE', 'README.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CHANGELOG.md', 'THIRD_PARTY_NOTICES.md', 'docs/capabilities.md', 'docs/publishing.md', '.github/workflows/windows.yml']) {
  if (!included.has(required)) report(required, 'required publication file missing');
}
const sensitivePath = /(?:^|\/)(?:artifacts|dist|node_modules|target|__pycache__|\.venv)(?:\/|$)|(?:^|\/)\.env(?:\..*)?$|\.(?:sqlite3?(?:-(?:wal|shm))?|db|pem|pfx|p12|key|pyc|exe|log)$/i;
const privateContent = [
  ['personal Windows path', /[A-Z]:[\\/]+Users[\\/]+(?!Public(?:[\\/]|$)|<|\$|%)[^\s<>"']+/i],
  ['machine-specific workspace', /[A-Z]:[\\/]+vibe-island-windows/i],
  ['private conversation URI', /conversation:\/\/|chatgpt\.com\/c\//i],
  ['private key material', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ['provider secret', /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{40,}\b/],
  ['credential in URL', /https?:\/\/[^\s/@:]+:[^\s/@]+@/i],
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,})\b/],
  ['API key', /\b(?:sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}|AIza[A-Za-z0-9_-]{30,}|AKIA[A-Z0-9]{16})\b/],
  ['private key block', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
];
for (const file of files) {
  const relative = file.replaceAll('\\', '/');
  if (sensitivePath.test(relative) && relative !== '.env.example') report(relative, 'local/generated/sensitive file included');
  const full = path.join(root, file);
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {report(relative, 'missing source file');continue;}
  if (fs.statSync(full).size > 5 * 1024 * 1024) {report(relative, 'unexpected large source file; review before publication');continue;}
  if (!/\.(?:md|txt|json|toml|lock|ya?ml|js|cjs|css|html|rs|py|ps1|nsi|svg)$/.test(relative) && !['LICENSE', '.gitignore'].includes(relative)) continue;
  const text = fs.readFileSync(full, 'utf8');
  for (const [reason, expression] of privateContent) if (expression.test(text)) report(relative, reason);
  if (!relative.endsWith('.md')) continue;
  for (const match of text.matchAll(/!?\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, '').split(/\s+"/)[0];
    if (/^(?:https?:|mailto:|#)/i.test(target)) continue;
    const destination = decodeURIComponent(target.split('#')[0]);
    if (!destination) continue;
    const resolved = path.resolve(path.dirname(full), destination);
    const local = path.relative(root, resolved).replaceAll('\\', '/');
    if (local.startsWith('../') || path.isAbsolute(local)) {report(relative, 'link escapes repository');continue;}
    if (!fs.existsSync(resolved)) report(relative, `missing local link: ${destination}`);
    else if (fs.statSync(resolved).isFile() && !included.has(local)) report(relative, `link points to excluded file: ${destination}`);
  }
}
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const tauri = JSON.parse(fs.readFileSync(path.join(root, 'src-tauri/tauri.conf.json'), 'utf8'));
if (pkg.license !== 'MIT' || lock.packages[''].license !== 'MIT') report('package.json', 'license metadata does not match LICENSE');
if (pkg.version !== lock.version || pkg.version !== tauri.version) report('package.json', 'release versions disagree');
if (errors.length) {for (const error of errors) console.error(error);process.exitCode = 1;}
else console.log(`Checked ${files.length} publication files: local links, metadata, excluded files, and selected sensitive-content patterns passed. This is not a comprehensive secret or security audit.`);
