# Changelog

This file summarizes implemented releases. Detailed verification records remain in `docs/`; a local build is not evidence that every native interaction or provider version works.

## Unreleased

- Prepare the Threadcap repository for publication with MIT licensing, user-oriented documentation, contributor/security guidance, GitHub templates, and source-package checks.

## 0.8.4

- Immediately archive confirmed terminal/CLI-session closure for all three providers, preserving task context and CLI history.
- Track exact OpenCode TUI process identities separately from the persistent server; retain a shared session until its last verified client exits.
- Prevent background server events from reviving closed CLI context; allow fresh verified client resumption without duplicates.
- Recover legacy local OpenCode rows only after a complete zero-client census; migrate previously confirmed ended context once.
- Preserve OpenCode plugins/settings during registration, including UTF-8 BOM configurations.

See [closure behavior and verification](docs/client-closure.md).

## 0.8.3

- Repair encoded Windows hook launching for Codex outside the application workspace.
- Add OpenCode 2.3.0 registration support.
- Observe Antigravity account quota through the official status line while forwarding existing output and preserving preferences.

See [provider monitoring repairs](docs/provider-monitoring-repair.md).

## 0.8.2

- Refresh existing managed observer binaries at startup without rewriting hooks.
- Recover PID-less legacy Antigravity rows only after confirmed native process absence.

See [upgrade recovery](docs/antigravity-upgrade-recovery.md).

## 0.8.1

- Immediately archive confirmed Antigravity CLI/pane closure. This provider-specific policy was extended to all providers in 0.8.4.

## 0.8.0

- Introduce Threadcap and the Edge signal application mark while retaining compatibility identifiers and storage.
- Add native Orca pane observation, restart recovery, provider Connect flows, clearer Archive/Back navigation, and stronger pixel controls/state companions.
- Introduce configurable closed-pane retention, superseded by 0.8.4's confirmed-closure policy.

See [the revision implementation report](docs/threadcap-implementation.md).
