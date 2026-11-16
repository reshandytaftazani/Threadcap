# Provider monitoring and Antigravity quota — 0.8.3

Release record: this document preserves evidence and decisions for its named revision. For current behavior and superseding changes, use [the capability matrix](capabilities.md) and [changelog](../CHANGELOG.md).

## Codex outside the application workspace

The installed Codex 0.169.0 discovered all ten enabled global Threadcap hooks in multiple working directories, including a different Orca project. Hook trust was initially valid. However, real outside-workspace runs reported failed observer commands and never reached the helper. Registration alone had concealed this failure.

The generated Windows command now uses an encoded PowerShell launcher that passes piped UTF-8 JSON to the native helper. It avoids a quoted executable being interpreted incorrectly by a Windows command runner. The helper remains Rust; the launcher adds PowerShell startup overhead. No repository-specific hook files, approval changes, sandbox changes, or trust bypasses are installed.

Changing the command changes its Codex trust hash. Restart an existing CLI, open `/hooks`, review the Threadcap definitions, and trust them through Codex. An already running CLI can retain its previous definitions. After the owner reviewed the definitions from a fresh CLI, read-only hook inventory reported all ten as trusted in both checked external directories. A real app-server turn and a real ordinary-shell CLI execution outside this workspace then reached the running island. SessionStart, UserPromptSubmit, and Stop completed successfully. Monitoring begins when Codex emits lifecycle activity; opening an untouched prompt does not establish a monitored task.

The helper retains a bounded latest-result diagnostic and latest-error diagnostic beside its managed executable. They contain version, observation time, environment availability, accepted/error status, and a bounded error explanation. They do not contain prompts, answers, paths from session input, or authentication payloads. A helper result cannot diagnose a command that fails before the helper starts.

These checks made small real Codex model calls. They do not establish exact terminal navigation in ordinary PowerShell, bidirectional approvals, or exhaustive verification of every Orca project. Existing Orca binding validation remains separate.

## OpenCode 2.3.0

The installed CLI had advanced to 2.3.0 while Connect accepted only 2.2.7. The global Threadcap plugin was absent. Connect now accepts the two explicitly verified versions, 2.2.7 and 2.3.0; future versions remain gated until their interfaces are checked.

The shared installer writes the owned global `plugins/threadcap-monitor/index.js` without changing provider credentials, permission settings, or unrelated plugins. The plugin observes session creation/viewing and durable execution events as well as the existing status, permission, and form events. Viewing a session preserves its current task state. A legacy idle notification cannot overwrite authoritative completion; the existing ten-second presentation cooldown handles its visual return to Idle.

An isolated real OpenCode 2.3.0 server loaded the plugin, created an owned empty session, delivered its opening event to the helper, and delivered its deletion/end event. No model turn was started. Native Connect also registered it in a temporary global profile. On the actual installation, the plugin was installed globally and the running server reported `threadcap.monitor` as active. Opening or using a session supplies fresh activity; this adapter does not import all CLI history as active sessions.

If an existing server does not reload its plugin, restart OpenCode when its current requests and work can safely pause. Threadcap does not automatically cancel pending permissions, forms, or model work to force a reload.

Plugin status inspection must specify the intended location. A locationless response can be empty even when the plugin is active in project contexts. Final inspection confirmed the installed plugin active in two explicit project locations without restarting the server.

## Antigravity account quota

Earlier builds had no Antigravity quota collector. Version 0.8.3 observes the documented status-line payload from Antigravity CLI 1.5.9. Connect preserves a pre-existing command in a local forwarding file, keeps padding and enabled preferences, and installs a wrapper. Explicitly disabled status lines remain disabled. Existing CLI instances need a restart to read the updated configuration.

The wrapper uses a quote-free encoded Windows launcher with inherited native output handles. This addresses the CLI runner escaping quotes around executable paths containing spaces. The same launcher is used by Antigravity monitoring hooks. An actual CLI startup exposed this issue after a simpler CMD fixture had passed; both the fixture and implementation were corrected before final packaging.

