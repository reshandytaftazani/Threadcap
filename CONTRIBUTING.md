# Contributing to Threadcap

Read [README.md](README.md), [current capabilities](docs/capabilities.md), and [AGENTS.md](AGENTS.md). For interface work, also read [design.md](design.md). Open an issue to discuss changes that alter provider contracts or user workflows.

## Development

On Windows x64, install Git, Node.js 24, MSVC Rust, Visual Studio C++ Build Tools with a Windows SDK, and WebView2. The verified development toolchain is Rust 1.100.0. See [Tauri's prerequisites](https://v2.tauri.app/start/prerequisites/).

```powershell
npm.cmd ci
npm.cmd run desktop
```

Close the installed app before development mode, which uses the normal data/port by default. Never run the legacy Python bridge against the same live database alongside the native host.

```powershell
npm.cmd run check:publication
npm.cmd test
npm.cmd run test:codex
npm.cmd run test:native
npm.cmd run desktop:build
npm.cmd run release:stage
```

`test:native` compiles unit tests and the helper; it does not verify every real desktop interaction. Interactive CLI tests must be appropriate, use owned isolated fixtures, and must not submit model work merely to validate documentation. See [publishing](docs/publishing.md) for clean-source checks.

`test:codex` runs process/configuration fixtures one at a time to avoid unrelated cold PowerShell startup and disk contention on small Windows runners. Its concurrency fixture still launches twelve competing cache writers; serialization does not remove that assertion. The shell fixture allows 30 seconds for process startup, separately from the production adapter's unchanged bounded network timeouts.

For UI changes, record representative compact/hover/expanded/Settings states and relevant motion. Check keyboard access, focus/drafts, reduced motion, outside-click behavior, and interrupted transitions. Report the display scales, monitor configurations, and terminal hosts actually exercised.

## Pull requests

- Explain the user-visible problem and resulting behavior.
- Keep unrelated refactoring out of the change.
- Preserve user data, other hooks/plugins, disabled preferences, and CLI history.
- Separate task lifecycle, terminal availability, observer connectivity, and presentation state.
- Document supported CLI versions and capabilities honestly. Registration and synthetic delivery do not establish a real agent integration.
- Include meaningful tests for behavioral changes and update the relevant guide/changelog.
- Use synthetic examples and sanitize screenshots/logs. Never commit credentials, account payloads, user databases, or local verification artifacts.

No CLA or DCO process is configured. Contributions use the repository's [MIT license](LICENSE); preserve applicable third-party notices. Use the [security policy](SECURITY.md) for vulnerabilities rather than public issues containing exploit details.
