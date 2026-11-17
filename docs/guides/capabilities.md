# Current capabilities: 0.8.4

This page describes the current release. Earlier implementation reports record historical evidence; [CHANGELOG.md](../../CHANGELOG.md) explains changes between releases.

Unreleased direct replies: simple OpenCode 2.3.0 question forms with one supported string or multiselect field can be answered in the island through a connected TUI plugin. Select or type, then press Send. Unsupported forms and command approvals retain the terminal route. Generic HTTP actions remain unsupported. Updated plugin files require Connect and restarting OpenCode CLI. See [scope and verification](../verification/opencode-replies.md).

| Area | Implemented | Verification and limits |
| --- | --- | --- |
| Windows host | Tauri/Rust, embedded UI, loopback producer bridge, tray | Native tests and installed upgrade checked on the available Windows machine; full OS/DPI/multi-monitor coverage remains open. |
| Codex monitoring | Ten official hooks after registration and manual trust review | 0.169.0 contract and actual cross-folder lifecycle observations; WSL/remote support is not established. |
| Antigravity monitoring | Version-gated lifecycle hooks and exact CLI-process observation | 1.5.9; completed turns do not mean process exit. Native lifetime fixtures are separate from every real interactive exit path. |
| OpenCode monitoring | Server observer plus TUI lifetime plugin | Connect accepts 2.2.7/2.3.0. Real TUI lifetime tested on 2.3.0, including multiple clients, last-client closure, forced termination, restart, and resumption. |
| Closure/Archive | Confirmed CLI/session end or terminal closure archives immediately for all providers | No age/heartbeat-based inference. Unverified legacy rows can remain visible until valid evidence is available. Context and protected requests remain stored. |
| Reconnect/restart | Retained context appears as Checking and links are revalidated | Old notifications are not replayed; fresh evidence is needed for supported navigation or reactivation. |
| Terminal navigation | Native local Orca bindings with identity and PTY-incarnation checks | Codex is the documented verified path. No general exact-tab claim for Antigravity, OpenCode, PowerShell, Windows Terminal, WSL, or remote hosts. |
| Quota | Codex account snapshots; Antigravity official status-line payload | Remaining units, freshness, and unavailable states are explicit. Account-to-session mapping is unverified; OpenCode quota is unavailable. |
| Requests | Observe supported requests and reveal fresh attention episodes | Decisions and answers stay in the provider terminal. Generic bridge actions return unsupported. |
| Interface | Horizontal-only hover, in-island Settings, pixel marks/state companions, reduced motion | Synthetic UI checks and selected native runs; broad human acceptance and mixed-DPI validation remain outstanding. |

## Evidence

- [0.8.4 client closure](../verification/releases/v0.8.4-client-closure.md)
- [0.8.3 provider and quota repairs](../verification/releases/v0.8.3-provider-monitoring.md)
- [0.8.2 observer upgrade recovery](../verification/releases/v0.8.2-observer-upgrade.md)
- [0.8.0 foundation and limitations](../verification/releases/v0.8.0.md)
- [Codex native navigation](../integrations/orca-navigation.md)

Successful builds, synthetic events, plugin registration, and real-provider operation are distinct forms of evidence. An installer build alone does not establish native click-through, focus, terminal routing, or integration correctness.

Unreleased refinement: OpenCode 2.3.0 interactive forms retain visible field questions and choice descriptions in monitoring-only detail. Fresh attention can reveal from an unattended, unselected Sessions overview as well as compact mode. Settings and active session interaction remain protected. See [the real-server form and native attention checks](../verification/opencode-questions.md). This requires the updated application and helper; it is not a claim about an older installed 0.8.4 build.
