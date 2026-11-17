# Native and provider checks

These are opt-in scripts, separate from JavaScript unit tests and Rust crate tests. They can start owned Windows processes, inspect a real WebView2 surface, or use an installed CLI. Run them only for the behavior being changed.

`npm run test:opencode-replies` requires the Orca CLI and OpenCode 2.3.0. It opens and closes one owned TUI terminal attached to an isolated real server, creates synthetic question forms, and verifies actual replies from the current native host. No model call or user configuration is used. Rebuild the smoke host from current sources first.

| Command | Purpose |
| --- | --- |
| `npm run test:sessions` | Session presentation, restart recovery, Archive, and selected native interaction fixtures. |
| `npm run test:session-opening` | Explicit strip/shortcut opening shows Sessions while fresh requests retain automatic reveal; isolated current-build fixtures only. |
| `npm run test:navigation` | Current-build real Orca switching for Codex/Antigravity hook fixtures and real OpenCode TUI owners, including multiple clients, closed owners, and rejected PTY reuse. Also checks forced local Codex process exit without Orca metadata or a SessionEnd hook. Runs only owned fixtures without model turns. Requires Orca and OpenCode 2.3.0. |
| `npm run test:windows-navigation` | Opens and closes an owned standalone PowerShell console and a two-tab Windows Terminal window. Checks real tab selection, foreground focus, and persisted links using the isolated native app. |
| `npm run test:agent-icons` | Current-build companion geometry, grouped status, hover, reduced motion, and a short WebView2 recording with isolated synthetic sessions. Rejects an executable older than the relevant frontend sources. |
| `npm run test:antigravity-exit` | Owned process lifetime and immediate archive behavior. |
| `npm run test:antigravity-usage` | Quota fixtures, status-line forwarding, cache, and native IPC. |
| `npm run test:observer-upgrade` | Managed observer replacement and legacy-cache recovery. |
| `npm run test:opencode-plugin` | Installed OpenCode server plugin discovery and lifecycle observation. |
| `npm run test:opencode-questions` | Real isolated OpenCode 2.3.0 forms through the observer, Rust bridge, and current WebView2 host: content, choices, automatic attention, dismissal, Settings protection, and disabled Auto-open. No model call. |
| `npm run test:opencode-lifetime` | Coordinated real TUI clients, last-client closure, restart, and resumption. See [the verification record](../../docs/verification/releases/v0.8.4-client-closure.md). |

`npm run test:native` instead builds the bundled helper and runs Rust host unit tests. It does not automatically execute this directory's interactive checks.

`native-harness.cjs` uses private profiles, ports, and fixture databases. Supply `VIBE_ISLAND_TEST_EXE` when selecting an isolated smoke host. A smoke build must use `src-tauri/tauri.smoke.conf.json`; restore a production build before release staging. Do not use the installed user's live bridge or cancel their terminals to make a fixture pass.

Browser/IPC fixture scripts are in [tests/browser](../browser/); JavaScript model tests are in [tests/unit](../unit/). Rust integration tests remain in each crate's direct `tests/` folder so Cargo discovers them. See [contribution guidance](../../CONTRIBUTING.md) for evidence requirements.
