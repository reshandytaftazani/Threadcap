# Provider integration sources

These files supply CLI-side observers and an optional task wrapper. The native helper, shared cache, and setup implementation live in [crates/codex-bridge](../crates/codex-bridge/) with host commands in `src-tauri/`.

| Provider | Source | Role |
| --- | --- | --- |
| Codex | `crates/codex-bridge/src/state.rs` and native hook setup | Monitoring through official hooks after manual Codex trust review. There is no separate JavaScript plugin. |
| Antigravity | Native helper modules plus [watch.ps1](antigravity/watch.ps1) | Connect uses the native observer. The PowerShell wrapper is optional and starts a real CLI task when invoked. |
| OpenCode | [server.js](opencode/server.js) and [tui.js](opencode/tui.js) | Source templates embedded by the Rust helper for monitoring and exact local TUI lifetime observation. |

Use [current capabilities](../docs/guides/capabilities.md) and [getting started](../docs/guides/getting-started.md) for supported versions and setup. Source-directory moves do not change the user's installed plugin paths, hook tags, or helper executable names. Monitoring does not enable approval or answer delivery.
