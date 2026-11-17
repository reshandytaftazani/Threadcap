# Changelog

This file summarizes implemented releases. Detailed verification records remain in `docs/`; a local build is not evidence that every native interaction or provider version works.

## Unreleased

- Set up Codex, Antigravity, and OpenCode with one Connect all action. Show individual outcomes and verify each connection with fresh activity. Keep individual setup and Codex's `/hooks` review when required.
- Accept Antigravity CLI 1.5.10 in desktop setup and the bundled setup helper, alongside 1.5.9.
- Open the sole Working session on a strip click. Other clicks and the shortcut open the Sessions overview.

- List and link standalone Windows Console windows and accessible Windows Terminal tabs alongside local Orca panes. Confirm foreground focus before dismissing the picker and label window-only navigation explicitly.

- Observe process exit for Codex sessions started with the bundled PowerShell local-client launcher. Archive confirmed exits even when Windows closes the terminal before Codex can send `SessionEnd`.

- Bind OpenCode navigation to live TUI-owned Orca terminals, handle multiple clients without guessing, and reject confirmed closed targets. Preserve Antigravity links across hooks without launch variables and validate their provider revisions. Remove the silent 100-candidate navigation cutoff.

- Open Sessions first when clicking the strip or invoking its hotkey, including pending/completed summaries. Fresh-request auto-open retains its existing preference and interaction protections.

- Add explicit Send for supported OpenCode 2.3.0 questions through a TUI-owned native connector. Preserve single/multiple choices, short-text drafts, terminal fallback, request identity, and honest acknowledgment/error states. Command approvals remain in OpenCode.

- Preserve OpenCode form questions and choice descriptions in monitoring-only detail. Allow fresh requests to reveal from an unattended Sessions overview while preserving selected details, Settings, and user interaction. Add real-server form checks without model calls.
- Redraw agent state companions on a 12 DIP pixel grid beside unchanged 16 DIP product marks. Use one shared companion for grouped compact summaries, preserve animation identity across activity updates, and add a current-build WebView2 check.
- Organize guides, architecture, integrations, verification records, and historical plans into dedicated documentation folders. Separate active CLI observers, test suites, build tools, preview pages, and legacy prototypes; update imports and build references together.
- Add standard `dev`/`build` tasks and full provider names in task commands, with documented desktop compatibility aliases.
- Put the shell-test receiver back into blocking mode after nonblocking accept, retaining its bounded read timeout.

- Prepare the Threadcap repository for publication with MIT licensing, user-oriented documentation, contributor/security guidance, GitHub templates, and source-package checks.
- Allow up to one second for short SQLite cache write contention after a clean GitHub runner exposed dropped concurrent hook writes; retain the concurrency test and add a held-lock regression.

## 0.8.4

- Immediately archive confirmed terminal/CLI-session closure for all three providers, preserving task context and CLI history.
- Track exact OpenCode TUI process identities separately from the persistent server; retain a shared session until its last verified client exits.
- Prevent background server events from reviving closed CLI context; allow fresh verified client resumption without duplicates.
- Recover legacy local OpenCode rows only after a complete zero-client census; migrate previously confirmed ended context once.
- Preserve OpenCode plugins/settings during registration, including UTF-8 BOM configurations.

See [closure behavior and verification](docs/verification/releases/v0.8.4-client-closure.md).

## 0.8.3

- Repair encoded Windows hook launching for Codex outside the application workspace.
- Add OpenCode 2.3.0 registration support.
- Observe Antigravity account quota through the official status line while forwarding existing output and preserving preferences.

See [provider monitoring repairs](docs/verification/releases/v0.8.3-provider-monitoring.md).

## 0.8.2

- Refresh existing managed observer binaries at startup without rewriting hooks.
- Recover PID-less legacy Antigravity rows only after confirmed native process absence.

See [upgrade recovery](docs/verification/releases/v0.8.2-observer-upgrade.md).

## 0.8.1

- Immediately archive confirmed Antigravity CLI/pane closure. This provider-specific policy was extended to all providers in 0.8.4.

## 0.8.0

- Introduce Threadcap and the Edge signal application mark while retaining compatibility identifiers and storage.
- Add native Orca pane observation, restart recovery, provider Connect flows, clearer Archive/Back navigation, and stronger pixel controls/state companions.
- Introduce configurable closed-pane retention, superseded by 0.8.4's confirmed-closure policy.

See [the revision implementation report](docs/verification/releases/v0.8.0.md).