The original status-line command receives the original JSON input and retains its stdout, including ANSI styling and UTF-8 text. The observer first extracts only account/quota fields into an independent table in the local helper cache. It does not read credentials, scrape terminal text, read transcripts for quota, or turn context-window occupancy into account allowance. An existing custom status-line script may independently do more; its behavior is preserved.

- `remaining_fraction` becomes remaining percent after range validation. `remaining_amount` stays an amount in provider units; no percentage denominator is invented.
- Bucket IDs remain separate. Missing limit durations display `Window not reported`; reset timestamps do not imply a duration or prove access recovery.
- Account email is hashed locally and excluded from stored quota payloads and IPC. A missing account or invalid quota returns unavailable. An initial unidentified bootstrap reading does not hide a subsequent valid account reading. Multiple recently observed verified accounts cannot be presented as one balance.
- Readings older than 120 seconds become stale. The UI reads the local Antigravity cache every five seconds; hover does not start a collector or network request. Codex keeps its independent coalesced collector and revision sequence.
- Account-to-session mapping remains unverified. Quota is account context, not progress for a session. OpenCode account quota remains unsupported.

After initialization, an actual Antigravity CLI supplied five valid quota buckets through the updated observer while the original custom status line rendered successfully. The initial sign-in message was transient; no authentication action was performed. The owned CLI was exited without sending a model prompt. This establishes real status-line ingestion, not signed-in task/approval or terminal-navigation acceptance.

## Verification and release

Regression checks cover session ordering, request protection, archive barriers, independent quota revisions, remaining units, stale rendering, and escaping of labels. Windows launcher tests exercise both CMD and PowerShell with UTF-8 input and paths containing spaces or unusual characters. Native checks exercise Connect, original output forwarding, quota cache and IPC, in-island rendering, stale readings, exit retention, and observer upgrade recovery. The OpenCode server check uses an owned empty session. Real quota and Codex checks are distinguished above from fixtures.

The final regression run passed 19 JavaScript tests, 23 core tests, 27 helper tests, and 10 native unit tests. The latest isolated native run passed 11 Connect/quota checks, 8 process-lifetime checks, and 7 observer-upgrade checks. The real OpenCode server plugin check also passed opening and deletion observation. A representative native screenshot was inspected; exhaustive scaling, mixed-DPI, focus, and human UX acceptance were not repeated for this repair.

The production 0.8.3 installer was then installed on the available machine. The running host, installed helper, and managed observer matched the production release; the host comparison allowed only the expected NSIS bundle marker. All 16 pre-upgrade canonical session IDs remained present after startup, and all ten Codex hook definitions remained trusted. A fresh real Antigravity startup supplied current quota while preserving the original status-line command and preferences. No user terminal or CLI history was deleted.

Run the relevant checks with the Windows toolchain configured:

```powershell
npm.cmd test
npm.cmd run test:codex
npm.cmd run test:native
npm.cmd run test:opencode-plugin
npm.cmd run test:agy-usage
npm.cmd run test:agy-exit
npm.cmd run test:observer-upgrade
```

Native scripts require the isolated smoke build and its matching helper, as described in the existing native test harness. Restore the production configuration before `npm.cmd run desktop:build` and `npm.cmd run release:stage`. Successful compilation does not establish live behavior, installer upgrade success, focus, click-through, mixed-DPI behavior, or human UX acceptance.

Portable helper setup also exposes `install-opencode`, `install-antigravity`, and `install-antigravity-usage`. The last action changes only the usage wrapper. The installers preserve backups and refuse unrelated occupied plugin/hook paths. Automatic application startup refreshes existing helper binaries, but never silently grants new Codex hook trust.

Sources: [Codex hooks and trust](https://learn.chatgpt.com/docs/hooks), [OpenCode plugin discovery](https://opencode.ai/docs/plugins/), [OpenCode server plugin events](https://opencode.ai/docs/build/plugins/server/), [OpenCode API](https://opencode.ai/docs/api), and [Antigravity status-line payload](https://antigravity.google/docs/cli/statusline/).
