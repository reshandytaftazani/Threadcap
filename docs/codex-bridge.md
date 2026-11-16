# Codex CLI bridge

Version 0.8.3 uses the encoded PowerShell launcher for all generated Windows observer commands after real outside-workspace runs exposed failures before the native observer started. This supersedes the 0.7.0 direct-invocation optimization below. Register globally, restart an existing CLI, and review changed definitions in `/hooks`; trust is never bypassed. See [diagnosis and real verification](provider-monitoring-repair.md#codex-outside-the-application-workspace).

Version 0.7.0 invokes the quoted native helper directly for absolute executable paths without CMD-sensitive characters. Other paths retain the encoded PowerShell wrapper. Both definitions are recognized as owned during migration; unrelated hooks remain intact. Reconnect after upgrading and manually review changed definitions in Codex. The application does not grant trust. See [roadmap implementation](roadmap-implementation.md) for measurements and retention/setup behavior.

Threadcap includes a Windows Rust adapter for Codex CLI hooks, with in-app setup starting in version 0.5.1. It monitors sessions, tool activity, permission requests, response completion, and disconnection. Approval and answers remain in Codex. The adapter does not read transcripts or credentials, run model tasks, or change Codex permissions.

## Install

Use native Windows Codex CLI on PATH. **0.169.0** is the verified version; compatibility with newer versions is not guaranteed. Version 0.169.0 is the verified contract; later versions still need compatibility testing. WSL and remote Codex instances are not supported by this Windows adapter.

1. Install and start Threadcap. The installer includes `vibe-island-codex.exe` beside the application executable. The technical helper name remains stable for compatibility. The same helper is available as a standalone release artifact.
2. Open **Settings > Agents > Codex CLI** and press **Connect**. The app runs the bundled helper, preserves other hooks, and shows errors with a retry action. Opening Settings checks diagnostics without modifying configuration. `Registered` confirms configuration, not trust; only fresh live session events produce `Monitor`. Use `Reconnect` to refresh registration and the stable helper after an update. Browser Preview cannot run setup.
3. Restart Codex and use `/hooks` to review and trust the Threadcap observer, retaining its legacy `vibe-island` integration tag. Codex requires this review; installing configuration does not grant trust. Do not bypass hook review.
4. Run an ordinary Codex session. New hook events should appear in the island.

For command-line setup instead, open PowerShell in the helper's directory and run:

```powershell
.\vibe-island-codex.exe install
```

Check setup from the command line with:

```powershell
.\vibe-island-codex.exe doctor
```

`doctor` reports the detected CLI, configured event names, and loopback bridge availability. It cannot infer whether the hooks have been trusted. An offline island produces an unsuccessful diagnostic exit status.

Setup copies the helper into the current user's local application data under `VibeIsland/bridge/`. Hook commands reference that stable copy, so the download or checkout can be moved afterward. No administrator privileges, Python, Node.js, or Rust installation is needed by end users. A short-lived Windows PowerShell process forwards each hook's JSON input to the Rust helper.

The adapter uses `CODEX_HOME/hooks.json`, falling back to `.codex/hooks.json` in the user profile. Existing unrelated hooks and configuration are preserved. Changed files receive byte-for-byte backups named `hooks.json.vibe-island-<id>.bak`. Repeating installation is idempotent. Malformed configuration is rejected without rewriting it.

For a separate Codex profile or bridge port:

```powershell
.\vibe-island-codex.exe install --codex-home "C:\CodexProfile" --port 37892
.\vibe-island-codex.exe doctor --codex-home "C:\CodexProfile" --port 37892
```

Start the island with the matching `VIBE_ISLAND_PORT` environment variable. A profile override changes registration only; launch Codex with the matching `CODEX_HOME` yourself.

## Observed states

| Codex hook | Island interpretation |
| --- | --- |
| `SessionStart` | Connected, idle; use the actual supplied model |
| `UserPromptSubmit` | Running; retain the submitted prompt |
| `PreToolUse` | Tool activity; observe an input request if Codex emits the corresponding tool hook |
| `PermissionRequest` | Waiting for approval in Codex; no island decision buttons |
| `PostToolUse` | Tool progress; clear a matching observed request |
| `PreCompact`, `PostCompact` | Context progress without discarding pending requests |
| `Stop` | Response finished; retain the supplied assistant message |
| `Interrupt` | Idle after interruption; do not infer failure |
| `SessionEnd` | Disconnected; retain the last observed lifecycle state |

`Stop` describes response completion, not proof of command success or completion of the user's entire objective. Other hooks can cause Codex to continue. Tool failures are not automatically classified as task failure. A request is observable only when Codex emits the relevant hook. Explicit child-agent events are ignored rather than replacing the parent session's state.

The hook integration exposes no approval/reply delivery. Version 0.6.2 captures safe inherited Orca identity for a separate [native terminal connector](orca-navigation.md); the observer itself does not switch terminals or enable HTTP actions. Hooks do not supply quota. Starting in 0.6.0, the native host separately reads the current Codex profile's account quota through app-server; it does not claim that every session uses that account. See [usage](usage.md) for freshness and mapping limits. The hook adapter never invents a terminal target, model, or progress percentage. Monitoring support must not be presented as an interactive integration.

## Delivery and local data

Each session uses `codex:<session_id>`, persisted producer revisions, and unique event IDs. Duplicate and stale turn/tool events are rejected. Unrelated parallel progress preserves a pending request. HTTP delivery is bounded and best effort to `127.0.0.1`; hook handling returns quietly even when the island is unavailable. It emits no policy decision or additional model context.

Before network delivery, the adapter saves its latest session report in `VibeIsland/codex-hooks-<port>.sqlite3` under local application data. The native host imports these snapshots on startup as disconnected, without replaying notifications. A fresh hook reconnects the session. There is no background adapter service or guarantee that a silent, abruptly terminated Codex process can be detected immediately.

The cache contains session identifiers, workspace paths, supplied model names, prompts, latest assistant responses, and observed commands. Prompts/results are capped at 16,000 characters with a visible truncation marker. Bash commands over 16 KiB are omitted. Raw tool responses, transcript files, and authentication data are not collected. Deduplication history is bounded; this is a latest-state monitor, not an unlimited audit log. No external telemetry is added.

For isolated tests, `VIBE_ISLAND_CODEX_STATE_FILE` selects the native host's recovery cache. A host using `VIBE_ISLAND_STATE_FILE=:memory:` skips normal user-cache recovery unless that explicit override is provided. The helper's hidden `hook --state-file` option is for test fixtures, not routine setup.

## Update or remove

Run `install` from the new release helper to refresh the stable copy and registration. If a hook currently holds the executable open, wait for it to finish and retry. Changed command definitions may require another Codex trust review.

```powershell
.\vibe-island-codex.exe uninstall
```

Removal deletes only tagged Vibe Island handlers. Other hooks remain; empty event arrays may remain. It does not restore an entire old backup over newer user changes. The helper and local cache are retained. Use the same `--codex-home` override when removing a separately configured profile.

## Build and distribute

From a checkout with the Windows MSVC/Tauri prerequisites and Node.js 24:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run test:codex
npm.cmd run test:native
npm.cmd run desktop:build
npm.cmd run release:stage
```

Tauri builds and bundles the Rust helper automatically. `dist/` receives the NSIS installer, standalone helper, this guide, and `SHA256SUMS.txt`. The repository's Windows GitHub Actions workflow performs these checks and uploads artifacts. It does not publish a GitHub release automatically. Tagged builds require the tag version to match `package.json`.

The local helper tests and isolated native checks use fixtures, not model calls. A separate contract check asks the installed Codex app-server to list hooks in a temporary profile without creating threads, running turns, or trusting definitions. See the repository's Codex verification notes for the boundary between these checks and a real user session.

The adapter follows [Codex hook documentation](https://learn.chatgpt.com/docs/hooks) and the [Windows command runner in Codex 0.169.0](https://github.com/openai/codex/blob/rust-v0.169.0/codex-rs/hooks/src/engine/command_runner.rs). Direct invocation preserves piped UTF-8 JSON; the encoded PowerShell fallback preserves paths containing CMD-sensitive characters.
