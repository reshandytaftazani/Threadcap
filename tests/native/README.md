# Native and provider checks

These are opt-in scripts, separate from JavaScript unit tests and Rust crate tests. They can start owned Windows processes, inspect a real WebView2 surface, or use an installed CLI. Run them only for the behavior being changed.

| Command | Purpose |
| --- | --- |
| `npm run test:sessions` | Session presentation, restart recovery, Archive, and selected native interaction fixtures. |
| `npm run test:antigravity-exit` | Owned process lifetime and immediate archive behavior. |
| `npm run test:antigravity-usage` | Quota fixtures, status-line forwarding, cache, and native IPC. |
| `npm run test:observer-upgrade` | Managed observer replacement and legacy-cache recovery. |
| `npm run test:opencode-plugin` | Installed OpenCode server plugin discovery and lifecycle observation. |
| `npm run test:opencode-lifetime` | Coordinated real TUI clients, last-client closure, restart, and resumption. See [the verification record](../../docs/verification/releases/v0.8.4-client-closure.md). |

`npm run test:native` instead builds the bundled helper and runs Rust host unit tests. It does not automatically execute this directory's interactive checks.

`native-harness.cjs` uses private profiles, ports, and fixture databases. Supply `VIBE_ISLAND_TEST_EXE` when selecting an isolated smoke host. A smoke build must use `src-tauri/tauri.smoke.conf.json`; restore a production build before release staging. Do not use the installed user's live bridge or cancel their terminals to make a fixture pass.

Browser/IPC fixture scripts are in [tests/browser](../browser/); JavaScript model tests are in [tests/unit](../unit/). Rust integration tests remain in each crate's direct `tests/` folder so Cargo discovers them. See [contribution guidance](../../CONTRIBUTING.md) for evidence requirements.
