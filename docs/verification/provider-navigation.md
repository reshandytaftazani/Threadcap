# Source-terminal navigation verification

## Windows terminal picker

The picker now lists Orca panes, Windows Console windows, and Windows Terminal tabs and windows. Windows targets need an explicit selection. The host verifies the window class, process identity and foreground window, plus accessible tab selection for a tab target. Windows Terminal can expose a window without accessible tabs. This path preserves window-level navigation in that case.

The current isolated native build passed eight Windows checks on Windows Terminal 1.25.3131.0 and a standalone PowerShell console. Physical clicks on the island switched to a previously unselected Windows Terminal tab and brought the standalone console forward. The run verified both tab candidates, rejected a stale process identity, and reopened the linked console. The 30 Orca navigation and closure checks also passed against the same source.

Orca chat sessions without a terminal pane still have no terminal target. These checks do not establish exact Windows Terminal split-pane navigation or automatic Windows tab attribution from provider events.

## November 18, 2026 retest

The current source adds a Codex local-client launcher and durable process exit detection. The native bridge test forced an owned Windows process to exit without a SessionEnd hook and verified one ordered closure report with the original task context. The same final smoke build passed 30 native navigation and closure checks and eight Antigravity lifetime checks. The navigation run used real Orca and WebView2, Codex and Antigravity process and hook fixtures, and real OpenCode 2.3.0 TUI clients. It confirmed that navigation works after restarting Threadcap and that confirmed closed sessions cannot route to a leftover shell.

Final smoke executable SHA-256: `C47F841B976D7C31814A2D37593989670FD9E61A2CF22E2F995BA1303047A1A7`.

Codex 0.169.0 accepted the local launcher flags. The process fixtures do not establish behavior for a live Codex or Antigravity model turn or a physical window close. The installed Antigravity 1.5.10 binary was identified, but Connect for that version was not verified. Exact standalone PowerShell tab navigation remains unsupported. See [Codex launcher instructions](../integrations/codex.md#powershell-terminal-closure).

## Earlier navigation baseline

Date: November 17, 2026. Unreleased source refinement on the 0.8.4 compatibility baseline.

## Changes

- OpenCode's TUI lifetime observer now stores safe inherited Orca identity alongside its native client PID/creation identity. Navigation uses live TUI owners, independently of the persistent server. One owning terminal can be selected automatically; ambiguous owners require selection. A saved verified owner remains usable while live, and a sole surviving owner may replace an exited owner.
- Antigravity advances retained terminal-link revisions when later hooks omit launch variables. Link loading checks `provider_sessions` revisions for providers and `codex_sessions` revisions for Codex. It no longer assumes that all links belong to Codex.
- Confirmed closed sessions reject navigation rather than activating a leftover shell. Existing runtime, handle, worktree, pane, and PTY-incarnation checks remain required. OpenCode ownership is checked again immediately before automatic navigation.
- Candidate parsing accepts the requested maximum of 10000 entries instead of silently discarding entries after 100.
- Orca may acknowledge a switch before publishing its new active-leaf metadata. After acknowledgment, the host allows up to three seconds for fresh layout confirmation, checking target identity on every observation. It does not send another switch or accept the tab acknowledgment alone.

User configuration, Codex hook trust, CLI history, and project files are unchanged. The observer-cache addition is an additive table; existing terminal links remain readable.

## Native evidence

`npm run test:navigation` passed 27 checks through a freshly built smoke host, real WebView2/IPC, and Orca 1.4.261. The test owns all created terminals and uses private profiles, ports, and databases. No model prompt is sent.

- Codex and Antigravity: real observer-hook fixtures run in separate owned Orca terminals. Automatic switching and the rendered terminal button select the expected runtime-issued handle. Antigravity also retains its source after an event without launch variables. The Antigravity fixture uses an owned Windows command process named `agy.exe` to supply native lifetime evidence; it is not a real Antigravity model run.
- OpenCode 2.3.0: a real isolated server and real TUI clients establish source ownership. The test checks automatic navigation, the rendered terminal button, independent ownership by two clients, explicit selection, surviving-owner navigation, rejected PTY reuse, immediate archival after the last client closes, and rejected closed-session navigation while the server stays alive.
- All three providers: stop and restart the private native host, then navigate again using retained identities without Connect or manual relinking.

An earlier fixture lacked an Antigravity process owner and correctly triggered legacy closure recovery; it was replaced with the owned process fixture. A later repeated run exposed the premature post-switch layout check described above. The final 27-check pass uses the bounded confirmation implementation, not the earlier executable.

Final smoke executable SHA-256: `44F15D1D4F2099FDF42D322A6EDE0CC5BDFC81B932219A9AF96B54C1CA18E229`.

Bundled helper SHA-256: `93595A2C57F7815E0F217585D4131005D9695856E02760FD4E25A88242FD3A83`.

## Regression and packaging

- Bridge tests: 35 passed, including provider ordering, configuration preservation, real Windows process lifetime, revision alignment, and observer transport.
- Host unit tests: 11 passed, including exact acknowledgment, pane validation, and the candidate-limit regression.
- JavaScript model/presentation/quota tests: 19 passed.
- OpenCode direct-reply regression on the same final smoke build: 27 native checks passed against a real isolated server/TUI. Replies, request ownership, withdrawal, draft preservation, and unsupported-form fallback remain working.
- Publication checks: 185 files passed local-link, source-reference, metadata, exclusion, and selected sensitive-content checks. This is not a comprehensive security audit. JavaScript syntax and Git whitespace checks passed.
- Production `npm run build` completed successfully after restoring the production application identifier. The installer is `src-tauri/target/release/bundle/nsis/Threadcap_0.8.4_x64-setup.exe`, SHA-256 `AC4CD38107FF19A4AFE110DD5D13C8D1E4ECB993B01A82DF6F0C42409EC4D421`. It is unsigned and was not installed during this navigation check. The available installed application is not evidence for this refinement.

Local native results are written to ignored `artifacts/provider-navigation-native.json`. Private profiles and terminal metadata are not publication artifacts.

## Other checks and limits

- PASS: 35 Rust bridge tests, including real Windows process-lifetime tests and provider revision alignment.
- PASS: 11 Rust host tests, including exact acknowledgment, active-leaf matching, stale identity rejection, and the 100-entry cutoff regression.
- PASS: 19 JavaScript model/presentation/quota tests.

Exact navigation remains limited to local Orca. Standalone PowerShell, Windows Terminal, WSL, and paired remote hosts are unsupported. Codex and Antigravity navigation here uses hook fixtures rather than new live model tasks. These checks do not establish full desktop focus, mixed-DPI, every split-layout topology, or every provider version. Builds alone are not native behavior evidence.

Anti-slop scope check: PASS. The existing island navigation controls and explicit linking behavior are retained. No visual assets, decorative motion, speculative fallback applications, or fabricated integration capabilities were added.
