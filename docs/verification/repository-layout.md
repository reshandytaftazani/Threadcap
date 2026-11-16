# Repository organization verification

This change reorganizes source and documentation; the public product remains Threadcap. See [the layout guide](../development/repository-layout.md) for current paths and development command names.

## Scope

- Move user guides, architecture, provider setup, design provenance, development guidance, release evidence, and historical plans into their own documentation folders.
- Separate JavaScript unit/browser tests, opt-in native checks, and Python compatibility tests. Rust integration tests remain directly under each crate's `tests/` directory.
- Move active OpenCode observers and the optional Antigravity wrapper into `integrations/`. Move historical Python/Edge code into `legacy/`.
- Group build, release, asset, and recording utilities by purpose. Group standalone artwork previews under `src/preview/`.
- Update imports, embedded-source paths, script roots, links, asset references, and command names alongside the moves.

Installed executable names, storage locations, provider hook/plugin paths, trust definitions, application identity, and NSIS upgrade keys are retained. This source reorganization does not update an existing user's installation or run a provider task.

## Local checks

- Final publication validation passed for 169 source files, including local Markdown links, relative module imports, Rust embedded files, HTML resources, and npm/Tauri command entry points. The additional folder guides and this completed report are documentation-only follow-ups to the validated build.
- JavaScript/model tests: 19 passed. Core Rust tests: 26 passed. Observer tests: 32 passed. Native unit tests: 10 passed. Python compatibility tests: 15 passed.
- PowerShell scripts parsed successfully. Production UI behavior modules and official source artwork retain their behavior/content; the avatar source comment now points to the new provenance location.
- A shell fixture initially hit a nonblocking accepted-socket read. Its receiver now explicitly returns to blocking mode before applying the existing two-second read timeout. This adjusts the fixture, not production transport deadlines.

## GitHub verification

The private [Windows workflow run 43973768471](https://github.com/reshandytaftazani/Threadcap/actions/runs/43973768471) passed on commit `44aa5fb690f3b1c500745337b53e9eac517d4562`: publication checks, unit/observer/native tests, production installer build, staging, and artifact upload all succeeded.

The downloaded artifact's 11 manifest entries matched their SHA256 values. All four local links in its staged Markdown guides resolved to included files; other source references point to the corresponding GitHub revision. The downloaded helper reported version 0.8.4. The CI installer was not installed over the user's running application.

Compilation and unit checks do not establish native focus, DPI, click-through, or complete live-provider acceptance; those remain covered only to the extent documented in [current capabilities](../guides/capabilities.md).
