const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

if (process.platform !== 'win32') throw new Error('The packaged Codex hook adapter currently targets Windows.');
const root = path.resolve(__dirname, '../..');
const host = execFileSync('rustc', ['-vV'], { encoding: 'utf8' }).match(/^host: (.+)$/m)?.[1];
const target = process.env.TAURI_ENV_TARGET_TRIPLE || process.env.CARGO_BUILD_TARGET || host;
if (!target?.endsWith('windows-msvc')) throw new Error('Use the Windows MSVC target for this desktop build.');
const targetDirectory = path.resolve(process.env.CARGO_TARGET_DIR || path.join(root, 'crates/codex-bridge/target'));
execFileSync('cargo', ['build', '--locked', '--release', '--manifest-path', path.join(root, 'crates/codex-bridge/Cargo.toml'), '--target-dir', targetDirectory, '--target', target], { stdio: 'inherit' });
const output = path.join(root, 'src-tauri/binaries');
fs.mkdirSync(output, { recursive: true });
fs.copyFileSync(path.join(targetDirectory, target, 'release/vibe-island-codex.exe'), path.join(output, 'vibe-island-codex-' + target + '.exe'));
console.log('Prepared Codex adapter for ' + target);
