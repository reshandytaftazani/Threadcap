# Source terminal navigation

## Local Windows targets

Open the session's terminal button and choose its source if Threadcap has no verified link.

- Orca uses the verified pane when available. Chat sessions with no terminal pane have no terminal target.
- PowerShell in the standalone Windows Console window can be linked to that window. The host verifies its handle, owning process, and process creation time, then verifies foreground focus.
- Windows Terminal offers individual tabs when the tab strip exposes selectable items through Windows accessibility. Threadcap verifies the selected tab in the foreground window. When tabs cannot be inspected, select the window explicitly and switch tabs within Windows Terminal. Entries labeled `Link and open window` only bring the window forward.

Windows links are saved locally across Threadcap restarts and require fresh validation before use. If a tab or window changes or closes, refresh and choose again. Titles and paths are for display. A manually linked window does not establish that closing it ended the CLI session. Remote hosts, terminals embedded in other editors, and exact Windows Terminal split-pane selection are outside this connector.

## Current source, November 17, 2026

The native local Orca connector supports Codex, Antigravity, and OpenCode. Older Codex-only restrictions below are historical. See [current verification](../verification/provider-navigation.md) for hook-fixture versus real-TUI evidence.

- Codex captures safe inherited identity with accepted hook revisions. Later hooks without launch variables retain an existing association while advancing its revision.
- Antigravity captures identity through its lifecycle observer. Its link revision is checked against the provider cache, independently of Codex.
- OpenCode captures identity from the TUI lifetime observer, never the persistent server. Native PID and creation time establish a live owner. A single distinct verified owning terminal can be selected automatically. Multiple owners require a choice unless an existing verified link selects one. After that owner exits, a sole remaining verified owner can become the target. A changed PTY incarnation still requires explicit relinking.

Connect the provider in Settings > Agents. Codex hook trust remains manual. The next accepted hook or TUI observation can identify the source terminal. An unbound session requires **Link and open** inside the island; titles, paths, and agent labels never establish ownership. Confirmed closed sessions cannot activate leftover shells. Lists accept up to 10000 entries and disclose truncation. Plain local shells remain selectable when their agent label disappears.

For Orca, switch acknowledgment and a fresh matching active tab and leaf are required. Browser Preview simulates actions. Generic HTTP actions remain disabled.

## Historical implementation

Threadcap 0.8.0 extends the native chooser to all primary providers and local shells, adds recurring pane-presence checks, and verifies active leaf metadata after switching. Existing Codex links are retained even when a later hook lacks inherited environment variables. See [the implementation report](../verification/releases/v0.8.0.md) for restart, reused-PTY, and real-provider limits. Older 0.6.2 behavior below is historical where superseded.

Version 0.6.2 adds a native connector for local Orca Codex terminals. It was checked with Orca 1.4.258. Monitoring alone still cannot deliver approvals or answers.

## Setup and use

Install the updated desktop application, then open **Settings > Agents > Codex CLI** and press **Reconnect** to refresh the bundled hook helper. Existing Codex hook trust remains a separate manual requirement; see [Codex setup](codex.md). Registration does not establish that a terminal is connected.

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

See [verification](../verification/orca-navigation.md) for tested behavior and remaining desktop coverage.
