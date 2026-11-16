# Threadcap

A compact Windows companion for **Codex CLI, Antigravity CLI, and OpenCode CLI**. Keep an eye on coding sessions from a small island attached to the top of your screen.

**0.8.4 · Windows x64 preview · Monitoring only**

Threadcap shows session activity, surfaces requests, and keeps account quota separate from task progress. Approvals and answers stay in your agent terminal.

![Threadcap session overview with synthetic verification sessions](docs/images/session-overview.png)

*Native verification fixture; the sessions above are simulated test data. Real mode starts without demo sessions.*

## Install

1. Download `Threadcap_0.8.4_x64-setup.exe` and `SHA256SUMS.txt` from this repository's **Releases**, when a release is available. GitHub Actions also produces downloadable build artifacts; they are separate from published releases.
2. Check the installer hash against its entry in `SHA256SUMS.txt`:

   ```powershell
   Get-FileHash .\Threadcap_0.8.4_x64-setup.exe -Algorithm SHA256
   ```

3. Run the installer, then start Threadcap. It lives in the tray; closing its window hides it. Choose **Exit** from the tray to quit.
4. Open the island, then **Settings > Agents**, and connect each CLI you use.

The package targets native Windows x64. Windows 10/11 are the intended platforms; a full Windows-version and display-scaling matrix has not been verified. Microsoft Edge WebView2 is required; the installer can download it if absent. An offline computer needs WebView2 installed beforehand. Rust, Node.js, and Python are not required to run the installed app. Install and sign in to your agent CLIs separately.

## Connect your agents

| Provider | Verified CLI versions | Setup |
| --- | --- | --- |
| Codex CLI | 0.169.0 contract | Connect, restart Codex, then review and trust Threadcap's monitoring hooks in `/hooks`. The compatibility tag is `vibe-island.codex.v1`. |
| Antigravity CLI | 1.5.9 | Connect, review the registered hooks/status-line wrapper, then restart the CLI. Existing status-line output and disabled preferences are preserved. |
| OpenCode CLI | 2.2.7 and 2.3.0 registration; real TUI lifetime checked on 2.3.0 | Connect, review the plugin, then restart existing CLI clients to load the TUI observer. The shared server may remain running. |

Registration does not prove live monitoring. Open a new session or generate fresh activity and check that it appears. Threadcap never grants Codex hook trust automatically. Version gates can reject an unverified CLI while preserving its configuration.

See [setup and troubleshooting](docs/getting-started.md), [Codex setup](docs/codex-bridge.md), and [provider verification](docs/provider-monitoring-repair.md).

## Everyday use

- **Hover** widens the strip horizontally; click opens the session view.
- **Settings** stays inside the island, with Agents, Appearance, and Behavior pages.
- **Requests** can reveal automatically without taking OS focus; this is configurable.
- **Archive** holds sessions whose terminal or CLI end is confirmed. Closure moves them out of the main list immediately for every provider. Completion or lost connectivity alone does not establish closure.
- **Terminal navigation** is available only for verified local Orca bindings. Other hosts and unbound sessions may require manual selection or remain unavailable.
- **Reduced motion** removes geometric transitions and avatar loops while keeping status visible.

## Capability boundaries

| Capability | Codex | Antigravity | OpenCode |
| --- | --- | --- | --- |
| Session/activity monitoring | Hooks, after trust review | Lifecycle hooks | Server and TUI plugins |
| Closure evidence | Session-end hooks / verified pane | Exact CLI process / verified pane | Last verified owning TUI client exits |
| Account quota | Read-only account snapshot | Official CLI status-line payload | Unavailable |
| Approve or answer inside Threadcap | Unavailable | Unavailable | Unavailable |

Quota is shared account information, not per-session progress. Account-to-session mapping remains unverified. Stale or unavailable data is labeled. Native pane navigation, live-provider checks, and fixtures have different verification scopes; see [current capabilities and evidence](docs/capabilities.md).

## Build from source

Install Node.js 24, MSVC Rust, Visual Studio C++ Build Tools with a Windows SDK, and WebView2. See [Tauri's Windows prerequisites](https://v2.tauri.app/start/prerequisites/). Development and CI use Rust 1.100.0; older toolchains have not been established as supported.

```powershell
npm.cmd ci
npm.cmd run desktop
```

To test and create release files:

```powershell
npm.cmd run check:publication
npm.cmd test
npm.cmd run test:codex
npm.cmd run test:native
npm.cmd run desktop:build
npm.cmd run release:stage
```

The installer is built under `src-tauri/target/release/bundle/nsis/`; `dist/` receives the installer, helper, guides, notices, and checksums. Close the installed app before running development mode: both use the normal local data and port by default. Never run the legacy Python bridge alongside the native host.

Browser Preview is separate: run `npm.cmd run preview` with Python installed and open `http://127.0.0.1:4173/?preview=1`. Its sessions and decisions are simulated. It does not verify native focus, window regions, or agent integration.

## Documentation and contributions

- [Documentation index](docs/README.md) · [Changelog](CHANGELOG.md) · [Roadmap](docs/roadmap.md)
- [Contributing](CONTRIBUTING.md) · [Security policy](SECURITY.md) · [Release preparation](docs/publishing.md)
- [Design](design.md) · [Agent instructions](AGENTS.md) · [Native architecture](docs/native-desktop.md)

Bug reports should include the app/CLI versions, terminal host, reproduction steps, and a sanitized screenshot or log. Please remove prompts, tokens, account identifiers, and personal paths before sharing. Use the repository's issue templates for ordinary bugs; follow the security policy for vulnerabilities.

## License and acknowledgments

Threadcap's original code and documentation use the [MIT license](LICENSE). Provider marks and third-party materials retain their own terms; see [third-party notices](THIRD_PARTY_NOTICES.md) and [icon provenance](docs/agent-icons.md). No provider endorsement is claimed.

[Vibe Island](https://github.com/vibeislandapp/vibe-island) informs the visual direction; [EchoIsland](https://github.com/FunplayAI/EchoIsland) informs Windows aggregation ideas. Reference-app proprietary assets are not redistributed.
