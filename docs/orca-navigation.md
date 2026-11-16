# Terminal navigation in Orca

Threadcap 0.8.0 extends the native chooser to all primary providers and local shells, adds recurring pane-presence checks, and verifies active leaf metadata after switching. Existing Codex links are retained even when a later hook lacks inherited environment variables. See [the implementation report](threadcap-implementation.md) for restart, reused-PTY, and real-provider limits. Older 0.6.2 behavior below is historical where superseded.

Version 0.6.2 adds a native connector for local Orca Codex terminals. It was checked with Orca 1.4.258. Monitoring alone still cannot deliver approvals or answers.

## Setup and use

Install the updated desktop application, then open **Settings > Agents > Codex CLI** and press **Reconnect** to refresh the bundled hook helper. Existing Codex hook trust remains a separate manual requirement; see [Codex setup](codex-bridge.md). Registration does not establish that a terminal is connected.

The next accepted Codex hook captures the safe Orca launch identity when available. Click the session's terminal button to return to its verified local terminal. Merely receiving an event never switches applications.

For an older session, click its terminal button, select the correct live Codex terminal, and use **Link and open**. This chooser lives inside the island. A manual selection asserts the association; matching project names are not sufficient evidence for automatic linking. Refresh updates the available choices. Escape, Back, and outside-click dismissal retain ordinary island behavior.

## Identity and persistence

The helper reads only `ORCA_TERMINAL_HANDLE`, `ORCA_PANE_KEY`, `ORCA_WORKSPACE_ID`, `ORCA_WORKTREE_ID`, and `ORCA_RUNTIME_SOURCE_INCARNATION`. It stores validated identity with the accepted session revision in its local SQLite transaction. Missing launch identity clears automatic attribution. The host rejects metadata whose revision differs from the canonical cached session.

Before navigation, the host queries Orca's local terminal list and verifies the runtime, handle, pane, and worktree. First verification pins the listed PTY incarnation. Subsequent checks reject reused or expired identities. A newer event with the same launch identity does not silently authorize a changed PTY incarnation.

Manual associations are stored under `%LOCALAPPDATA%/VibeIsland/orca-terminal-links-<port>.json`. They survive application restart and require fresh validation before use. Invalid saved data is reported rather than silently deleted. Automatic associations additionally require matching current helper metadata; a valid manual choice remains an explicit user override.

The connector uses fixed argument arrays for `terminal list` and `terminal switch`, always selecting the local environment. Calls have bounded output and timeouts. Navigation succeeds only with Orca's positive acknowledgment for the exact runtime, handle, tab, and worktree. A disappeared target or failed acknowledgment produces an error or returns to selection. There is no unrelated application fallback.

## Limits

- Only native Codex sessions in local Orca are supported. Browser Preview simulates actions. Other providers, terminal applications, and paired remote environments are unsupported.
- The chooser examines at most 100 terminals and reports truncation. It filters out disconnected, orphaned, nonlocal, and non-Codex candidates.
- Terminal labels, paths, and safe identity fields identify choices. Terminal previews and launch/hook tokens are not persisted or sent to the UI by this connector.
- Old sessions can require manual selection. A terminal without valid inherited identity cannot be linked automatically.
- Producer JSON cannot grant terminal navigation or approval capabilities. The generic HTTP action route still returns 501. This feature uses a separate validated native IPC command.
- Acknowledged navigation does not prove execution, hook trust, approval delivery, or task completion.

See [verification](orca-navigation-verification.md) for tested behavior and remaining desktop coverage.
