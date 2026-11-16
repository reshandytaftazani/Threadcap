# Getting started

## Installation and first connection

Install the x64 Windows package described in [README.md](../README.md). Open the island from the tray, choose Settings, and use the Agents page to connect the CLI you already have installed and signed into.

1. **Detect** checks the installed CLI/version.
2. **Connect** registers the monitoring integration and preserves unrelated configuration with backups.
3. **Review** the installed integration. Codex additionally requires manual trust in `/hooks` from a fresh CLI.
4. Restart an existing CLI and generate fresh activity. A registered integration is not yet a verified live connection.

For Antigravity, a disabled status line stays disabled; quota can remain unavailable. For OpenCode, restart the CLI client to load the TUI observer. An existing shared server may remain running. Connect supports specific verified versions; see [capabilities](capabilities.md).

## Sessions, requests, and Archive

Hover widens the strip without opening the panel. Click to view sessions; use Back/Escape to return through Settings and detail pages. Outside-click collapses the island. The global shortcut is `Ctrl+Alt+Space` when registration succeeds; Settings reports if it is unavailable.

Requests may reveal automatically, subject to attention settings and interaction protection. Respond in the agent terminal. A finished turn cools down visually to Idle while its terminal remains available.

Confirmed closure immediately moves a session into Archive. Missing events or a disconnected observer do not prove that its terminal closed. OpenCode sessions stay visible while any verified TUI client owns them. See [closure rules](client-closure.md) for legacy and shared-server cases.

Open Archive directly from Sessions or Behavior settings. Restore reveals saved context; it does not reconnect a terminal or restart an agent. Delete/Delete all requires confirmation and may reject protected or changed context. Deletion affects Threadcap context, not CLI history or project files.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Codex works only in one folder | Check global Connect registration and `/hooks` trust in a fresh CLI outside that folder. Verify the same Codex profile is used. |
| OpenCode opens but closure is not observed | Reconnect using 0.8.4 and restart the CLI client. The TUI plugin must load; the server alone is not client-lifetime evidence. |
| Quota unavailable or stale | Confirm the supported CLI/version and existing sign-in. Antigravity needs an enabled status line that reports quota. OpenCode quota and session/account mapping are unavailable. |
| Terminal button unavailable or selects no exact pane | Only verified local Orca bindings have the documented exact-pane route. Use explicit selection where offered; other hosts can remain unavailable. |
| Retained disconnected sessions remain visible | Disconnection is not closure. Old unbound sessions may lack sufficient evidence; Archive can hide context manually. |
| App fails to start or development mode cannot bind | Exit another Threadcap instance or legacy bridge. Do not run two hosts against the same database or port. |
| Windows flags an installer | Verify its source and SHA256. A checksum checks integrity against that source; it is not a code-signing identity. Do not assume every distributed build is signed. |

Use the bug template with versions and reproduction steps. Remove private prompts, personal paths, credentials, and raw account data from logs. Security-sensitive issues follow [SECURITY.md](../SECURITY.md).

## Data and uninstall

Compatibility names are intentional: executables remain `vibe-island.exe` and `vibe-island-codex.exe`; data and managed helpers use `VibeIsland` under Windows local application data. The application identifier and upgrade keys remain stable. Do not delete those directories merely because they have the previous name.

Exit Threadcap before backing up its data. Use Windows Installed apps to uninstall. Provider integrations and local session data are separate from the binary; do not assume uninstall removes hooks, plugins, backups, or CLI history.

For complete monitoring removal, review configuration and remove only the owned Threadcap integration: Codex's `vibe-island.codex.v1` hooks, Antigravity's owned monitor/status-line wrapper, and OpenCode's `plugins/threadcap-monitor` registration/files. Restore any previous Antigravity status-line command from the managed forwarding file or matching backup before removing its wrapper. Preserve unrelated settings/plugins and restart affected CLIs. Do not blindly restore an entire old configuration over newer changes.
